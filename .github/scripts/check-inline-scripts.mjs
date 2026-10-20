import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const pages = readFileSync(join(root, ".github", "scripts", "pages.txt"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

let checked = 0;
let failures = 0;

for (const page of pages) {
  const html = readFileSync(join(root, page), "utf8");
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    const code = match[2];
    if (!code.trim()) continue;
    checked++;
    try {
      new Function(code);
    } catch (error) {
      failures++;
      const line = html.slice(0, match.index).split(/\r?\n/).length;
      console.error(`${page}:${line} inline script failed: ${error.message}`);
    }
  }
}

console.log(`Checked ${checked} inline scripts across ${pages.length} pages.`);
if (failures > 0) {
  console.error(`${failures} inline script(s) failed to parse.`);
  process.exit(1);
}
