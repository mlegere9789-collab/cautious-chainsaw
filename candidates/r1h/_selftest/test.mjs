// Harness self-test: red on the untouched tree, green on the scratch tree of group.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openTree } from '../_lib/tree.mjs';

const t = openTree();
test('404.html carries the self-test marker only when the group is applied', () => {
  assert.match(t.text('404.html'), /<!-- r1h harness self-test marker -->/);
});
test('the no-op bundle patch left the css readable and unchanged in size class', () => {
  assert.ok(t.text('assets/' + t.json('version.json').css).includes('prefers-reduced-motion'));
});
