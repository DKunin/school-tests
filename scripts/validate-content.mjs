import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./catalog.mjs";

export const MAX_LESSON_HTML_BYTES = 500_000;

export function validateLessonHtml({ lesson, html }) {
  const context = `${lesson.subject}/${lesson.slug}`;
  const byteLength = Buffer.byteLength(html, "utf8");
  if (byteLength > MAX_LESSON_HTML_BYTES) {
    throw new Error(`${context}: HTML превышает ${MAX_LESSON_HTML_BYTES} байт`);
  }

  requireMatch(html, /^<!doctype html>/i, context, "нет HTML doctype");
  requireMatch(html, /<html\b[^>]*\blang=["']ru["']/i, context, "html должен иметь lang=ru");
  requireMatch(html, /<meta\b[^>]*\bcharset=["']?utf-8/i, context, "нет UTF-8 charset");
  requireMatch(html, /<meta\b[^>]*\bname=["']viewport["']/i, context, "нет viewport");
  requireMatch(html, /<meta\b[^>]*http-equiv=["']Content-Security-Policy["']/i, context, "нет CSP");
  for (const directive of ["default-src 'none'", "style-src 'unsafe-inline'", "script-src 'unsafe-inline'", "base-uri 'none'", "form-action 'none'"]) {
    if (!html.includes(directive)) throw new Error(`${context}: CSP не содержит ${directive}`);
  }

  requireMatch(html, /<main\b/i, context, "нет main");
  requireMatch(html, /<h1\b/i, context, "нет h1");
  requireMatch(html, /id=["']quiz["']/i, context, "нет блока самопроверки #quiz");
  requireMatch(html, /(?::focus-visible|:focus\s*\{)/i, context, "нет видимого keyboard focus");
  requireMatch(html, /(?:aria-live=["']polite["']|role=["']status["'])/i, context, "нет доступной обратной связи");
  requireMatch(html, /addEventListener\s*\(/, context, "нет интерактивного поведения");
  requireMatch(html, /Пройти ещё раз|Ещё раз|Начать заново/, context, "нет состояния перезапуска");

  const questionCount = countQuestionObjects(html);
  if (questionCount < 5 || questionCount > 7) {
    throw new Error(`${context}: самопроверка должна содержать 5–7 вопросов, найдено ${questionCount}`);
  }

  const forbiddenPatterns = [
    [/<script\b[^>]*\bsrc\s*=/i, "внешние script src запрещены"],
    [/<link\b[^>]*\bhref\s*=\s*["']https?:/i, "внешние стили и шрифты запрещены"],
    [/<(?:img|source|video|audio)\b[^>]*\bsrc\s*=\s*["']https?:/i, "внешние медиа запрещены"],
    [/@import\s+(?:url\()?\s*["']?https?:/i, "внешние CSS import запрещены"],
    [/url\(\s*["']?https?:/i, "внешние CSS assets запрещены"],
    [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/, "сетевые запросы из урока запрещены"],
    [/navigator\.sendBeacon\s*\(/, "отправка аналитики запрещена"],
    [/<(?:iframe|object|embed)\b/i, "встроенные внешние документы запрещены"],
  ];
  for (const [pattern, message] of forbiddenPatterns) {
    if (pattern.test(html)) throw new Error(`${context}: ${message}`);
  }

  return { byteLength, questionCount };
}

export async function validateAllLessons() {
  const subjects = await loadCatalog();
  const validated = [];
  for (const subject of subjects) {
    for (const lesson of subject.lessons) {
      const html = await readFile(path.join(lesson.sourceDirectory, "index.html"), "utf8");
      validated.push({
        subject: lesson.subject,
        slug: lesson.slug,
        ...validateLessonHtml({ lesson, html }),
      });
    }
  }
  return validated;
}

function requireMatch(value, pattern, context, message) {
  if (!pattern.test(value)) throw new Error(`${context}: ${message}`);
}

function countQuestionObjects(source) {
  const declaration = source.search(/\bconst\s+questions\s*=\s*\[/);
  if (declaration < 0) return 0;
  const start = source.indexOf("[", declaration);
  let bracketDepth = 0;
  let braceDepth = 0;
  let quote = "";
  let escaped = false;
  let count = 0;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "[") bracketDepth += 1;
    else if (character === "]") {
      bracketDepth -= 1;
      if (bracketDepth === 0) return count;
    } else if (character === "{") {
      if (bracketDepth === 1 && braceDepth === 0) count += 1;
      braceDepth += 1;
    } else if (character === "}") braceDepth -= 1;
  }
  return 0;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  const validated = await validateAllLessons();
  console.log(`Проверено уроков: ${validated.length}.`);
}
