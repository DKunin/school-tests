import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { rootDirectory } from "./catalog.mjs";

const publicDirectory = path.resolve(rootDirectory, process.env.SITE_DIR || "dist");
const port = Number(process.env.PORT || 4173);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"]
]);

async function resolveFile(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const candidate = path.resolve(publicDirectory, `.${pathname}`);
  if (candidate !== publicDirectory && !candidate.startsWith(`${publicDirectory}${path.sep}`)) return null;
  try {
    const info = await stat(candidate);
    const file = info.isDirectory() ? path.join(candidate, "index.html") : candidate;
    await stat(file);
    return file;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}

const server = createServer(async (request, response) => {
  try {
    const file = await resolveFile(request.url || "/");
    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Страница не найдена");
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": mimeTypes.get(path.extname(file)) || "application/octet-stream",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin"
    });
    response.end(body);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Ошибка сервера");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Сайт: http://127.0.0.1:${port}`);
});
