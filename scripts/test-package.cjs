const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const manifest = require('../package.json');

// Install the exact VSIX into a disposable profile, then test its installed files.
(async () => {
  const temp = await fs.mkdtemp(
    path.join(os.tmpdir(), 'json-edge-case-package-'),
  );
  const executable =
    process.env.VSCODE_EXECUTABLE_PATH ||
    (await require('@vscode/test-electron').downloadAndUnzipVSCode('stable'));
  const cli =
    require('@vscode/test-electron').resolveCliArgsFromVSCodeExecutablePath(
      executable,
    );
  const [command, ...args] = cli;
  try {
    cp.execFileSync(
      command,
      [
        ...args,
        '--user-data-dir',
        path.join(temp, 'profile'),
        '--extensions-dir',
        path.join(temp, 'extensions'),
        '--install-extension',
        path.resolve(`artifacts/${manifest.name}-${manifest.version}.vsix`),
        '--force',
      ],
      { stdio: 'inherit' },
    );
    const installed = (await fs.readdir(path.join(temp, 'extensions'))).find(
      (name) => name.startsWith(`${manifest.publisher}.${manifest.name}-`),
    );
    if (!installed) throw new Error('VSIX was not installed.');
    cp.execFileSync(process.execPath, ['scripts/test-integration.cjs'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        JECM_EXTENSION_PATH: path.join(temp, 'extensions', installed),
        VSCODE_EXECUTABLE_PATH: executable,
      },
    });
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
