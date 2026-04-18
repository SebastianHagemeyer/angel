#!/usr/bin/env node
// Downloads a banner image for every Minecraft version in data.js.
// For each version, tries each candidate filename against minecraft.wiki then
// minecraft.fandom.com, following redirects. First successful download wins
// and is saved to images/<slug>.<ext>. Usage: node scripts/download-banners.js

const fs = require("fs");
const path = require("path");
const https = require("https");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "images");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HOSTS = [
  "https://minecraft.wiki/w/Special:FilePath/",
  "https://minecraft.fandom.com/wiki/Special:FilePath/",
];

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[/&]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadVersions() {
  const src = fs.readFileSync(path.join(ROOT, "data.js"), "utf8");
  const sandbox = {};
  // eslint-disable-next-line no-eval
  eval(src.replace("const MINECRAFT_VERSIONS", "sandbox.MINECRAFT_VERSIONS"));
  return sandbox.MINECRAFT_VERSIONS;
}

function get(urlStr, redirects = 5) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "GET",
        headers: {
          "User-Agent": UA,
          Accept: "image/*,*/*;q=0.8",
        },
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          const next = new URL(res.headers.location, urlStr).toString();
          res.resume();
          resolve(get(next, redirects - 1));
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            body: Buffer.concat(chunks),
            contentType: res.headers["content-type"] || "",
          })
        );
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

function extFor(contentType) {
  if (/png/i.test(contentType)) return "png";
  if (/jpe?g/i.test(contentType)) return "jpg";
  if (/webp/i.test(contentType)) return "webp";
  if (/gif/i.test(contentType)) return "gif";
  return "png";
}

async function tryOne(version) {
  const slug = slugify(version.version);
  const candidates = [];
  for (const name of [].concat(version.banner || [])) {
    for (const host of HOSTS) {
      candidates.push(host + encodeURIComponent(name));
    }
  }
  for (const url of candidates) {
    try {
      const { body, contentType } = await get(url);
      if (!body.length) continue;
      if (!/^image\//i.test(contentType)) continue;
      const ext = extFor(contentType);
      const dest = path.join(IMAGES_DIR, `${slug}.${ext}`);
      fs.writeFileSync(dest, body);
      console.log(`  \u2713 ${version.version} -> ${path.relative(ROOT, dest)} (${(body.length / 1024).toFixed(1)} KB)`);
      return true;
    } catch (err) {
      // try next candidate
    }
  }
  console.log(`  \u2717 ${version.version} (no candidate resolved)`);
  return false;
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const versions = loadVersions();
  console.log(`Downloading banners for ${versions.length} versions...`);
  let ok = 0;
  for (const v of versions) {
    if (await tryOne(v)) ok++;
  }
  console.log(`\nDone: ${ok}/${versions.length} downloaded.`);
  if (ok < versions.length) {
    console.log(
      "For failures, open the version's wiki page in a browser and save the banner to images/<slug>.png manually."
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
