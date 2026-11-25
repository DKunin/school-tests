import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadCatalog } from "../scripts/catalog.mjs";

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
  assert.equal(math.lessons.length, 1);
  assert.equal(math.lessons[0].slug, "trigonometriya");
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
  const lesson = subjects.find(({ slug }) => slug === "math").lessons[0];
  const html = await readFile(path.join(lesson.sourceDirectory, "index.html"), "utf8");
  assert.match(html, /id="quiz"/);
  assert.match(html, /const questions = \[/);
  assert.match(html, /addEventListener/);
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
