import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 검색·공유 메타데이터, sitemap, robots 설정이 서로 어긋나지 않는지 확인합니다.
const root = process.cwd();
const base = "https://saearmpark.github.io/sap/";
const noindexPages = new Set(["admin.html", "mypage.html", "login.html", "offline.html", "404.html"]);
const pages = readFileSync(join(root, ".github", "scripts", "pages.txt"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));
const failures = [];

function fail(message) {
  failures.push(message);
}

function contentWithoutCode(html) {
  return html
    .replace(/<pre\b[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[\s\S]*?<\/code>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

for (const page of pages) {
  const html = contentWithoutCode(readFileSync(join(root, page), "utf8"));
  for (const [name, pattern] of [
    ["description", /<meta\s+name="description"\s+content="[^"]+"/i],
    ["canonical", /<link\s+rel="canonical"\s+href="[^"]+"/i],
    ["og:title", /<meta\s+property="og:title"\s+content="[^"]+"/i],
    ["twitter:card", /<meta\s+name="twitter:card"\s+content="[^"]+"/i]
  ]) {
    if (!pattern.test(html)) fail(`${page}: missing ${name}`);
  }

  const canonical = (html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i) || [])[1] || "";
  if (canonical && !canonical.startsWith(base)) {
    fail(`${page}: canonical does not start with ${base} (${canonical})`);
  }

  const noindex = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html);
  if (noindexPages.has(page) && !noindex) fail(`${page}: private page is missing noindex`);
  if (!noindexPages.has(page) && noindex) fail(`${page}: public page unexpectedly has noindex`);
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
if (locations.length === 0) fail("sitemap.xml: no <loc> entries");
if (new Set(locations).size !== locations.length) fail("sitemap.xml: duplicate URLs");

const sitemapPages = new Set();
for (const location of locations) {
  if (!location.startsWith(base)) {
    fail(`sitemap.xml: URL is outside ${base} (${location})`);
    continue;
  }
  const relative = location.slice(base.length).split(/[?#]/)[0];
  const file = relative === "" ? "index.html" : relative;
  if (!existsSync(join(root, file))) {
    fail(`sitemap.xml: ${location} does not match a file`);
    continue;
  }
  if (sitemapPages.has(file)) fail(`sitemap.xml: ${file} is listed more than once`);
  sitemapPages.add(file);
}

for (const page of pages) {
  if (noindexPages.has(page)) {
    if (sitemapPages.has(page)) fail(`sitemap.xml: private page ${page} must not be listed`);
    continue;
  }
  if (!sitemapPages.has(page)) fail(`sitemap.xml: public page ${page} is missing`);
}

const robots = readFileSync(join(root, "robots.txt"), "utf8");
if (!robots.includes(`Sitemap: ${base}sitemap.xml`)) {
  fail("robots.txt: sitemap URL is missing");
}
for (const page of noindexPages) {
  if (page === "404.html") continue;
  if (!robots.includes(`Disallow: /sap/${page}`)) {
    fail(`robots.txt: ${page} is not disallowed`);
  }
}

console.log(`Checked metadata for ${pages.length} pages, ${locations.length} sitemap URLs, and robots.txt.`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  console.error(`${failures.length} metadata or sitemap problem(s) found.`);
  process.exit(1);
}
