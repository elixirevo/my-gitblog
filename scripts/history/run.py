"""Trusted GitBlog Actions runner. Credentials only live in memory and Git's process env."""
import base64
import json
import os
import re
import subprocess
import tempfile
import time
import urllib.parse
import urllib.request

from rewrite import Refused, analyze_and_rewrite, apply, same_manifest

ORIGIN = "https://gitblog.app"
AUDIENCE = ORIGIN + "/history"


def request(url, data=None, token=None, method=None):
    headers = {"Accept": "application/json", "Content-Type": "application/json", "User-Agent": "gitblog-history"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=headers, method=method)
    # No redirected request may carry authorization.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *args, **kwargs):
            return None
    with urllib.request.build_opener(NoRedirect).open(req, timeout=45) as response:
        value = response.read(300001)
        if len(value) > 300000:
            raise Refused("response-too-large")
        return json.loads(value) if value else {}


def oidc():
    url = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    if not url.startswith("https://"):
        raise Refused("invalid-oidc-url")
    value = request(url + "&audience=" + urllib.parse.quote(AUDIENCE, safe=""), token=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"])["value"]
    print("::add-mask::" + value, flush=True)
    return value


def main():
    operation, phase = os.environ.get("HISTORY_OPERATION", ""), os.environ.get("HISTORY_PHASE", "")
    if not re.fullmatch(r"[0-9a-f-]{36}", operation) or phase not in ("analyze", "apply"):
        raise Refused("invalid-input")
    url = ORIGIN + "/api/internal/history/" + operation
    def call(action, **extra):
        return request(url, {"action": action, "phase": phase, **extra}, oidc())
    token = None
    claimed = False
    try:
        context = call("claim")
        claimed = True
        token = context["token"]
        print("::add-mask::" + token, flush=True)
        repository = context["repository"]
        if not re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", repository):
            raise Refused("invalid-repository")
        auth = base64.b64encode(("x-access-token:" + token).encode()).decode()
        print("::add-mask::" + auth, flush=True)
        # Never persist the installation token in .git/config, URLs, inputs or artifacts.
        os.environ.update({"GIT_CONFIG_COUNT": "2", "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
                           "GIT_CONFIG_VALUE_0": "AUTHORIZATION: basic " + auth,
                           "GIT_CONFIG_KEY_1": "http.followRedirects", "GIT_CONFIG_VALUE_1": "false",
                           "GIT_TERMINAL_PROMPT": "0"})
        with tempfile.TemporaryDirectory() as directory:
            repo = directory + "/target.git"
            clone = subprocess.run(["git", "clone", "--bare", "--no-local", "https://github.com/" + repository + ".git", repo],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
            if clone.returncode:
                raise Refused("clone-failed")
            preview = analyze_and_rewrite(repo, context["rawId"], context["sourcePath"], context["branch"])
            if phase == "analyze":
                call("preview", manifest=preview)
                print("History analysis is ready in GitBlog.")
            else:
                if not same_manifest(preview, context["manifest"]):
                    raise Refused("repository-changed")
                # Acknowledgement is required BEFORE the atomic push. A lost response
                # leaves a verifiable receipt; it never causes an unrecorded rewrite.
                call("prepare", manifest=preview)
                apply(repo, preview)
                for attempt in range(3):
                    try:
                        if call("finish").get("ok"):
                            print("Git history removed and reader data redacted.")
                            return
                    except Exception:
                        pass
                    time.sleep(2 ** attempt)
                raise Refused("verification-required")
    except Exception as cause:
        if claimed:
            try:
                call("failed", failure=str(cause) if isinstance(cause, Refused) else "runner-failed")
            except Exception:
                pass
        print("History task stopped. Check its status in GitBlog.")
        raise SystemExit(1) from None
    finally:
        if token:
            # Explicitly revoke the short-lived token even on analysis/push failure.
            try:
                request("https://api.github.com/installation/token", token=token, method="DELETE")
            except Exception:
                pass


if __name__ == "__main__":
    main()
