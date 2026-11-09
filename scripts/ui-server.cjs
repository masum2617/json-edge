// Test-only static server. The shipped extension never starts a server.
const http = require('node:http');
const fs = require('node:fs');
http
  .createServer((req, res) => {
    const name =
      req.url === '/'
        ? 'panel.html'
        : req.url === '/main.css'
          ? 'main.css'
          : req.url === '/main.js'
            ? 'main.js'
            : undefined;
    if (!name) {
      res.writeHead(404);
      res.end();
      return;
    }
    let body = fs.readFileSync(`dist/media/${name}`, 'utf8');
    if (name === 'panel.html')
      body = body
        .replaceAll('{{CSP}}', "'self'")
        .replaceAll('{{NONCE}}', 'test-nonce')
        .replaceAll('{{STYLE}}', '/main.css')
        .replaceAll('{{SCRIPT}}', '/main.js');
    res.setHeader(
      'Content-Type',
      name.endsWith('.css')
        ? 'text/css'
        : name.endsWith('.js')
          ? 'text/javascript'
          : 'text/html',
    );
    res.end(body);
  })
  .listen(4178, '127.0.0.1');
