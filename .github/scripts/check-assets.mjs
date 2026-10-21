import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pages = readFileSync(join(root, ".github", "scripts", "pages.txt"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const referencePattern = /\b(?:href|src)\s*=\s*["'](assets\/[^"'?#]+\.(?:css|js))(?:\?v=([^"']+))?["']/gi;
const versions = new Map();
const failures = [];
let checked = 0;

function withoutCodeSamples(html) {
  return html
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[\s\S]*?<\/code>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

for (const page of pages) {
  const content = withoutCodeSamples(readFileSync(join(root, page), "utf8"));
  for (const match of content.matchAll(referencePattern)) {
    const [, pathname, version] = match;
    checked++;
    if (!version) {
      failures.push(`${page}: ${pathname} is missing ?v=`);
      continue;
    }
    if (!versions.has(version)) versions.set(version, []);
    versions.get(version).push(`${page}: ${pathname}`);
  }
}

if (versions.size > 1) {
  failures.push(`shared assets use mixed versions: ${[...versions.keys()].join(", ")}`);
}
if (versions.size === 0) {
  failures.push("no versioned shared CSS/JS references found");
}

console.log(`Checked ${checked} shared CSS/JS references across ${pages.length} pages using ${[...versions.keys()].join(", ") || "no version"}.`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  console.error(`${failures.length} shared asset version problem(s) found.`);
  process.exit(1);
}
