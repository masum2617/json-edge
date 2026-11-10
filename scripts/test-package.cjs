const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const manifest = require('../package.json');
const { windowsCliEntry } = require('./vscode-cli.cjs');

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
      { reuseMachineInstall: true }, // Supply only our disposable profile below.
    );
  const [cliCommand, ...args] = cli;
  // Windows cannot spawn a .cmd file directly. Run the same CLI entry point
  // through Code.exe in Node mode, preserving argument boundaries without a shell.
  const isWindows = process.platform === 'win32';
  const command = isWindows ? executable : cliCommand;
  const cliEntry = isWindows
    ? [windowsCliEntry(cliCommand, await fs.readFile(cliCommand, 'utf8'))]
    : [];
  try {
    if (isWindows) await fs.access(cliEntry[0]);
    cp.execFileSync(
      command,
      [
        ...cliEntry,
        ...args,
        '--user-data-dir',
        path.join(temp, 'profile'),
        '--extensions-dir',
        path.join(temp, 'extensions'),
        '--install-extension',
        path.resolve(`artifacts/${manifest.name}-${manifest.version}.vsix`),
        '--force',
      ],
      {
        stdio: 'inherit',
        env: isWindows
          ? { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
          : process.env,
      },
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
