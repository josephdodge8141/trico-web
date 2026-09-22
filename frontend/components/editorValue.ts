import type { EditableValue, EditorField } from '@app/schemas';

export type EditableRecord = Readonly<Record<string, EditableValue>>;

export function isEditableRecord(value: EditableValue): value is EditableRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readEditorValue(value: EditableValue, path: readonly string[]): EditableValue {
  let current = value;
  for (const segment of path) {
    if (!isEditableRecord(current)) return null;
    current = current[segment] ?? null;
  }
  return current;
}

export function writeEditorValue(
  value: EditableValue,
  path: readonly string[],
  replacement: EditableValue,
): EditableValue {
  const [segment, ...remaining] = path;
  if (segment === undefined) return replacement;
  const record = isEditableRecord(value) ? value : {};
  return {
    ...record,
    [segment]: writeEditorValue(record[segment] ?? null, remaining, replacement),
  };
}

export function fieldKey(path: readonly string[]): string {
  return path.join('.');
}

export function fieldForIssue(
  fields: readonly EditorField[],
  issuePath: readonly PropertyKey[],
): EditorField | undefined {
  const normalizedPath = issuePath.map(String);
  return fields.find((field) =>
    field.path.every((segment, index) => normalizedPath[index] === segment),
  );
}

export function editorValuesEqual(left: EditableValue, right: EditableValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
