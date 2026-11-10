const path = require('node:path');

/** Read the CLI target from VS Code's trusted bundled Windows launcher.
 * New releases can put resources under a version-specific directory. Using the
 * wrapper's target supports both layouts without executing a shell command.
 */
function windowsCliEntry(cliCommand, wrapper) {
  const match = wrapper.match(
    /"%~dp0([^"\r\n]*resources[\\/]app[\\/]out[\\/]cli\.js)"/i,
  );
  if (!match)
    throw new Error(`Cannot find the VS Code CLI target in ${cliCommand}.`);
  return path.win32.resolve(path.win32.dirname(cliCommand), match[1]);
}

module.exports = { windowsCliEntry };
