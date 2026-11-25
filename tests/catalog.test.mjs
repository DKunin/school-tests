import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadCatalog } from "../scripts/catalog.mjs";

test("каталог содержит три предмета и первый урок", async () => {
  const subjects = await loadCatalog();
  assert.deepEqual(subjects.map(({ slug }) => slug), ["math", "russian", "biology"]);
  assert.equal(subjects[0].lessons.length, 1);
  assert.equal(subjects[0].lessons[0].slug, "trigonometriya");
});

test("slug урока уникален внутри предмета", async () => {
  const subjects = await loadCatalog();
  for (const subject of subjects) {
    const slugs = subject.lessons.map(({ slug }) => slug);
    assert.equal(new Set(slugs).size, slugs.length);
  }
});

test("урок содержит интерактивную самопроверку", async () => {
  const subjects = await loadCatalog();
  const lesson = subjects[0].lessons[0];
  const html = await readFile(path.join(lesson.sourceDirectory, "index.html"), "utf8");
  assert.match(html, /id="quiz"/);
  assert.match(html, /const questions = \[/);
  assert.match(html, /addEventListener/);
});
