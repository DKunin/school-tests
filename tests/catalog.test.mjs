import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { contentDirectory, loadCatalog } from "../scripts/catalog.mjs";

test("каталог содержит полный упорядоченный список предметов и первый урок", async () => {
  const subjects = await loadCatalog();
  assert.deepEqual(subjects.map(({ title }) => title), [
    "История",
    "Литература",
    "Математика",
    "Русский язык",
    "Биология",
    "География",
    "Английский",
    "Информатика"
  ]);
  const math = subjects.find(({ slug }) => slug === "math");
  const initialMathSlugs = ["trigonometriya", "proportsiya"];
  assert.deepEqual(
    math.lessons.map(({ slug }) => slug).filter((slug) => initialMathSlugs.includes(slug)),
    initialMathSlugs,
  );
});

test("каталог включает уроки по истории и литературе", async () => {
  const subjects = await loadCatalog();
  const lessonsBySubject = Object.fromEntries(
    subjects.map(({ slug, lessons }) => [slug, lessons.map((lesson) => lesson.slug)])
  );
  assert.ok(lessonsBySubject.history.includes("rasselenie-slavyan"));
  assert.ok(lessonsBySubject.literature.includes("uznik"));
});

test("каталог содержит все папки уроков без дублей и сохраняет порядок", async () => {
  const subjects = await loadCatalog();
  const sourcePaths = (await readdir(contentDirectory, { recursive: true }))
    .filter((file) => path.basename(file) === "meta.json")
    .map((file) => path.dirname(file).split(path.sep).join("/"))
    .sort();
  const catalogPaths = subjects.flatMap((subject) =>
    subject.lessons.map((lesson) => `${subject.slug}/${lesson.slug}`)
  ).sort();
  assert.deepEqual(catalogPaths, sourcePaths);
  for (const subject of subjects) {
    const slugs = subject.lessons.map(({ slug }) => slug);
    assert.equal(new Set(slugs).size, slugs.length);
    for (let index = 1; index < subject.lessons.length; index += 1) {
      const previous = subject.lessons[index - 1];
      const current = subject.lessons[index];
      assert.ok(
        previous.order < current.order ||
          (previous.order === current.order && previous.title.localeCompare(current.title, "ru") <= 0),
        `${subject.slug}: нарушен порядок уроков`,
      );
    }
  }
});

test("каждый урок содержит интерактивную самопроверку", async () => {
  const subjects = await loadCatalog();
  const lessons = subjects.flatMap(({ lessons }) => lessons);
  assert.ok(lessons.length > 0);
  for (const lesson of lessons) {
    const html = await readFile(path.join(lesson.sourceDirectory, "index.html"), "utf8");
    assert.match(html, /id="quiz"/, lesson.slug);
    assert.match(html, /const questions\s*=\s*\[/, lesson.slug);
    assert.match(html, /addEventListener/, lesson.slug);
    assert.match(html, /Пройти ещё раз|Ещё раз|Начать заново/, lesson.slug);
  }
});

test("production-конфигурация закрепляет домен и атомарный выпуск", async () => {
  const nginx = await readFile(new URL("../ops/nginx/school.kunini.ru.conf", import.meta.url), "utf8");
  const deploy = await readFile(new URL("../ops/deploy.sh", import.meta.url), "utf8");
  assert.match(nginx, /server_name school\.kunini\.ru;/);
  assert.match(nginx, /root \/var\/apps\/school-tests\/current;/);
  assert.match(nginx, /letsencrypt\/live\/school\.kunini\.ru\/fullchain\.pem/);
  assert.match(deploy, /git pull --ff-only origin main/);
  assert.match(deploy, /mv -Tf .*current\.next.*current/);
  assert.match(deploy, /restored .*previous state/);
});
