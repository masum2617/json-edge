const fs = require('node:fs');
const manifest = require('../package.json');
const errors = [];
if (!manifest.publisher || manifest.publisher === 'local-development')
  errors.push('Supply the owner’s verified Marketplace publisher ID.');
for (const key of ['repository', 'bugs', 'homepage']) {
  const value =
    typeof manifest[key] === 'string' ? manifest[key] : manifest[key]?.url;
  if (!value || !value.startsWith('https://'))
    errors.push(`Supply a public HTTPS ${key} URL.`);
}
if (!fs.existsSync('media/icon.png')) errors.push('Missing PNG icon.');
if (errors.length) {
  console.error(
    'Release metadata is not ready:\n' + errors.map((e) => `- ${e}`).join('\n'),
  );
  process.exitCode = 1;
} else
  console.log(
    'Release metadata checks passed. Verify account ownership and Marketplace ID availability before upload.',
  );
