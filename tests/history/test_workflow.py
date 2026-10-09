from pathlib import Path
import re
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = 'gitblogapp/svelte-gitblog-template'


class WorkflowTests(unittest.TestCase):
    def test_caller_and_worker_use_only_pinned_public_code(self):
        caller = yaml.load((ROOT / '.github/workflows/post-history.yml').read_text(), Loader=yaml.BaseLoader)
        worker = yaml.load((ROOT / '.github/workflows/post-history-worker.yml').read_text(), Loader=yaml.BaseLoader)
        self.assertRegex(caller['jobs']['history']['uses'], '^' + re.escape(PUBLIC) + r'/\.github/workflows/post-history-worker\.yml@[a-f0-9]{40}$')
        self.assertNotIn('secrets', worker['on']['workflow_call'])
        self.assertEqual(worker['permissions'], {'contents': 'read', 'id-token': 'write'})
        checkout = worker['jobs']['history']['steps'][0]['with']
        self.assertEqual(checkout['repository'], PUBLIC)
        self.assertRegex(checkout['ref'], r'^[a-f0-9]{40}$')
        self.assertEqual(checkout['persist-credentials'], 'false')
        self.assertEqual(checkout['sparse-checkout'], 'scripts/history')
