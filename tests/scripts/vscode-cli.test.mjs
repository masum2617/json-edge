import assert from 'node:assert/strict';
import { test } from 'node:test';
import cli from '../../scripts/vscode-cli.cjs';
const { windowsCliEntry } = cli;

const launcher = String.raw`D:\a\json edge\.vscode-test\VS Code\bin\code.cmd`;

test('Windows CLI resolves the versioned resources layout used by VS Code 1.145.2', () => {
  const wrapper = String.raw`@echo off
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\Code.exe" "%~dp0..\c4453f8ea4\resources\app\out\cli.js" %*
`;
  assert.equal(
    windowsCliEntry(launcher, wrapper),
    String.raw`D:\a\json edge\.vscode-test\VS Code\c4453f8ea4\resources\app\out\cli.js`,
  );
});

test('Windows CLI still resolves the legacy resources layout', () => {
  const wrapper = String.raw`"%~dp0..\Code.exe" "%~dp0..\resources\app\out\cli.js" %*`;
  assert.equal(
    windowsCliEntry(launcher, wrapper),
    String.raw`D:\a\json edge\.vscode-test\VS Code\resources\app\out\cli.js`,
  );
});

test('Windows CLI rejects unrecognized wrappers instead of guessing a path', () => {
  assert.throws(
    () => windowsCliEntry(launcher, '@echo off'),
    /Cannot find the VS Code CLI target/,
  );
});
