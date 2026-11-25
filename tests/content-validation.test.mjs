import assert from "node:assert/strict";
import test from "node:test";
import { validateAllLessons, validateLessonHtml } from "../scripts/validate-content.mjs";

test("все уроки проходят единые ограничения публикации", async () => {
  const validated = await validateAllLessons();
  assert.equal(validated.length, 3);
  assert.deepEqual(validated.map(({ questionCount }) => questionCount), [6, 5, 6]);
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
