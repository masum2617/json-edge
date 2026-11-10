// Optional macOS real-editor UI smoke. Uses an isolated profile and installed VSIX.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const manifest = require('../package.json');

(async () => {
  const executable = process.env.VSCODE_EXECUTABLE_PATH;
  if (!executable)
    throw new Error('Set VSCODE_EXECUTABLE_PATH to the VS Code executable.');
  const temp = await fs.mkdtemp(
    path.join(os.tmpdir(), 'json-edge-case-editor-'),
  );
  const profile = path.join(temp, 'profile');
  const extensions = path.join(temp, 'extensions');
  await fs.mkdir(path.join(profile, 'User'), { recursive: true });
  await fs.writeFile(
    path.join(profile, 'User', 'settings.json'),
    JSON.stringify({
      'workbench.startupEditor': 'none',
      'window.restoreWindows': 'none',
      'files.simpleDialog.enable': true,
      'window.dialogStyle': 'custom',
      'telemetry.telemetryLevel': 'off',
      'update.mode': 'none',
      'workbench.colorTheme': 'Default Dark Modern',
      'window.zoomLevel': 0,
      'chat.disableAIFeatures': true,
    }),
  );
  const cli =
    require('@vscode/test-electron').resolveCliArgsFromVSCodeExecutablePath(
      executable,
    );
  cp.execFileSync(
    cli[0],
    [
      ...cli.slice(1),
      '--user-data-dir',
      profile,
      '--extensions-dir',
      extensions,
      '--install-extension',
      path.resolve(`artifacts/${manifest.name}-${manifest.version}.vsix`),
      '--force',
    ],
    { stdio: 'ignore' },
  );
  const source = path.join(temp, 'example.json');
  const original =
    '{\n  "name": "Alex",\n  "email": "alex@example.com",\n  "age": 25,\n  "address": { "city": "Dhaka" },\n  "tags": ["customer"]\n}\n';
  await fs.writeFile(source, original);
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = cp.spawn(
    executable,
    [
      '--user-data-dir',
      profile,
      '--extensions-dir',
      extensions,
      '--remote-debugging-port=9331',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--disable-extension',
      'github.copilot-chat',
      '--disable-extension',
      'github.copilot',
      '--disable-updates',
      '--no-sandbox',
      '--new-window',
      source,
    ],
    { stdio: 'ignore', env },
  );
  let browser;
  const clipboardBefore =
    process.platform === 'darwin'
      ? cp.execFileSync('/usr/bin/pbpaste')
      : undefined;
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await fetch('http://127.0.0.1:9331/json/version')).ok;
          } catch {
            return false;
          }
        },
        { timeout: 30000 },
      )
      .toBe(true);
    browser = await chromium.connectOverCDP('http://127.0.0.1:9331');
    const context = browser.contexts()[0];
    await expect.poll(() => context.pages().length).toBeGreaterThan(0);
    const page =
      context.pages().find((p) => p.url().includes('workbench')) ||
      context.pages()[0];
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.monaco-workbench').waitFor({ state: 'visible' });
    // One Activity Bar click opens the editor directly; no second button.
    const activity = page
      .locator('.activitybar')
      .getByRole('tab', { name: /JSON Twist/ });
    await activity.click();
    let frame;
    await expect
      .poll(
        async () => {
          for (const candidate of page.frames()) {
            if (await candidate.locator('#json-input').count()) {
              frame = candidate;
              return true;
            }
          }
          return false;
        },
        { timeout: 20000 },
      )
      .toBe(true);
    await expect(frame.getByLabel('Example JSON', { exact: true })).toHaveValue(
      JSON.stringify(JSON.parse(original), null, 2),
    );
    await frame.getByRole('checkbox', { name: '/email', exact: true }).check();
    await frame.getByRole('button', { name: 'Generate edge cases' }).click();
    await expect(frame.getByText('4 files', { exact: true })).toBeVisible();
    await expect(page.locator('.part.sidebar')).toBeHidden();
    // A repeated click reveals the same panel and preserves its generated files.
    await activity.click();
    await expect(page.locator('.part.sidebar')).toBeHidden();
    await expect(
      page.locator('.tab').filter({ hasText: 'JSON Twist' }),
    ).toHaveCount(1);
    await frame
      .getByRole('button', {
        name: '002-null.json — /email — Null value',
        exact: true,
      })
      .click();
    await expect(
      frame.getByRole('heading', { name: '002-null.json', exact: true }),
    ).toBeVisible();
    await expect(frame.getByLabel('Generated JSON preview')).toContainText(
      '"email": null',
    );
    await frame.getByRole('button', { name: 'Copy JSON' }).click();
    await expect(frame.getByRole('status')).toContainText('JSON copied');
    await expect(page.locator('.part.sidebar')).toBeHidden();
    await expect(
      page.getByRole('button', { name: 'Open Generator', exact: true }),
    ).toHaveCount(0);
    if (process.platform === 'darwin')
      assert.equal(
        JSON.parse(cp.execFileSync('/usr/bin/pbpaste', { encoding: 'utf8' }))
          .email,
        null,
        'Copy uses the selected virtual file',
      );
    await fs.mkdir('test-results/editor-smoke', { recursive: true });
    await page.screenshot({
      path: 'test-results/editor-smoke/activity-launch.png',
    });
    await page.keyboard.press('F1');
    await page
      .locator('.quick-input-widget input')
      .fill('>View: Join All Editor Groups');
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => {
        for (const candidate of page.frames()) {
          if (await candidate.locator('#json-input').count()) {
            frame = candidate;
            return true;
          }
        }
        return false;
      })
      .toBe(true);
    await frame.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'test-results/editor-smoke/input.png' });
    await frame
      .getByRole('button', { name: 'Copy JSON' })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/editor-smoke/results.png' });
    assert.equal(
      (await fs.readdir(temp)).filter((name) =>
        name.startsWith('json-edge-cases-'),
      ).length,
      0,
      'Generating and copying virtual files never creates a folder',
    );
    await frame
      .getByText('Save files to disk (optional)', { exact: true })
      .click();
    // Exercise the actual custom VS Code folder dialog, not a mocked UI bridge.
    await frame.getByRole('button', { name: 'Export selected' }).click();
    await page
      .locator('.quick-input-widget input')
      .waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await expect(frame.getByRole('status')).toContainText('Export cancelled');
    await frame.getByRole('button', { name: 'Export selected' }).click();
    await page
      .locator('.quick-input-widget input')
      .waitFor({ state: 'visible' });
    const folderInput = page.locator('.quick-input-widget input');
    if (await folderInput.count()) {
      await folderInput.fill(temp + path.sep);
      await page.keyboard.press('Enter');
    }
    // Directory creation precedes sequential writes; wait for the actual completion notice.
    await expect(frame.getByRole('status')).toContainText(
      'Exported 4 cases and index.json',
      { timeout: 15000 },
    );
    await expect
      .poll(
        async () =>
          (await fs.readdir(temp)).filter((name) =>
            name.startsWith('json-edge-cases-'),
          ).length,
        { timeout: 15000 },
      )
      .toBe(1);
    const output = (await fs.readdir(temp)).find((name) =>
      name.startsWith('json-edge-cases-'),
    );
    assert.equal((await fs.readdir(path.join(temp, output))).length, 5);
    assert.equal(await fs.readFile(source, 'utf8'), original);
    async function loadSelection(filename, snippet, expected) {
      const file = path.join(temp, filename);
      await fs.writeFile(file, snippet);
      await page.keyboard.press('F1');
      await page.locator('.quick-input-widget input').fill('>Go to File...');
      await page.keyboard.press('Enter');
      await page.locator('.quick-input-widget input').fill(file);
      await page
        .locator('.quick-input-widget .monaco-list-row')
        .filter({ hasText: filename })
        .first()
        .waitFor({ state: 'visible' });
      await page.keyboard.press('Enter');
      await page
        .locator('.tab')
        .filter({ hasText: filename })
        .last()
        .waitFor({ state: 'visible' });
      await page.locator('.quick-input-widget').waitFor({ state: 'hidden' });
      await page.keyboard.press('Meta+a');
      await page.keyboard.press('F1');
      await page.locator('.quick-input-widget input').fill('>JSON Twist: Open');
      await page.keyboard.press('Enter');
      await frame
        .getByRole('button', { name: 'Load from Active Editor' })
        .click();
      await expect(
        frame.getByLabel('Example JSON', { exact: true }),
      ).toHaveValue(JSON.stringify(expected, null, 2));
      assert.equal(await fs.readFile(file, 'utf8'), snippet);
    }
    await loadSelection(
      'profile-fields-snippet.js',
      '{\n name: "",\n age: "",\n email: "",\n isActive: "",\n}',
      {
        name: '',
        age: '',
        email: '',
        isActive: '',
      },
    );
    await loadSelection(
      'profile-snippet.js',
      'userId,\n name: profile?.name,\n isActive,\n email: profile?.email,',
      {
        userId: '',
        name: '',
        isActive: '',
        email: '',
      },
    );
    await frame.getByRole('button', { name: 'Fill dummy values' }).click();
    await expect(frame.getByLabel('Example JSON', { exact: true })).toHaveValue(
      JSON.stringify(
        {
          userId: 1,
          name: 'Alex',
          isActive: true,
          email: 'alex@example.com',
        },
        null,
        2,
      ),
    );
    console.log(
      'Real installed VSIX UI: editor load, generate, preview, copy, folder dialog, export, one-click Activity Bar launch and repeated-click reuse, selected JavaScript snippets, dummy values, source preservation passed.',
    );
  } finally {
    if (browser) await browser.close();
    if (clipboardBefore !== undefined)
      cp.execFileSync('/usr/bin/pbcopy', { input: clipboardBefore });
    child.kill();
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
