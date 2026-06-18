import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import handler from "../api/instagram.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname === "/api/instagram") {
    return handler(
      {
        method: request.method,
        query: Object.fromEntries(url.searchParams.entries())
      },
      createApiResponse(response)
    );
  }

  const filePath = safePath(url.pathname === "/" ? "/index.html" : url.pathname);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream"
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.on("error", (error) => {
  console.error(`Local server could not start: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Curated Discovery running at http://${host}:${port}`);
});

function safePath(pathname) {
  const candidate = normalize(join(root, pathname));
  return candidate.startsWith(root) ? candidate : "";
}

function createApiResponse(response) {
  return {
    statusCode: 200,
    setHeader(key, value) {
      response.setHeader(key, value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      response.writeHead(this.statusCode, {
        "Content-Type": "application/json; charset=utf-8"
      });
      response.end(JSON.stringify(payload));
    }
  };
}
