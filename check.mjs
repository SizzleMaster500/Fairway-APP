// Quick sanity check: required files exist, scripts parse, HTML references every script.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import path from "node:path";

const root = path.resolve(import.meta.dirname);
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const scripts = [
  "utils",
  "storage",
  "handicap",
  "player",
  "courses",
  "rounds",
  "app",
];

for (const f of [
  "styles.css",
  "sw.js",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
  ...scripts.map((s) => `js/${s}.js`),
])
  assert(fs.existsSync(path.join(root, f)), `Missing ${f}`);

// Scripts must be listed in this order: later files use helpers from earlier ones.
const order = scripts.map((s) => html.indexOf(`./js/${s}.js`));
assert(
  order.every((i, n) => i > -1 && (n === 0 || i > order[n - 1])),
  "index.html script order is wrong",
);
assert.equal(manifest.start_url, "./");

const version = html.match(/FAIRWAY (v[\d.]+)/)[1];
assert(
  read("sw.js").includes(`fairway-${version}`),
  `sw.js CACHE must match ${version}`,
);
for (const s of scripts) new vm.Script(read(`js/${s}.js`));

// No function may be defined in two files: the last one loaded would silently win.
const seen = new Map();
for (const s of scripts)
  for (const m of read(`js/${s}.js`).matchAll(/^(?:async )?function (\w+)/gm)) {
    assert(
      !seen.has(m[1]),
      `${m[1]}() is defined in both ${seen.get(m[1])}.js and ${s}.js`,
    );
    seen.set(m[1], s);
  }

// Every file the service worker precaches must exist, or offline install fails.
const list = vm.runInNewContext(
  read("sw.js").match(/const ASSETS = (\[.*?\]);/s)[1],
);
for (const f of list)
  assert(
    fs.existsSync(path.join(root, f === "./" ? "index.html" : f)),
    `sw.js lists missing file ${f}`,
  );

console.log(
  `PASS: ${version} - files, script order, parsing, service-worker cache list`,
);
