import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareInput, fillDummyValues } from '../../src/core/prepare';
import { analyzeJson } from '../../src/core/analyze';
import { parseClientMessage } from '../../src/protocol';

const batch =
  '{ batchNumber: "", openingQty: "", salesPrice: "", purchasePrice: "", }';
const supplier =
  'supplierId, supplierName: supplier?.supplierName, warehouseId, warehouseName: warehouse?.name,';

test('loads the reported unquoted-key object with trailing comma as formatted JSON', () => {
  const prepared = prepareInput(batch);
  assert.deepEqual(JSON.parse(prepared.text), {
    batchNumber: '',
    openingQty: '',
    salesPrice: '',
    purchasePrice: '',
  });
  assert.match(prepared.text, /\n  "openingQty": ""/);
  assert.doesNotThrow(() => analyzeJson(prepared.text));
});

test('wraps selected property lists and replaces shorthand and optional chains', () => {
  const prepared = prepareInput(supplier);
  assert.deepEqual(JSON.parse(prepared.text), {
    supplierId: '',
    supplierName: '',
    warehouseId: '',
    warehouseName: '',
  });
  assert.match(prepared.note, /4 runtime expressions/);
});

test('preserves literal data and nesting without running expressions', () => {
  const prepared = prepareInput(`{
    nested: { 'a.b': -3, 'a/b': true, text: 'hello', nullable: null },
    tags: ['customer', { id: 7 }], template: \`literal\`, hex: 0xff,
    computedValue: (() => { throw new Error('must never execute'); })(),
  }`);
  assert.deepEqual(JSON.parse(prepared.text), {
    nested: { 'a.b': -3, 'a/b': true, text: 'hello', nullable: null },
    tags: ['customer', { id: 7 }],
    template: 'literal',
    hex: 255,
    computedValue: '',
  });
});

test('keeps strict JSON valid and special keys as ordinary own data', () => {
  const prepared = prepareInput(
    '{"__proto__":{"polluted":false},"constructor":3,"":1}',
  );
  const value = JSON.parse(prepared.text);
  assert.equal(value.__proto__.polluted, false);
  assert.equal(
    Object.getOwnPropertyDescriptor(Object.prototype, 'polluted'),
    undefined,
  );
  assert.equal(
    JSON.parse(prepareInput('{ __proto__: other }').text).__proto__,
    '',
  );
});

test('rejects ambiguous or malformed selections without silently dropping fields', () => {
  for (const text of [
    '{...rest}',
    '{ [key]: 1 }',
    '{ method() {} }',
    '{ get value() {} }',
    '{a:1,a:2}',
    '{a:1,"a":2}',
    '{ tags: [,1] }',
    '{ tags: [...items] }',
    '{a:1}; evil()',
    '{a:',
    '[]',
    '{ value: 1n }',
    '{ value: 1e400 }',
    '{value:9007199254740993}',
  ]) {
    assert.throws(() => prepareInput(text), Error, text);
  }
  assert.throws(() => prepareInput('{a:'.repeat(5000)), /Nesting exceeds/);
  assert.throws(
    () => prepareInput('a:"' + 'x'.repeat(1024 * 1024) + '"'),
    /1 MiB/,
  );
});

test('dummy values are deterministic hints and preserve existing data', () => {
  const prepared = fillDummyValues(supplier);
  assert.deepEqual(JSON.parse(prepared.text), {
    supplierId: 1,
    supplierName: 'Example Supplier',
    warehouseId: 1,
    warehouseName: 'Main Warehouse',
  });
  assert.deepEqual(JSON.parse(fillDummyValues(batch).text), {
    batchNumber: 'BATCH-001',
    openingQty: 10,
    salesPrice: 10,
    purchasePrice: 10,
  });
  const text =
    '{"email":"","isActive":null,"name":"Existing","price":0,"nested":{"city":""},"tags":[]}';
  const result = fillDummyValues(text);
  assert.equal(fillDummyValues(text).text, result.text);
  assert.deepEqual(JSON.parse(result.text), {
    email: 'alex@example.com',
    isActive: true,
    name: 'Existing',
    price: 0,
    nested: { city: 'Dhaka' },
    tags: [],
  });
});

test('new preparation messages are revisioned and bounded', () => {
  assert.deepEqual(parseClientMessage({ type: 'loadEditor', revision: 3 }), {
    type: 'loadEditor',
    revision: 3,
  });
  for (const type of ['format', 'dummy']) {
    assert.equal(
      parseClientMessage({ type, revision: 1, text: batch }).type,
      type,
    );
    assert.throws(() => parseClientMessage({ type, revision: 1, text: {} }));
    assert.throws(() =>
      parseClientMessage({ type, revision: -1, text: batch }),
    );
  }
  assert.throws(() => parseClientMessage({ type: 'loadEditor' }));
});

test('formatting cannot replace a bounded compact input with oversized pretty JSON', () => {
  const text = JSON.stringify({ items: Array(180000).fill(1) });
  assert.doesNotThrow(() => analyzeJson(text));
  assert.throws(() => prepareInput(text), /1 MiB/);
});
