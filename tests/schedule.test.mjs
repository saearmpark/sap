import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";

// common.js는 브라우저 전용 코드라, 순수 계산 함수만 잘라서 검사합니다.
const source = readFileSync(new URL("../assets/common.js", import.meta.url), "utf8");

function extract(name) {
  const pattern = new RegExp(`function\\s+${name}\\s*\\(`);
  const match = pattern.exec(source);
  assert.ok(match, `${name} 함수를 찾지 못했습니다.`);
  let index = source.indexOf("{", match.index);
  let depth = 0;
  for (let cursor = index; cursor < source.length; cursor += 1) {
    if (source[cursor] === "{") depth += 1;
    else if (source[cursor] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, cursor + 1);
    }
  }
  throw new Error(`${name} 함수의 끝을 찾지 못했습니다.`);
}

const names = ["localDate", "addDays", "addMonths", "dayDiff", "monthDiff", "advanceToRange", "expandOccurrences"];
const sandbox = createContext({});
runInContext(`${names.map(extract).join("\n")}\nthis.calc = { localDate, addDays, addMonths, expandOccurrences };`, sandbox);
const { localDate, addDays, addMonths, expandOccurrences } = sandbox.calc;

const event = (overrides) => ({
  id: 1,
  title: "테스트",
  start_date: "2026-01-01",
  end_date: "2026-01-01",
  repeat_rule: "none",
  ...overrides,
});

test("날짜 계산은 월말을 넘기지 않습니다", () => {
  assert.equal(localDate(new Date(2026, 0, 2)), "2026-01-02");
  assert.equal(addDays("2026-01-01", 1), "2026-01-02");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
});

test("반복이 없는 일정은 범위와 겹칠 때만 포함합니다", () => {
  assert.equal(expandOccurrences([event()], "2026-01-02", "2026-01-03").length, 0);
  assert.equal(expandOccurrences([event()], "2026-01-01", "2026-01-01").length, 1);
});

test("매일 반복은 범위 안의 날짜만 만듭니다", () => {
  const rows = expandOccurrences([event({ start_date: "2026-01-01", end_date: "2026-01-01", repeat_rule: "daily" })], "2026-01-03", "2026-01-05");
  assert.equal(rows.map((row) => row.start_date).join(","), "2026-01-03,2026-01-04,2026-01-05");
});

test("매주 반복은 7일 간격을 지킵니다", () => {
  const rows = expandOccurrences([event({ start_date: "2026-01-01", end_date: "2026-01-01", repeat_rule: "weekly" })], "2026-01-10", "2026-01-20");
  assert.equal(rows.map((row) => row.start_date).join(","), "2026-01-15");
});

test("매월 반복은 짧은 달에 맞춰 줄어듭니다", () => {
  const rows = expandOccurrences([event({ start_date: "2026-01-31", end_date: "2026-01-31", repeat_rule: "monthly" })], "2026-03-01", "2026-03-31");
  assert.equal(rows.map((row) => row.start_date).join(","), "2026-03-31");
});

test("오래전에 시작한 반복 일정도 현재 범위까지 계산합니다", () => {
  const rows = expandOccurrences([event({ start_date: "2020-01-01", end_date: "2020-01-01", repeat_rule: "daily" })], "2026-01-01", "2026-01-03");
  assert.equal(rows.map((row) => row.start_date).join(","), "2026-01-01,2026-01-02,2026-01-03");
});
