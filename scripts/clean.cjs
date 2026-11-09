const fs = require('node:fs');
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('artifacts', { recursive: true });
