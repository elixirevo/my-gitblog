"""Bounded, path-exact Git rewrite. Never runs code from the target repository."""
import json
import os
import re
import subprocess
from pathlib import Path

import yaml

SHA = re.compile(r"^[0-9a-f]{40}$")
POST_PATH = re.compile(r"^content/(?:posts/[^/]+|translations/[^/]+/posts/[^/]+)\.md$")
MAX_REFS, MAX_COMMITS, MAX_BLOBS, MAX_ENTRIES = 100, 5000, 20000, 500000


class Refused(Exception):
    pass


def git(repo, *args, input=None, check=True):
    result = subprocess.run(["git", "-c", "core.hooksPath=/dev/null", "-C", str(repo), *args],
                            input=input, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            timeout=180, env={**os.environ, "GIT_TERMINAL_PROMPT": "0"})
    if check and result.returncode:
        # Git output can contain credentials, article paths or URLs. Do not log it.
        raise Refused("git-operation-failed")
    return result.stdout if check else result


def refs(repo):
    rows = git(repo, "for-each-ref", "--format=%(objectname) %(refname)", "refs/heads", "refs/tags").decode().splitlines()
    result = dict(line.split(" ", 1)[::-1] for line in rows)
    if not result or len(result) > MAX_REFS or any(not SHA.fullmatch(sha) for sha in result.values()):
        raise Refused("repository-too-large")
    return result


def remote_refs(repo):
    lines = git(repo, "ls-remote", "--refs", "origin", "refs/heads/*", "refs/tags/*").decode().splitlines()
    return dict(line.split("\t", 1)[::-1] for line in lines)


def identity(body):
    if not body.startswith(b"---\n") and not body.startswith(b"---\r\n"):
        return None
    try:
        text = body.decode("utf-8")
        front = re.split(r"^---\s*$", text, maxsplit=2, flags=re.MULTILINE)
        if len(front) < 3 or len(front[1]) > 65536:
            raise Refused("invalid-frontmatter")
        value = yaml.safe_load(front[1])
        if value is not None and not isinstance(value, dict):
            raise Refused("invalid-frontmatter")
        return str(value["id"]) if value and value.get("id") is not None else None
    except (UnicodeError, yaml.YAMLError, RecursionError):
        raise Refused("invalid-frontmatter") from None


def analyze_and_rewrite(repo, raw_id, source_path, branch):
    original = refs(repo)
    if f"refs/heads/{branch}" not in original:
        raise Refused("repository-changed")
    # Annotated tags to trees/blobs cannot be safely rewritten by this flow.
    for ref in original:
        if git(repo, "rev-parse", "--verify", f"{ref}^{{commit}}", check=False).returncode:
            raise Refused("unsupported-tag")
    commits = git(repo, "rev-list", "--all").decode().splitlines()
    if len(commits) > MAX_COMMITS:
        raise Refused("repository-too-large")
    versions, bodies, total = {}, {}, 0
    for commit in commits:
        for entry in git(repo, "ls-tree", "-r", "-z", commit).split(b"\0"):
            if not entry:
                continue
            total += 1
            if total > MAX_ENTRIES:
                raise Refused("repository-too-large")
            meta, raw_path = entry.split(b"\t", 1)
            try:
                path = raw_path.decode("utf-8")
            except UnicodeError:
                raise Refused("unsupported-filename") from None
            if not POST_PATH.fullmatch(path):
                continue
            mode, kind, sha = meta.decode().split()
            if kind != "blob" or mode not in ("100644", "100755"):
                raise Refused("unsupported-file")
            versions.setdefault(path, set()).add(sha)
            if sha not in bodies:
                if len(bodies) >= MAX_BLOBS or int(git(repo, "cat-file", "-s", sha)) > 500000:
                    raise Refused("repository-too-large")
                bodies[sha] = identity(git(repo, "cat-file", "blob", sha))
    paths = {path for path, shas in versions.items() if any(bodies[sha] == raw_id for sha in shas)}
    if source_path not in paths:
        raise Refused("post-identity-not-found")
    # Include pre-ID renames. NUL-delimited Git output supports Korean, spaces and quotes.
    renames = []
    data = git(repo, "log", "--all", "--full-history", "-m", "--format=", "--name-status", "-z", "--find-renames").split(b"\0")
    i = 0
    while i < len(data):
        status = data[i].lstrip(b"\n"); i += 1
        if not status:
            continue
        if status[:1] in (b"R", b"C"):
            renames.append((data[i].decode(), data[i + 1].decode())); i += 2
        else:
            i += 1
    changed = True
    while changed:
        changed = False
        for before, after in renames:
            if before in paths or after in paths:
                for path in (before, after):
                    if path not in paths:
                        if not POST_PATH.fullmatch(path):
                            raise Refused("rename-outside-posts")
                        paths.add(path); changed = True
        # Translations created before immutable IDs still belong to the same historical filename.
        names = {Path(path).name for path in paths}
        for path in versions:
            if Path(path).name in names and path not in paths:
                paths.add(path); changed = True
    if len(paths) > 500:
        raise Refused("repository-too-large")
    for path in paths:
        if any(bodies[sha] not in (None, raw_id) for sha in versions.get(path, [])):
            raise Refused("path-reused-by-another-post")
        if any(ord(char) < 32 or ord(char) == 127 for char in path):
            raise Refused("unsupported-filename")
    arguments = ["filter-repo", "--force", "--invert-paths", "--prune-empty", "never", "--prune-degenerate", "never"]
    for path in sorted(paths):
        arguments.extend(["--path", path])
    # Explicit refs prevents mirror pushing PR refs or deleting branches/tags.
    git(repo, *arguments, "--refs", *sorted(original))
    updated = refs(repo)
    if updated.keys() != original.keys():
        raise Refused("unexpected-ref-removal")
    mapping = Path(repo, "filter-repo", "commit-map").read_text().splitlines()[1:]
    changed_commits = sum(old != new for old, new in (line.split() for line in mapping))
    changes = [{"ref": ref, "before": original[ref], "after": updated[ref]} for ref in sorted(original)]
    if not any(row["before"] != row["after"] for row in changes):
        raise Refused("nothing-to-remove")
    # Independent postcondition: selected paths cannot remain reachable from any branch/tag.
    for commit in git(repo, "rev-list", "--all").decode().splitlines():
        present = git(repo, "ls-tree", "-r", "--name-only", "-z", commit).split(b"\0")
        if any(path.encode() in present for path in paths):
            raise Refused("rewrite-verification-failed")
    return {"version": 1, "paths": sorted(paths), "refs": changes, "commits": changed_commits}


def apply(repo, manifest):
    expected = {row["ref"]: row["before"] for row in manifest["refs"]}
    if remote_refs(repo) != expected:
        raise Refused("repository-changed")
    changes = [row for row in manifest["refs"] if row["before"] != row["after"]]
    leases = [f"--force-with-lease={row['ref']}:{row['before']}" for row in changes]
    refspecs = [f"{row['after']}:{row['ref']}" for row in changes]
    # Atomic + explicit leases: no partial updates and no overwriting a concurrent push.
    result = git(repo, "push", "--atomic", "--porcelain", *leases, "origin", *refspecs, check=False)
    actual = remote_refs(repo)
    after = {row["ref"]: row["after"] for row in manifest["refs"]}
    if actual == after:
        return
    statuses = [line.split(b"\t", 1)[0] for line in result.stdout.splitlines() if b"\t" in line]
    if result.returncode and (actual == expected or len(statuses) == len(changes) and all(flag == b"!" for flag in statuses)):
        raise Refused("push-rejected")
    # A network response may have been lost or a new ref created concurrently. Keep receipt
    # pending for verification; never retry a force push against a newly observed head.
    raise Refused("verification-required")


def same_manifest(left, right):
    return json.dumps(left, sort_keys=True) == json.dumps(right, sort_keys=True)
