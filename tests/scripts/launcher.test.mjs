import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise(setImmediate);
  }
  assert.ok(check(), 'Expected asynchronous launcher state');
}

function launcherHarness() {
  let visibilityChanged;
  let toggles = 0;
  let closes = 0;
  const gate = deferred();
  const context = { subscriptions: [] };
  const view = {
    visible: false,
    onDidChangeVisibility: (listener) => {
      visibilityChanged = listener;
      return { dispose() {} };
    },
    dispose() {},
  };
  const exports = {};
  vm.runInNewContext(
    readFileSync(
      new URL('../../dist/src/sidebar/launcher.js', import.meta.url),
      'utf8',
    ),
    {
      exports,
      require: () => ({
        window: { createTreeView: () => view, showErrorMessage: assert.fail },
        commands: {
          executeCommand: async () => {
            closes++;
            await gate.promise;
            view.visible = false;
            visibilityChanged({ visible: false });
          },
        },
      }),
    },
  );
  exports.registerActivityLauncher(context, async () => {
    toggles++;
  });
  return {
    show() {
      view.visible = true;
      visibilityChanged({ visible: true });
    },
    hide() {
      view.visible = false;
      visibilityChanged({ visible: false });
    },
    releaseClose: gate.resolve,
    dispose() {
      context.subscriptions.forEach((item) => item.dispose());
    },
    toggles: () => toggles,
    closes: () => closes,
  };
}

test('an icon click during sidebar closing is processed after the current toggle', async () => {
  const h = launcherHarness();
  h.show();
  await until(() => h.closes() === 1);
  h.hide();
  h.show(); // A new click arrives before the native close promise resolves.
  assert.equal(h.toggles(), 1, 'Toggle operations remain serialized');
  h.releaseClose();
  await until(() => h.toggles() === 2);
  assert.equal(
    h.closes(),
    1,
    'The queued request survives the view becoming hidden',
  );
  h.dispose();
});

test('disposing a launcher drops its queued icon click', async () => {
  const h = launcherHarness();
  h.show();
  await until(() => h.closes() === 1);
  h.hide();
  h.show();
  h.dispose();
  h.releaseClose();
  await new Promise(setImmediate);
  assert.equal(h.toggles(), 1);
});
