const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../package.json');
const errors = [];
if (
  !manifest.publisher ||
  ['local-development', 'YOUR_PUBLISHER_ID', 'your-publisher-id'].includes(
    manifest.publisher,
  )
)
  errors.push(
    'Create your Marketplace publisher and set its exact ID in package.json.',
  );
for (const key of ['repository', 'bugs', 'homepage']) {
  const value =
    typeof manifest[key] === 'string' ? manifest[key] : manifest[key]?.url;
  if (!value || !value.startsWith('https://'))
    errors.push(`Supply a public HTTPS ${key} URL.`);
}
if (manifest.name !== 'json-edge')
  errors.push('The current package identity must be json-edge.');
const icon =
  manifest.icon && fs.existsSync(manifest.icon)
    ? fs.readFileSync(manifest.icon)
    : undefined;
if (
  !icon ||
  icon.length < 24 ||
  icon.toString('hex', 0, 8) !== '89504e470d0a1a0a' ||
  icon.readUInt32BE(16) < 128 ||
  icon.readUInt32BE(20) < 128
)
  errors.push('Supply a PNG Marketplace icon at least 128 by 128 pixels.');
for (const file of [
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'docs/USER-GUIDE.md',
  'docs/PRIVACY.md',
  'docs/PUBLISHING.md',
  'docs/media/jsonedgedemo.mp4',
  'docs/media/jsonedgedemo.gif',
  'docs/media/demo-manifest.json',
  'docs/images/marketplace-overview.png',
  'docs/images/marketplace-results.png',
  'docs/images/marketplace-variations.png',
]) {
  if (!fs.existsSync(file) || !fs.statSync(file).size)
    errors.push(`Missing public release asset: ${file}`);
}
const privateExample =
  /supplier(?:id|name)?|warehouse(?:id|name)?|batchNumber|openingQty|salesPrice|purchasePrice/i;
function publicTextFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const name = path.join(dir, item.name);
    return item.isDirectory()
      ? publicTextFiles(name)
      : item.name.endsWith('.md')
        ? [name]
        : [];
  });
}
for (const file of ['README.md', 'CONTRIBUTING.md', ...publicTextFiles('docs')])
  if (privateExample.test(fs.readFileSync(file, 'utf8')))
    errors.push(`Replace project-specific examples in ${file}.`);
const demoFiles = fs
  .readdirSync('docs/media')
  .filter((name) => /\.(gif|mp4|webm|mov)$/i.test(name));
if (
  demoFiles.length !== 2 ||
  !demoFiles.includes('jsonedgedemo.mp4') ||
  !demoFiles.includes('jsonedgedemo.gif')
)
  errors.push(
    'Use the owner-provided jsonedgedemo.mp4 and its derived jsonedgedemo.gif for the demo.',
  );
if (
  fs.existsSync('docs/media/demo-manifest.json') &&
  fs.existsSync('docs/media/jsonedgedemo.mp4')
) {
  const metadata = JSON.parse(
    fs.readFileSync('docs/media/demo-manifest.json', 'utf8'),
  );
  const video = fs.readFileSync('docs/media/jsonedgedemo.mp4');
  const hash = require('node:crypto')
    .createHash('sha256')
    .update(video)
    .digest('hex');
  if (
    metadata.file !== 'jsonedgedemo.mp4' ||
    metadata.bytes !== video.length ||
    metadata.sha256 !== hash
  )
    errors.push(
      'Update the demo manifest: its filename, size or checksum does not match the video.',
    );
}
const expectedScreenshots = [
  'marketplace-overview.png',
  'marketplace-results.png',
  'marketplace-variations.png',
];
const actualScreenshots = fs
  .readdirSync('docs/images')
  .filter((name) => name.endsWith('.png'));
if (
  actualScreenshots.length !== 3 ||
  actualScreenshots.some((name) => !expectedScreenshots.includes(name))
)
  errors.push('Keep exactly the three owner-selected Marketplace screenshots.');
if (fs.existsSync('docs/media/demo-manifest.json')) {
  const metadata = JSON.parse(
    fs.readFileSync('docs/media/demo-manifest.json', 'utf8'),
  );
  const assets = [
    { ...metadata.gif, file: 'docs/media/jsonedgedemo.gif' },
    ...(metadata.screenshots ?? []).map((shot) => ({
      ...shot,
      file: path.join('docs/images', shot.file),
    })),
  ];
  for (const asset of assets) {
    if (!fs.existsSync(asset.file)) continue; // Required files are reported above.
    const bytes = fs.readFileSync(asset.file);
    const hash = require('node:crypto')
      .createHash('sha256')
      .update(bytes)
      .digest('hex');
    if (asset.bytes !== bytes.length || asset.sha256 !== hash)
      errors.push(`Media checksum/size does not match: ${asset.file}`);
  }
  if (
    metadata.gif?.frames !== metadata.frames ||
    metadata.gif?.width !== metadata.width ||
    metadata.gif?.height !== metadata.height
  )
    errors.push('The GIF must retain the source frame count and resolution.');
}
if (errors.length) {
  console.error(
    'Release preparation still needs:\n' +
      errors.map((error) => '- ' + error).join('\n'),
  );
  process.exitCode = 1;
} else
  console.log(
    'Local release metadata/media checks passed. Before upload: verify publisher ownership, public asset URLs, CI and installation of this exact VSIX.',
  );
