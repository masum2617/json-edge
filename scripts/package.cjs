const fs = require('node:fs');
const vsce = require('@vscode/vsce');
const manifest = require('../package.json');
fs.mkdirSync('artifacts', { recursive: true });
// Local candidates have no invented repository URLs. Real release metadata enables
// vsce's normal link rewriting automatically when the owner supplies a repository.
vsce
  .createVSIX({
    packagePath: `artifacts/${manifest.name}-${manifest.version}.vsix`,
    allowMissingRepository: !manifest.repository,
    rewriteRelativeLinks: Boolean(manifest.repository),
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
