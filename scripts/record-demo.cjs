// Record the REAL installed extension with synthetic data in a disposable profile.
// FFmpeg is an external development tool, never a shipped extension dependency.
const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const manifest = require('../package.json');

(async () => {
  const executable = process.env.VSCODE_EXECUTABLE_PATH;
  const ffmpeg = process.env.FFMPEG_PATH;
  if (!executable || !ffmpeg)
    throw new Error(
      'Set VSCODE_EXECUTABLE_PATH and FFMPEG_PATH. See docs/DEVELOPMENT.md.',
    );
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'json-edge-recording-'));
  const profile = path.join(temp, 'profile');
  const extensions = path.join(temp, 'extensions');
  const workspace = path.join(temp, 'json-edge-demo');
  const frames = path.join(temp, 'frames');
  await Promise.all([
    fs.mkdir(path.join(profile, 'User'), { recursive: true }),
    fs.mkdir(workspace),
    fs.mkdir(frames),
    fs.mkdir('docs/media', { recursive: true }),
    fs.mkdir('docs/images', { recursive: true }),
  ]);
  await fs.writeFile(
    path.join(profile, 'User/settings.json'),
    JSON.stringify({
      'workbench.startupEditor': 'none',
      'window.restoreWindows': 'none',
      'telemetry.telemetryLevel': 'off',
      'update.mode': 'none',
      'workbench.colorTheme': 'Default Dark Modern',
      'window.zoomLevel': 0,
      'chat.disableAIFeatures': true,
      'breadcrumbs.enabled': false,
      'editor.minimap.enabled': false,
      'window.commandCenter': false,
      'workbench.tips.enabled': false,
      'workbench.secondarySideBar.defaultVisibility': 'hidden',
    }),
  );
  const source = path.join(workspace, 'profile.json');
  const original =
    JSON.stringify(
      {
        name: 'Alex',
        email: 'alex@example.com',
        age: 25,
        isActive: true,
        tags: ['member'],
      },
      null,
      2,
    ) + '\n';
  await fs.writeFile(source, original);
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
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = cp.spawn(
    executable,
    [
      '--user-data-dir',
      profile,
      '--extensions-dir',
      extensions,
      '--remote-debugging-port=9332',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--disable-extension',
      'github.copilot',
      '--disable-extension',
      'github.copilot-chat',
      '--disable-updates',
      '--no-sandbox',
      '--new-window',
      workspace,
      source,
    ],
    { stdio: 'ignore', env },
  );
  const clipboard =
    process.platform === 'darwin'
      ? cp.execFileSync('/usr/bin/pbpaste')
      : undefined;
  let browser;
  let stop = false;
  let recording;
  let frameCount = 0;
  try {
    await expect
      .poll(
        async () => {
          try {
            return (await fetch('http://127.0.0.1:9332/json/version')).ok;
          } catch {
            return false;
          }
        },
        { timeout: 30000 },
      )
      .toBe(true);
    browser = await chromium.connectOverCDP('http://127.0.0.1:9332');
    const context = browser.contexts()[0];
    await expect.poll(() => context.pages().length).toBeGreaterThan(0);
    const page =
      context.pages().find((p) => p.url().includes('workbench')) ||
      context.pages()[0];
    await page.locator('.monaco-workbench').waitFor({ state: 'visible' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .locator('.activitybar')
      .getByRole('tab', { name: /JSON Edge/ })
      .click();
    let frame;
    async function bindFrame() {
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
    }
    await bindFrame();
    await expect(frame.getByLabel('Example JSON', { exact: true })).toHaveValue(
      original.trim(),
    );
    await expect(page.locator('.part.sidebar')).toBeHidden();
    await expect(
      frame.getByRole('checkbox', { name: '/email', exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: 'docs/images/marketplace-editor.png' });
    // Expand the actual editor tab for readable listing media; omit setup menus.
    await page.keyboard.press('F1');
    await page
      .locator('.quick-input-widget input')
      .fill('>View: Join All Editor Groups');
    await page.keyboard.press('Enter');
    await bindFrame();
    await frame.evaluate(() => window.scrollTo(0, 0));
    const fps = 6;
    const frameMs = 1000 / fps;
    // Serialize captures to avoid overlapping screenshots or dropped promises.
    recording = (async () => {
      while (!stop) {
        const started = Date.now();
        await page.screenshot({
          path: path.join(
            frames,
            `${String(frameCount++).padStart(5, '0')}.png`,
          ),
        });
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, frameMs - (Date.now() - started))),
        );
      }
    })();
    const hold = (ms) => page.waitForTimeout(ms); // Deliberate pacing for a human-readable recording.
    await hold(1400);
    await frame.getByRole('checkbox', { name: '/email', exact: true }).check();
    await page.screenshot({ path: 'docs/images/marketplace-input.png' });
    await hold(1900);
    await frame.getByRole('button', { name: 'Generate edge cases' }).click();
    await expect(frame.getByText('4 files', { exact: true })).toBeVisible();
    await hold(1700);
    for (const name of [
      '002-null.json — /email — Null value',
      '003-empty.json — /email — Empty value',
      '004-wrongType.json — /email — Wrong type',
    ]) {
      await frame.getByRole('button', { name, exact: true }).click();
      await hold(1700);
    }
    await frame
      .getByRole('button', {
        name: '002-null.json — /email — Null value',
        exact: true,
      })
      .click();
    await page.screenshot({ path: 'docs/images/marketplace-preview.png' });
    // Pause continuous capture around the native clipboard handoff. Hold its
    // verified final state in the clip rather than recording nondeterministic OS delay.
    stop = true;
    await recording;
    await page.bringToFront();
    const copy = frame.getByRole('button', { name: 'Copy JSON' });
    await copy.focus();
    await copy.press('Enter');
    await expect(frame.getByRole('status')).toContainText('JSON copied', {
      timeout: 10000,
    });
    if (process.platform === 'darwin')
      assert.equal(
        JSON.parse(cp.execFileSync('/usr/bin/pbpaste', { encoding: 'utf8' }))
          .email,
        null,
      );
    const copiedFrame = await page.screenshot();
    for (let i = 0; i < 14; i++)
      await fs.writeFile(
        path.join(frames, `${String(frameCount++).padStart(5, '0')}.png`),
        copiedFrame,
      );
    // A separate real screenshot demonstrates generic snippet conversion/dummy values.
    await frame
      .getByLabel('Example JSON', { exact: true })
      .fill('userId,\nname: profile?.name,\nemail: profile?.email,\nisActive,');
    await frame
      .getByRole('button', { name: 'Format JSON', exact: true })
      .click();
    await expect(frame.getByLabel('Example JSON', { exact: true })).toHaveValue(
      JSON.stringify(
        { userId: '', name: '', email: '', isActive: '' },
        null,
        2,
      ),
    );
    await frame.getByRole('button', { name: 'Fill dummy values' }).click();
    await expect(frame.getByLabel('Example JSON', { exact: true })).toHaveValue(
      JSON.stringify(
        { userId: 1, name: 'Alex', email: 'alex@example.com', isActive: true },
        null,
        2,
      ),
    );
    await frame.getByRole('checkbox', { name: '/email', exact: true }).check();
    await frame.getByRole('button', { name: 'Generate edge cases' }).click();
    await expect(
      frame.getByRole('button', { name: 'Generate edge cases' }),
    ).toBeEnabled();
    await expect(frame.getByRole('status')).toContainText('4 JSON files ready');
    await frame.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'docs/images/marketplace-snippets.png' });
    assert.equal(
      await fs.readFile(source, 'utf8'),
      original,
      'Recording never edits the source document',
    );
    const input = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-framerate',
      String(fps),
      '-i',
      path.join(frames, '%05d.png'),
    ];
    cp.execFileSync(
      ffmpeg,
      [
        ...input,
        '-vf',
        'scale=1280:-2:flags=lanczos',
        '-c:v',
        'libx264',
        '-preset',
        'slow',
        '-crf',
        '22',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        'docs/media/json-edge-demo.mp4',
      ],
      { stdio: 'inherit' },
    );
    cp.execFileSync(
      ffmpeg,
      [
        ...input,
        '-filter_complex',
        '[0:v]scale=1280:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
        '-loop',
        '0',
        'docs/media/json-edge-demo.gif',
      ],
      { stdio: 'inherit' },
    );
    const outputs = await Promise.all(
      ['json-edge-demo.gif', 'json-edge-demo.mp4'].map(async (name) => ({
        file: name,
        bytes: (await fs.stat(path.join('docs/media', name))).size,
      })),
    );
    await fs.writeFile(
      'docs/media/demo-manifest.json',
      JSON.stringify(
        {
          extension: manifest.displayName,
          version: manifest.version,
          frames: frameCount,
          fps,
          durationSeconds: Number((frameCount / fps).toFixed(2)),
          source:
            'Actual installed VSIX in isolated desktop VS Code; synthetic profile data; no simulated product UI.',
          outputs,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(
      `Recorded ${frameCount} frames: GIF/MP4 and four Marketplace screenshots. Source preserved.`,
    );
  } finally {
    stop = true;
    if (recording) await recording.catch(() => {});
    if (browser) await browser.close();
    if (clipboard !== undefined)
      cp.execFileSync('/usr/bin/pbcopy', { input: clipboard });
    child.kill();
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
