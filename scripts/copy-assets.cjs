const fs = require('node:fs');
fs.mkdirSync('dist/media', { recursive: true });
for (const file of ['panel.html', 'main.css'])
  fs.copyFileSync(`media/${file}`, `dist/media/${file}`);
const ts = require('typescript');
const source = fs.readFileSync('src/webview/main.ts', 'utf8');
const result = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
fs.writeFileSync(
  'dist/media/main.js',
  result.outputText.replace(/^export \{\};?$/m, ''),
);
