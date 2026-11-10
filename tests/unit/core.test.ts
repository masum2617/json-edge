import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeJson } from '../../src/core/analyze';
import { generateCases } from '../../src/core/generate';
import { GenerationSession } from '../../src/core/session';
import { parseClientMessage } from '../../src/protocol';
import { exportEntries, writeEntries } from '../../src/core/export';
import { LIMITS, MUTATIONS, type JsonObject } from '../../src/core/types';

const sample =
  '{"name":"Alex","age":25,"active":true,"address":{"city":"Dhaka"},"tags":[{"id":1}],"other":null}';

test('discovers nested objects, but arrays are atomic', () => {
  const { fields } = analyzeJson(sample);
  assert.deepEqual(
    fields.map((field) => field.pointer),
    [
      '/name',
      '/age',
      '/active',
      '/address',
      '/address/city',
      '/tags',
      '/other',
    ],
  );
});

test('strict syntax and root validation includes line locations', () => {
  for (const text of [
    '{"a":1,}',
    '{/*comment*/"a":1}',
    '{"a":}',
    '{"a":1}garbage',
  ])
    assert.throws(() => analyzeJson(text), /line \d+, column \d+/);
  for (const text of ['[]', 'null', '12', '"text"'])
    assert.throws(() => analyzeJson(text), /root must be a JSON object/);
  assert.throws(() => analyzeJson(''), /Paste a JSON/);
  assert.deepEqual(analyzeJson('{}').fields, []);
  assert.equal(analyzeJson('{\r\n "a": 1\r\n}').value.a, 1);
});

test('duplicate decoded keys are rejected, including nested inside arrays', () => {
  for (const text of [
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"x":[{"a":1,"a":2}]}',
  ])
    assert.throws(() => analyzeJson(text), /Duplicate property/);
  assert.doesNotThrow(() => analyzeJson('{"a":{"x":1},"b":{"x":2}}'));
});

test('guards input size, nesting before recursive parse, and unsafe numbers', () => {
  assert.throws(
    () => analyzeJson('{"a":"' + 'é'.repeat(LIMITS.bytes) + '"}'),
    /1 MiB/,
  );
  assert.throws(
    () => analyzeJson('{"a":'.repeat(10000) + '{}'),
    /Nesting exceeds/,
  );
  assert.throws(() => analyzeJson('{"a":1e400}'), /represented safely/);
  assert.throws(
    () => analyzeJson('{"a":9007199254740993}'),
    /represented safely/,
  );
  let value: JsonObject = {};
  for (let i = 0; i < 32; i++) value = { a: value };
  assert.doesNotThrow(() => analyzeJson(JSON.stringify(value)));
  assert.throws(
    () => analyzeJson(JSON.stringify({ a: value })),
    /Nesting exceeds/,
  );
});

test('all mutations are deterministic and independent of baseline', () => {
  const before = analyzeJson(sample).value;
  const result = generateCases(sample, ['/name'], [...MUTATIONS]);
  assert.deepEqual(
    result.cases.map((item) => JSON.parse(item.json).name),
    [undefined, null, '', 123],
  );
  for (const item of result.cases) {
    const value = JSON.parse(item.json);
    assert.deepEqual(value.address, before.address);
    assert.deepEqual(value.tags, before.tags);
    assert.equal(value.age, 25);
  }
  assert.deepEqual(analyzeJson(sample).value, before);
  assert.deepEqual(generateCases(sample, ['/name'], [...MUTATIONS]), result);
});

test('nested deletion removes only the selected property', () => {
  const result = generateCases(
    '{"a":{"x":1,"y":2},"b":3}',
    ['/a/x'],
    ['missing'],
  );
  assert.deepEqual(JSON.parse(result.cases[0]!.json), { a: { y: 2 }, b: 3 });
});

test('wrong types and empty values cover every JSON kind', () => {
  const wrong = generateCases(
    sample,
    analyzeJson(sample).fields.map((field) => field.pointer),
    ['wrongType'],
  );
  assert.deepEqual(
    JSON.parse(wrong.cases.find((item) => item.pointer === '/tags')!.json).tags,
    {},
  );
  assert.deepEqual(
    JSON.parse(wrong.cases.find((item) => item.pointer === '/address')!.json)
      .address,
    [],
  );
  assert.equal(
    JSON.parse(wrong.cases.find((item) => item.pointer === '/active')!.json)
      .active,
    'not-a-boolean',
  );
  assert.equal(
    JSON.parse(wrong.cases.find((item) => item.pointer === '/other')!.json)
      .other,
    'example',
  );
  const empty = generateCases(
    sample,
    ['/tags', '/address', '/age', '/active'],
    ['empty'],
  );
  assert.equal(empty.cases.length, 2);
  assert.equal(empty.skipped, 2);
});

test('skips no-ops and rejects missing/unknown/duplicate selections', () => {
  const result = generateCases(
    '{"a":null,"b":"","c":[],"d":{}}',
    ['/a', '/b', '/c', '/d'],
    ['null', 'empty'],
  );
  assert.equal(result.cases.length, 3);
  assert.equal(result.skipped, 5);
  assert.throws(() => generateCases(sample, [], ['null']), /Select at least/);
  assert.throws(
    () => generateCases(sample, ['/unknown'], ['null']),
    /no longer exists/,
  );
  assert.throws(
    () => generateCases(sample, ['/name', '/name'], ['null']),
    /Duplicate/,
  );
});

test('special keys use JSON Pointer and never mutate Object.prototype', () => {
  const text =
    '{"a.b":1,"a/b":{"~":2},"":3,"__proto__":{"polluted":false},"constructor":4}';
  const analysis = analyzeJson(text);
  assert.ok(analysis.fields.some((field) => field.pointer === '/a~1b/~0'));
  for (const field of analysis.fields) {
    for (const item of generateCases(text, [field.pointer], [...MUTATIONS])
      .cases)
      assert.doesNotThrow(() => JSON.parse(item.json));
  }
  const mutated = JSON.parse(
    generateCases(text, ['/__proto__'], ['null']).cases[0]!.json,
  );
  assert.equal(
    Object.getOwnPropertyDescriptor(mutated, '__proto__')?.value,
    null,
  );
  assert.equal(
    Object.getOwnPropertyDescriptor(Object.prototype, 'polluted'),
    undefined,
  );
});

test('case limit fails rather than silently truncating', () => {
  const text = JSON.stringify(
    Object.fromEntries(Array.from({ length: 84 }, (_, i) => [`f${i}`, i])),
  );
  assert.throws(
    () =>
      generateCases(
        text,
        analyzeJson(text).fields.map((f) => f.pointer),
        [...MUTATIONS],
      ),
    /More than 250/,
  );
});

test('result revision invalidates on input OR option changes and on failed regeneration', () => {
  const session = new GenerationSession();
  session.generate(1, sample, ['/name'], ['null']);
  assert.equal(session.selected(1, ['1']).length, 1);
  session.invalidate(2);
  assert.throws(() => session.selected(1, ['1']), /outdated/);
  session.generate(2, sample, ['/age'], ['missing']);
  assert.throws(() => session.selected(2, ['bogus']), /Unknown/);
  assert.throws(() => session.selected(2, ['1', '1']), /distinct/);
  assert.throws(() => session.generate(3, '{', ['/age'], ['missing']));
  assert.throws(() => session.selected(3, ['1']), /outdated/);
});

test('rejects malformed messages at the webview boundary', () => {
  for (const value of [
    null,
    {},
    { type: 'copy', revision: -1, ids: [] },
    {
      type: 'generate',
      revision: 1,
      text: '{}',
      fields: [],
      mutations: ['execute'],
    },
    { type: 'copy', revision: 1, ids: ['1', 2] },
  ])
    assert.throws(() => parseClientMessage(value));
  assert.deepEqual(
    parseClientMessage({ type: 'analyze', revision: 1, text: '{}' }),
    { type: 'analyze', revision: 1, text: '{}' },
  );
});

test('export names cannot escape folder and index explains each candidate', () => {
  const cases = generateCases(
    '{"../../bad":1}',
    ['/..~1..~1bad'],
    ['missing', 'null'],
  ).cases;
  const entries = exportEntries(cases);
  assert.deepEqual(
    entries.map((entry) => entry.filename),
    ['001-missing.json', '002-null.json', 'index.json'],
  );
  assert.equal(
    JSON.parse(entries.at(-1)!.contents).cases[0].path,
    '/..~1..~1bad',
  );
  for (const entry of entries)
    assert.doesNotThrow(() => JSON.parse(entry.contents));
});

test('export reports exactly the completed writes on partial failure', async () => {
  const entries = exportEntries(
    generateCases(sample, ['/name'], ['null', 'missing']).cases,
  );
  const report = await writeEntries(entries, async (entry) => {
    if (entry.filename === entries[1]!.filename) throw new Error('Disk full');
  });
  assert.deepEqual(report.written, [entries[0]!.filename]);
  assert.equal(report.failed, entries[1]!.filename);
  assert.equal(report.error, 'Disk full');
});

test('many no-op fields finish without cloning the baseline per field', () => {
  const text = JSON.stringify(
    Object.fromEntries(
      Array.from({ length: 10000 }, (_, i) => [`f${i}`, null]),
    ),
  );
  const pointers = analyzeJson(text).fields.map((field) => field.pointer);
  const started = performance.now();
  const result = generateCases(text, pointers, ['null', 'empty']);
  assert.equal(result.cases.length, 0);
  assert.equal(result.skipped, 20000);
  // Wide margin across CI machines; the regression previously took >14 seconds.
  assert.ok(
    performance.now() - started < 5000,
    'No-op generation must avoid full-baseline cloning',
  );
});

test('total generated-byte limit rejects amplification', () => {
  const value = Object.fromEntries(
    Array.from({ length: 20 }, (_, i) => [`f${i}`, 'x'.repeat(30000)]),
  );
  const text = JSON.stringify(value);
  assert.throws(
    () =>
      generateCases(
        text,
        analyzeJson(text).fields.map((field) => field.pointer),
        ['missing', 'null'],
      ),
    /16 MiB/,
  );
});

test('bounds repeated long parent paths before field metadata can amplify input', () => {
  const value = {
    ['k'.repeat(500000)]: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`f${i}`, null]),
    ),
  };
  assert.throws(
    () => analyzeJson(JSON.stringify(value)),
    /Combined field paths/,
  );
});

test('virtual file names are stable across preview and subset export', () => {
  const { cases } = generateCases(sample, ['/name'], [...MUTATIONS]);
  assert.deepEqual(
    cases.map((item) => item.filename),
    [
      '001-missing.json',
      '002-null.json',
      '003-empty.json',
      '004-wrongType.json',
    ],
  );
  const entries = exportEntries([cases[1]!, cases[3]!]);
  assert.deepEqual(
    entries.map((item) => item.filename),
    ['002-null.json', '004-wrongType.json', 'index.json'],
  );
  assert.equal(
    JSON.parse(entries[2]!.contents).cases[0].file,
    cases[1]!.filename,
  );
  assert.throws(
    () => exportEntries([{ ...cases[0]!, id: '../bad' }]),
    /Invalid generated file identity/,
  );
});
