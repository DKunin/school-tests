import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { contentDirectory } from "../scripts/catalog.mjs";
import { validateAllLessons, validateLessonHtml } from "../scripts/validate-content.mjs";

test("все уроки проходят единые ограничения публикации", async () => {
  const validated = await validateAllLessons();
  const sourcePaths = (await readdir(contentDirectory, { recursive: true }))
    .filter((file) => path.basename(file) === "meta.json")
    .map((file) => path.dirname(file).split(path.sep).join("/"))
    .sort();
  assert.deepEqual(
    validated.map(({ subject, slug }) => `${subject}/${slug}`).sort(),
    sourcePaths,
  );
  const originalQuestionCounts = new Map([
    ["history/rasselenie-slavyan", 6],
    ["literature/uznik", 5],
    ["math/trigonometriya", 6],
    ["math/proportsiya", 6],
  ]);
  for (const [lessonPath, expectedCount] of originalQuestionCounts) {
    const lesson = validated.find(({ subject, slug }) => `${subject}/${slug}` === lessonPath);
    assert.ok(lesson, `Не проверен существующий урок ${lessonPath}`);
    assert.equal(lesson.questionCount, expectedCount, lessonPath);
  }
  for (const lesson of validated) {
    assert.ok(Number.isInteger(lesson.questionCount) && lesson.questionCount >= 5 && lesson.questionCount <= 7,
      `${lesson.subject}/${lesson.slug}: требуется 5–7 вопросов`);
  }
});

test("валидатор отклоняет внешние скрипты", () => {
  const html = validLessonHtml().replace("</head>", '<script src="https://example.com/app.js"></script></head>');
  assert.throws(
    () => validateLessonHtml({ lesson: { subject: "biology", slug: "cells" }, html }),
    /внешние script src запрещены/,
  );
});

test("валидатор требует от пяти до семи вопросов", () => {
  const html = validLessonHtml().replace(/\{ q: "5"[^}]+},/, "");
  assert.throws(
    () => validateLessonHtml({ lesson: { subject: "biology", slug: "cells" }, html }),
    /5–7 вопросов, найдено 4/,
  );
});

function validLessonHtml() {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<style>:focus-visible { outline: 2px solid; }</style></head><body><main><h1>Клетка</h1>
<section id="quiz"><p role="status"></p><button>Пройти ещё раз</button></section></main>
<script>const questions = [
{ q: "1", hint: "h", explanation: "e" },
{ q: "2", hint: "h", explanation: "e" },
{ q: "3", hint: "h", explanation: "e" },
{ q: "4", hint: "h", explanation: "e" },
{ q: "5", hint: "h", explanation: "e" },
]; document.querySelector("button").addEventListener("click", () => {});</script></body></html>`;
}
