import assert from 'node:assert/strict';
import test from 'node:test';

import type { EditorField } from '@app/schemas';

import {
  editorValuesEqual,
  fieldForIssue,
  readEditorValue,
  writeEditorValue,
} from '../components/editorValue.js';

const headingField: EditorField = {
  path: ['copy', 'heading'],
  label: 'Main heading',
  required: true,
  order: 0,
  validationMessages: {
    required: 'Enter the main heading.',
    invalid: 'Check the main heading and try again.',
  },
  control: { type: 'short-text', maxLength: 160 },
};

test('semantic editor paths update one friendly field without exposing or replacing siblings', () => {
  const before = { copy: { heading: 'Before', description: 'Keep me' } };
  const after = writeEditorValue(before, headingField.path, 'After');

  assert.equal(readEditorValue(after, headingField.path), 'After');
  assert.equal(readEditorValue(after, ['copy', 'description']), 'Keep me');
  assert.equal(readEditorValue(before, headingField.path), 'Before');
  assert.equal(editorValuesEqual(before, after), false);
});

test('schema issues map to the declared human field instead of leaking an object path', () => {
  assert.equal(fieldForIssue([headingField], ['copy', 'heading'])?.label, 'Main heading');
  assert.equal(fieldForIssue([headingField], ['other']), undefined);
});
