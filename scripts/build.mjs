import { cp, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCatalog, rootDirectory } from "./catalog.mjs";

const outputDirectory = path.join(rootDirectory, "dist");
const configuredBasePath = (process.env.SITE_BASE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
const sitePath = (relativePath = "") => {
  const parts = [configuredBasePath, relativePath.replace(/^\/+|\/+$/g, "")].filter(Boolean);
  const value = `/${parts.join("/")}`;
  return relativePath.endsWith("/") || relativePath === ""
    ? (value.endsWith("/") ? value : `${value}/`)
    : value;
};

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const mark = `
  <svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="currentColor" opacity=".22"/>
    <path d="M8 23 23 8v15H8Z" fill="currentColor"/>
  </svg>`;

function documentTemplate({ title, description, content }) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="${sitePath("assets/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${sitePath("assets/site.css")}">
</head>
<body>
  <a class="skip-link" href="#content">К содержанию</a>
  <header class="site-header">
    <div class="site-wrap header-inner">
      <a class="brand" href="${sitePath()}">${mark}<span>Школьные темы</span></a>
      <a class="header-link" href="${sitePath()}#subjects">Все предметы</a>
    </div>
  </header>
  ${content}
  <footer class="site-footer"><div class="site-wrap">Новые темы добавляются постепенно.</div></footer>
</body>
</html>\n`;
}

function trianglePreview() {
  return `<svg class="lesson-preview" viewBox="0 0 260 150" role="img" aria-label="Прямоугольный треугольник со сторонами 3, 4 и 5">
    <path d="M35 125H210V25Z" fill="#e7efe2"/>
    <path d="M35 125H210" stroke="#14624f" stroke-width="4"/>
    <path d="M210 125V25" stroke="#ad4325" stroke-width="4"/>
    <path d="M35 125 210 25" stroke="#6443a6" stroke-width="4"/>
    <path d="M195 125v-15h15" fill="none" stroke="#60736c" stroke-width="2"/>
    <text x="113" y="145" fill="#14624f">4 м</text>
    <text x="220" y="83" fill="#ad4325">3 м</text>
    <text x="92" y="66" fill="#6443a6">5 м</text>
  </svg>`;
}

function lessonRow(lesson, includePreview = false) {
  const url = sitePath(`${lesson.subject}/${lesson.slug}/`);
  return `<article class="lesson-row">
    <div class="lesson-copy">
      <h3><a href="${url}">${escapeHtml(lesson.title)}</a></h3>
      <p class="lesson-meta">${escapeHtml(lesson.grade)} · ${escapeHtml(lesson.duration)}</p>
      <p>${escapeHtml(lesson.description)}</p>
    </div>
    ${includePreview ? `<div class="preview-frame">${trianglePreview()}</div>` : ""}
    <a class="lesson-action" href="${url}">Начать урок <span aria-hidden="true">→</span></a>
  </article>`;
}

function homePage(subjects) {
  const subjectSections = subjects.map((subject) => {
    const lessons = subject.lessons.length
      ? subject.lessons.map((lesson, index) => lessonRow(lesson, subject.slug === "math" && index === 0)).join("\n")
      : '<p class="empty-state">Уроки скоро появятся</p>';
    return `<section class="subject-band" aria-labelledby="subject-${subject.slug}">
      <h2 id="subject-${subject.slug}"><a href="${sitePath(`subjects/${subject.slug}/`)}">${escapeHtml(subject.title)}</a></h2>
      ${lessons}
    </section>`;
  }).join("\n");

  return documentTemplate({
    title: "Школьные темы",
    description: "Короткие наглядные уроки с примерами и самопроверкой.",
    content: `<main class="site-wrap" id="content">
      <section class="catalog-hero">
        <h1>Выбери тему</h1>
        <p>Короткие наглядные уроки с примерами и самопроверкой.</p>
      </section>
      <div class="subject-list" id="subjects">${subjectSections}</div>
    </main>`
  });
}

function subjectPage(subject) {
  const lessons = subject.lessons.length
    ? subject.lessons.map((lesson) => lessonRow(lesson, subject.slug === "math")).join("\n")
    : `<div class="subject-empty"><p>Уроки скоро появятся.</p><a href="${sitePath()}">Вернуться ко всем предметам</a></div>`;

  return documentTemplate({
    title: `${subject.title} — Школьные темы`,
    description: subject.description,
    content: `<main class="site-wrap" id="content">
      <nav class="breadcrumbs" aria-label="Хлебные крошки"><a href="${sitePath()}">Все предметы</a><span aria-hidden="true">/</span><span>${escapeHtml(subject.title)}</span></nav>
      <section class="subject-hero"><h1>${escapeHtml(subject.title)}</h1><p>${escapeHtml(subject.description)}</p></section>
      <section class="subject-band subject-band--page" aria-label="Уроки">${lessons}</section>
    </main>`
  });
}

async function build() {
  const subjects = await loadCatalog();
  await mkdir(outputDirectory, { recursive: true });
  await cp(path.join(rootDirectory, "assets"), path.join(outputDirectory, "assets"), { recursive: true, force: true });
  await writeFile(path.join(outputDirectory, "index.html"), homePage(subjects), "utf8");

  for (const subject of subjects) {
    const subjectOutput = path.join(outputDirectory, "subjects", subject.slug);
    await mkdir(subjectOutput, { recursive: true });
    await writeFile(path.join(subjectOutput, "index.html"), subjectPage(subject), "utf8");

    for (const lesson of subject.lessons) {
      const lessonOutput = path.join(outputDirectory, lesson.subject, lesson.slug);
      await mkdir(lessonOutput, { recursive: true });
      await cp(path.join(lesson.sourceDirectory, "index.html"), path.join(lessonOutput, "index.html"), { force: true });
    }
  }

  await writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8");
  const lessonCount = subjects.reduce((total, subject) => total + subject.lessons.length, 0);
  console.log(`Собрано: предметов — ${subjects.length}, уроков — ${lessonCount}.`);
}

await build();
