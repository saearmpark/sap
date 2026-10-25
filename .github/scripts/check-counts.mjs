import { readFileSync } from "node:fs";

// 게임 수가 페이지·문서·검색 설명에서 어긋나지 않는지 확인합니다.
const read = (file) => readFileSync(file, "utf8");
const game = read("game.html");
const readme = read("README.md");
const search = read("search.html");

const registered = new Set([...game.matchAll(/registerGame\("(panel-[a-z0-9-]+)"/g)].map((match) => match[1]));
const listed = new Set([...game.matchAll(/data-target="(panel-[a-z0-9-]+)"/g)].map((match) => match[1]));
const panels = new Set([...game.matchAll(/<div id="(panel-[a-z0-9-]+)"/g)].map((match) => match[1]));

const failures = [];
const count = registered.size;

if (listed.size !== count) {
  failures.push(`게임 목록 ${listed.size}개가 등록된 게임 ${count}개와 다릅니다.`);
}
for (const id of registered) {
  if (!listed.has(id)) failures.push(`게임 목록에 ${id}가 없습니다.`);
  if (!panels.has(id)) failures.push(`${id} 패널이 없습니다.`);
}

const sources = [
  { file: "game.html", text: game, pattern: /(\d+)개의 실습 게임/g },
  { file: "README.md", text: readme, pattern: /(\d+)개의 실습 게임/g },
  { file: "search.html", text: search, pattern: /게임 (\d+)개/g },
];
for (const source of sources) {
  const numbers = [...source.text.matchAll(source.pattern)].map((match) => Number(match[1]));
  if (!numbers.length) failures.push(`${source.file}에서 게임 수 표기를 찾지 못했습니다.`);
  for (const number of numbers) {
    if (number !== count) failures.push(`${source.file}: ${number}개로 표기됐지만 실제 등록은 ${count}개입니다.`);
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Checked ${count} games across game.html, README.md, and search.html.`);
