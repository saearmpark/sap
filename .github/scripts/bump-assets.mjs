import { readFileSync, readdirSync, writeFileSync } from "node:fs";

// 공용 자산 캐시 버전(labels-N)을 한 단계 올립니다.
// 사용법: node .github/scripts/bump-assets.mjs [--dry-run]
const dryRun = process.argv.includes("--dry-run");
const root = process.cwd();
const htmlFiles = readdirSync(root).filter((file) => file.endsWith(".html"));
const files = [...htmlFiles, "sw.js"];
const versions = new Set();

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const pattern = file === "sw.js"
    ? /CACHE\s*=\s*"sap-shell-(labels-\d+)"/g
    : /\?v=(labels-\d+)/g;
  for (const match of content.matchAll(pattern)) {
    versions.add(Number(match[1].slice("labels-".length)));
  }
}

if (versions.size === 0) {
  console.error("labels-N 버전을 찾지 못했습니다.");
  process.exit(1);
}
if (versions.size > 1) {
  console.error(`버전이 섞여 있습니다: ${[...versions].sort((a, b) => a - b).join(", ")}`);
  console.error("먼저 node .github/scripts/check-assets.mjs로 버전을 맞추세요.");
  process.exit(1);
}

const current = [...versions][0];
const next = current + 1;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  let updated = content.replaceAll(`labels-${current}`, `labels-${next}`);

  // manual-connect.html의 "다음 버전" 안내는 방금 올린 버전보다 하나 더 커야 합니다.
  if (file === "manual-connect.html") {
    updated = updated
      .replace(/다음 값인 <code>labels-\d+<\/code>/g, `다음 값인 <code>labels-${next + 1}</code>`)
      .replace(/다음에 공용 파일을 고칠 때 <code>labels-\d+<\/code>/g, `다음에 공용 파일을 고칠 때 <code>labels-${next + 1}</code>`)
      .replace(/캐시 이름도 <code>sap-shell-labels-\d+<\/code>로 함께/g, `캐시 이름도 <code>sap-shell-labels-${next + 1}</code>로 함께`);
  }

  if (updated === content) continue;
  if (!dryRun) writeFileSync(file, updated, "utf8");
  console.log(`${dryRun ? "[dry-run] " : ""}${file}: labels-${current} -> labels-${next}`);
}

console.log(`${dryRun ? "확인" : "완료"}: labels-${current} -> labels-${next} (${files.length}개 파일 검사)`);
console.log("다음: node .github/scripts/check-assets.mjs");
