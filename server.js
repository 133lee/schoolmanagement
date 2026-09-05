// Custom entry point for hosts (like imbra's Node.js manager) that run the
// app via a specific "entry script" bound to a platform-assigned port,
// rather than invoking `next start` directly.
// Plain CommonJS on purpose — this runs directly via `node server.js`,
// outside the project's TypeScript/ESM build pipeline.
/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// This file exists solely as a production entry point for hosts that need
// one bound to a platform-assigned port — local development always goes
// through `next dev` instead, never this file — so it must never fall back
// to dev mode, regardless of whether the host's environment sets NODE_ENV
// (this host's panel has no way to set it at all).
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
