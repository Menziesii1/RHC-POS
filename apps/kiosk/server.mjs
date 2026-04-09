import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "dist");
const port = Number.parseInt(process.env.PORT ?? "8080", 10);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".txt", "text/plain; charset=utf-8"],
]);

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function serveFile(res, filePath) {
  try {
    await stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const body = await readFile(filePath);
    send(res, 200, body, {
      "Content-Type": contentTypes.get(ext) ?? "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    });
  } catch {
    send(res, 404, "Not found");
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    send(res, 200, JSON.stringify({ ok: true, service: "kiosk" }), {
      "Content-Type": "application/json; charset=utf-8",
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method not allowed");
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const filePath = pathname === "/" ? path.join(distDir, "index.html") : path.join(distDir, pathname);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      await serveFile(res, filePath);
      return;
    }
  } catch {
    // Fall through to SPA fallback.
  }

  await serveFile(res, path.join(distDir, "index.html"));
}).listen(port, "0.0.0.0", () => {
  console.log(`Kiosk server listening on http://0.0.0.0:${port}`);
});
