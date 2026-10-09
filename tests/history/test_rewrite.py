import subprocess
import tempfile
import unittest
from unittest.mock import patch
import rewrite
from pathlib import Path

from rewrite import Refused, analyze_and_rewrite, apply, git, refs

ID = '550e8400-e29b-41d4-a716-446655440000'
OTHER = '650e8400-e29b-41d4-a716-446655440000'
FILE = 'content/posts/한글 "인용" 글.md'
OLD = 'content/posts/예전 이름.md'
BODY = 'A long unchanged paragraph.\n' * 20


class RewriteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.work = self.root / 'work'
        self.work.mkdir()
        git(self.work, 'init', '-b', 'main')
        git(self.work, 'config', 'user.name', 'Test')
        git(self.work, 'config', 'user.email', 'test@example.invalid')
        self.write(OLD, '---\ntitle: Original\n---\n' + BODY)
        self.write('content/posts/keep.md', f'---\nid: {OTHER}\ntitle: Keep\n---\nOther body')
        self.write('static/uploads/shared.png', 'keep asset')
        self.commit('Initial content')
        git(self.work, 'mv', OLD, FILE)
        self.commit('Rename before immutable IDs')
        self.write(FILE, f'---\nid: {ID}\ntitle: Secret\n---\n' + BODY)
        self.write('content/translations/en/posts/' + Path(FILE).name, f'---\nid: {ID}\n---\nTranslation')
        self.commit('Add IDs')
        git(self.work, 'tag', '-a', 'v1', '-m', 'Release')
        git(self.work, 'branch', 'drafts')
        self.write('README.md', 'Unrelated later change')
        self.commit('Later change')
        self.remote = self.root / 'remote.git'
        subprocess.run(['git', 'clone', '--bare', str(self.work), str(self.remote)], check=True, capture_output=True)

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, path, value):
        target = self.work / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(value)

    def commit(self, message):
        git(self.work, 'add', '.')
        git(self.work, 'commit', '-m', message)

    def clone(self, name='rewrite.git'):
        target = self.root / name
        subprocess.run(['git', 'clone', '--bare', '--no-local', str(self.remote), str(target)], check=True, capture_output=True)
        return target

    def test_all_branches_tags_renames_translations_and_unrelated_content(self):
        target = self.clone()
        original = refs(target)
        preview = analyze_and_rewrite(target, ID, FILE, 'main')
        self.assertEqual(set(preview['paths']), {OLD, FILE, 'content/translations/en/posts/' + Path(FILE).name})
        self.assertEqual({row['ref'] for row in preview['refs']}, set(original))
        self.assertGreater(preview['commits'], 0)
        self.assertEqual(git(target, 'show', 'main:content/posts/keep.md'), git(self.work, 'show', 'main:content/posts/keep.md'))
        self.assertEqual(git(target, 'show', 'main:static/uploads/shared.png'), b'keep asset')
        self.assertEqual(git(target, 'show', 'main:README.md'), b'Unrelated later change')
        # Re-running from the same immutable refs produces exactly the approved plan.
        self.assertEqual(preview, analyze_and_rewrite(self.clone('second.git'), ID, FILE, 'main'))
        apply(target, preview)
        for commit in git(self.remote, 'rev-list', '--all').decode().splitlines():
            paths = git(self.remote, 'ls-tree', '-r', '--name-only', '-z', commit).decode().split('\0')
            self.assertFalse(set(preview['paths']).intersection(paths))
        self.assertEqual(set(refs(self.remote)), set(original))

    def test_already_deleted_source_can_be_purged(self):
        git(self.work, 'rm', FILE)
        self.commit('Normal delete')
        git(self.work, 'push', str(self.remote), 'main')
        preview = analyze_and_rewrite(self.clone(), ID, FILE, 'main')
        self.assertIn(FILE, preview['paths'])

    def test_reused_path_by_another_identity_is_rejected(self):
        self.write(FILE, f'---\nid: {OTHER}\n---\nDifferent article')
        self.commit('Reuse path')
        git(self.work, 'push', str(self.remote), 'main')
        with self.assertRaisesRegex(Refused, 'path-reused-by-another-post'):
            analyze_and_rewrite(self.clone(), ID, FILE, 'main')

    def test_concurrent_commit_is_not_overwritten(self):
        target = self.clone()
        preview = analyze_and_rewrite(target, ID, FILE, 'main')
        self.write('concurrent.txt', 'Must survive')
        self.commit('Concurrent edit')
        git(self.work, 'push', str(self.remote), 'main')
        before = refs(self.remote)
        with self.assertRaisesRegex(Refused, 'repository-changed'):
            apply(target, preview)
        self.assertEqual(refs(self.remote), before)

    def test_added_ref_is_not_silently_skipped(self):
        target = self.clone()
        preview = analyze_and_rewrite(target, ID, FILE, 'main')
        git(self.remote, 'branch', 'new-branch', 'main')
        before = refs(self.remote)
        with self.assertRaisesRegex(Refused, 'repository-changed'):
            apply(target, preview)
        self.assertEqual(refs(self.remote), before)

    def test_ref_rejection_is_atomic(self):
        target = self.clone()
        preview = analyze_and_rewrite(target, ID, FILE, 'main')
        before = refs(self.remote)
        # receive.denyNonFastForwards simulates a protected branch rejecting rewrites.
        git(self.remote, 'config', 'receive.denyNonFastForwards', 'true')
        with self.assertRaisesRegex(Refused, 'push-rejected'):
            apply(target, preview)
        self.assertEqual(refs(self.remote), before)

    def test_rename_outside_content_requires_manual_review(self):
        git(self.work, 'mv', FILE, 'other.md')
        self.commit('Move outside posts')
        git(self.work, 'push', str(self.remote), 'main')
        with self.assertRaisesRegex(Refused, 'rename-outside-posts'):
            analyze_and_rewrite(self.clone(), ID, FILE, 'main')

    def test_lease_rejects_a_push_that_races_after_the_preflight(self):
        target = self.clone()
        preview = analyze_and_rewrite(target, ID, FILE, 'main')
        read_refs = rewrite.remote_refs
        first = True
        def race(repo):
            nonlocal first
            snapshot = read_refs(repo)
            if first:
                first = False
                self.write('concurrent.txt', 'Do not overwrite this commit')
                self.commit('Push between preflight and atomic update')
                git(self.work, 'push', str(self.remote), 'main')
            return snapshot
        with patch('rewrite.remote_refs', side_effect=race):
            with self.assertRaisesRegex(Refused, 'push-rejected'):
                apply(target, preview)
        self.assertEqual(git(self.remote, 'show', 'main:concurrent.txt'), b'Do not overwrite this commit')
        self.assertEqual(refs(self.remote)['refs/tags/v1'], next(row['before'] for row in preview['refs'] if row['ref'] == 'refs/tags/v1'))

    def test_merge_topology_and_unrelated_changes_survive(self):
        git(self.work, 'checkout', 'drafts')
        self.write('draft.txt', 'draft change')
        self.commit('Draft change')
        git(self.work, 'checkout', 'main')
        git(self.work, 'merge', '--no-ff', 'drafts', '-m', 'Merge draft')
        git(self.work, 'push', str(self.remote), '--all')
        target = self.clone()
        preview = analyze_and_rewrite(target, ID, FILE, 'main')
        self.assertGreater(len(git(target, 'rev-list', '--merges', '--all').splitlines()), 0)
        self.assertEqual(git(target, 'show', 'main:draft.txt'), b'draft change')
        self.assertEqual(git(target, 'show', 'main:README.md'), b'Unrelated later change')
        apply(target, preview)

    def test_missing_identity_does_not_rewrite(self):
        target = self.clone()
        before = refs(target)
        with self.assertRaisesRegex(Refused, 'post-identity-not-found'):
            analyze_and_rewrite(target, OTHER, FILE, 'main')
        self.assertEqual(refs(target), before)


if __name__ == '__main__':
    unittest.main()
