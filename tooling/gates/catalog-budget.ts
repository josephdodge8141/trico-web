import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseline = process.argv[2];
if (baseline === undefined || !/^[a-f0-9]{40}$/.test(baseline)) {
  throw new Error('Supply the full starting commit SHA.');
}
const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8' });
const result = { baseline, new: 0, changed: 0, deleted: 0, additions: 0, deletions: 0 };
let added = 0;
let removed = 0;
let hunk = false;
const finish = (): void => {
  result.new += Math.max(0, added - removed);
  result.changed += removed;
  result.deleted += Math.max(0, removed - added);
  result.additions += added;
  result.deletions += removed;
  added = removed = 0;
};
for (const line of git(
  'diff',
  '--no-ext-diff',
  '--no-color',
  '--no-renames',
  '--unified=0',
  baseline,
  '--',
).split('\n')) {
  if (line.startsWith('Binary files'))
    throw new Error('Report binary changes separately before approval.');
  if (line.startsWith('diff --git') || line.startsWith('@@')) {
    finish();
    hunk = line.startsWith('@@');
  } else if (hunk && line.startsWith('+')) added += 1;
  else if (hunk && line.startsWith('-')) removed += 1;
}
finish();
for (const file of git('ls-files', '--others', '--exclude-standard', '-z')
  .split('\0')
  .filter(Boolean)) {
  const text = readFileSync(file, 'utf8');
  if (text.includes('\0')) throw new Error(`Report binary addition separately: ${file}`);
  added = text === '' ? 0 : text.split('\n').length - Number(text.endsWith('\n'));
  finish();
}
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
if (result.new > 1000 || result.changed > 3000) process.exitCode = 1;
