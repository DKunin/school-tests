import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const rootDirectory = fileURLToPath(new URL("../", import.meta.url));
export const contentDirectory = path.join(rootDirectory, "content");

const requiredLessonFields = [
  "slug",
  "subject",
  "title",
  "grade",
  "duration",
  "description",
  "order"
];

function assertText(value, field, context) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${context}: поле ${field} должно быть непустой строкой`);
  }
}

function assertSlug(value, field, context) {
  assertText(value, field, context);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${context}: поле ${field} должно быть URL-safe slug`);
  }
}

export async function loadCatalog() {
  const subjectsPath = path.join(contentDirectory, "subjects.json");
  const subjects = JSON.parse(await readFile(subjectsPath, "utf8"));
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error("content/subjects.json должен содержать непустой массив");
  }

  const subjectSlugs = new Set();
  for (const subject of subjects) {
    assertSlug(subject.slug, "slug", "Предмет");
    assertText(subject.title, "title", `Предмет ${subject.slug}`);
    assertText(subject.description, "description", `Предмет ${subject.slug}`);
    if (subjectSlugs.has(subject.slug)) {
      throw new Error(`Повторяется предмет ${subject.slug}`);
    }
    subjectSlugs.add(subject.slug);
    subject.lessons = [];

    const subjectDirectory = path.join(contentDirectory, subject.slug);
    let entries = [];
    try {
      entries = await readdir(subjectDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    for (const entry of entries.filter((item) => item.isDirectory())) {
      const lessonDirectory = path.join(subjectDirectory, entry.name);
      const metaPath = path.join(lessonDirectory, "meta.json");
      const lessonPath = path.join(lessonDirectory, "index.html");
      const context = `${subject.slug}/${entry.name}`;
      const lesson = JSON.parse(await readFile(metaPath, "utf8"));

      for (const field of requiredLessonFields) {
        if (!(field in lesson)) throw new Error(`${context}: отсутствует поле ${field}`);
      }
      assertSlug(lesson.slug, "slug", context);
      assertText(lesson.subject, "subject", context);
      assertText(lesson.title, "title", context);
      assertText(lesson.grade, "grade", context);
      assertText(lesson.duration, "duration", context);
      assertText(lesson.description, "description", context);
      if (!Number.isFinite(lesson.order)) throw new Error(`${context}: order должен быть числом`);
      if (lesson.slug !== entry.name) throw new Error(`${context}: slug не совпадает с папкой`);
      if (lesson.subject !== subject.slug) throw new Error(`${context}: указан другой предмет`);
      await access(lessonPath, constants.R_OK);

      subject.lessons.push({ ...lesson, sourceDirectory: lessonDirectory });
    }

    subject.lessons.sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "ru"));
  }

  return subjects;
}
