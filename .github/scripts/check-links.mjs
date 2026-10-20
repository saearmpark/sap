import { readFileSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";

const root = process.cwd();
const pages = readFileSync(join(root, ".github", "scripts", "pages.txt"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

const rootPages = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
  .map((entry) => entry.name)
  .sort();

const files = new Set();
function collectFiles(directory, relativeDirectory = "") {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      collectFiles(join(directory, entry.name), relativePath);
    } else if (entry.isFile()) {
      files.add(relativePath);
    }
  }
}
collectFiles(root);

const failures = [];
const listedPages = new Set(pages);
for (const page of rootPages) {
  if (!listedPages.has(page)) failures.push(`${page}: page is missing from .github/scripts/pages.txt`);
}
for (const page of pages) {
  if (!files.has(page)) failures.push(`${page}: listed in pages.txt but the file does not exist`);
}
for (const page of new Set(pages.filter((page, index) => pages.indexOf(page) !== index))) {
  failures.push(`${page}: duplicate entry in pages.txt`);
}

const idsByPage = new Map();
function contentOnly(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[\s\S]*?<\/code>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}
function idsFor(page) {
  if (idsByPage.has(page)) return idsByPage.get(page);
  const html = contentOnly(readFileSync(join(root, page), "utf8"));
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  for (const [id, count] of counts) {
    if (count > 1) failures.push(`${page}: duplicate id="${id}"`);
  }
  const result = new Set(ids);
  idsByPage.set(page, result);
  return result;
}
function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

let checkedLinks = 0;
let checkedAnchors = 0;

for (const page of pages) {
  if (!files.has(page)) continue;
  const html = readFileSync(join(root, page), "utf8");
  idsFor(page);
  const content = contentOnly(html);

  for (const match of content.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    const value = decode(match[1].replace(/&amp;/g, "&").trim());
    if (!value || value.startsWith("#")) continue;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) continue;

    const hashIndex = value.indexOf("#");
    const hash = hashIndex >= 0 ? decode(value.slice(hashIndex + 1)) : "";
    const beforeHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
    const pathname = beforeHash.split("?")[0];
    if (!pathname) {
      if (hash) {
        checkedAnchors++;
        if (!idsFor(page).has(hash)) failures.push(`${page}: missing anchor "#${hash}"`);
      }
      continue;
    }

    checkedLinks++;
    const target = pathname.startsWith("/")
      ? pathname.replace(/^\/+/, "")
      : posix.normalize(posix.join(posix.dirname(page), pathname));
    const targetFile = target.endsWith("/") ? `${target}index.html` : target;
    if (targetFile.startsWith("../") || !files.has(targetFile)) {
      failures.push(`${page}: links to missing file "${value}"`);
      continue;
    }

    if (hash && targetFile.endsWith(".html")) {
      checkedAnchors++;
      if (!idsFor(targetFile).has(hash)) {
        failures.push(`${page}: links to missing anchor "${value}"`);
      }
    }
  }
}

console.log(`Checked ${checkedLinks} local links and ${checkedAnchors} anchors across ${pages.length} pages.`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  console.error(`${failures.length} link or page-list problem(s) found.`);
  process.exit(1);
}
