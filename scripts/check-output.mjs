import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { loadCatalog, rootDirectory } from "./catalog.mjs";

const outputDirectory = path.join(rootDirectory, "dist");
const configuredBasePath = (process.env.SITE_BASE_PATH || "").trim().replace(/^\/+|\/+$/g, "");
const sitePrefix = configuredBasePath ? `/${configuredBasePath}` : "";
const subjects = await loadCatalog();
const expectedFiles = [
  "index.html",
  "assets/favicon.svg",
  "assets/site.css",
  ...subjects.map((subject) => `subjects/${subject.slug}/index.html`),
  ...subjects.flatMap((subject) => subject.lessons.map((lesson) => `${subject.slug}/${lesson.slug}/index.html`))
];

for (const relativePath of expectedFiles) {
  await access(path.join(outputDirectory, relativePath), constants.R_OK);
}

const home = await readFile(path.join(outputDirectory, "index.html"), "utf8");
for (const subject of subjects) {
  if (!home.includes(subject.title)) throw new Error(`На главной нет предмета ${subject.title}`);
  for (const lesson of subject.lessons) {
    if (!home.includes(`${sitePrefix}/${lesson.subject}/${lesson.slug}/`)) throw new Error(`На главной нет ссылки на ${lesson.title}`);
  }
}

console.log(`Проверено: ${expectedFiles.length} файлов сборки.`);
