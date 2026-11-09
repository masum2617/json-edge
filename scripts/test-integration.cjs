const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { runTests } = require('@vscode/test-electron');

(async () => {
  const profile = await fs.mkdtemp(
    path.join(os.tmpdir(), 'json-edge-case-vscode-'),
  );
  try {
    await runTests({
      extensionDevelopmentPath:
        process.env.JECM_EXTENSION_PATH || path.resolve('.'),
      extensionTestsPath: path.resolve('dist/tests/integration/index.js'),
      ...(process.env.VSCODE_EXECUTABLE_PATH
        ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE_PATH }
        : {}),
      launchArgs: [
        '--user-data-dir',
        profile,
        '--extensions-dir',
        path.join(profile, 'extensions'),
        '--disable-extensions',
        '--disable-extension',
        'github.copilot',
        '--disable-extension',
        'github.copilot-chat',
        '--disable-telemetry',
        '--disable-updates',
        '--disable-workspace-trust',
        '--skip-welcome',
        '--skip-release-notes',
        '--no-sandbox',
      ],
    });
  } finally {
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
