import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "api/instagram.js",
  "scripts/dev-server.js",
  "vercel.json"
];

for (const file of requiredFiles) {
  await access(new URL(`../${file}`, import.meta.url));
}

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const api = await readFile(new URL("../api/instagram.js", import.meta.url), "utf8");

if (!html.includes("./app.js")) {
  throw new Error("index.html does not load app.js.");
}

if (!app.includes("/api/instagram")) {
  throw new Error("app.js does not call the Instagram API route.");
}

if (!api.includes("META_ACCESS_TOKEN") || !api.includes("META_IG_USER_ID")) {
  throw new Error("API route is missing Meta environment variable checks.");
}

console.log("Build check passed.");
