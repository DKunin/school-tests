# Instructions for lesson authors

These instructions apply to the entire repository.

## Canonical reference

Treat `content/math/trigonometriya/index.html` as the canonical lesson. New lessons must feel like another chapter of the same product: concise Russian copy, one concrete visual metaphor, direct manipulation, worked examples, and an interactive self-check. Reuse its information density, visual language, accessibility level, responsive behavior, and feedback model; do not mechanically copy its trigonometry-specific layout.

## Required lesson package

Create each lesson in `content/<subject-slug>/<lesson-slug>/` with exactly:

- `meta.json` containing `slug`, `subject`, `title`, `grade`, `duration`, `description`, and numeric `order`;
- a standalone `index.html` that works without a build-time framework or network access.

Use only subjects declared in `content/subjects.json`. Keep slugs lowercase, URL-safe, and identical to their directory names. Link back to the catalogue with `../../` so the page works both at the custom domain root and on GitHub Pages.

## Lesson structure

Every lesson must include:

1. a short title and one-paragraph promise in language appropriate for the stated grade;
2. three to five focused explanation steps, each answering one question;
3. at least one accurate, code-native visual model using HTML/CSS/SVG;
4. one meaningful interaction that changes the model, not decorative animation;
5. at least one worked example tied to the visual model;
6. a self-check with five to seven questions;
7. a useful hint after a wrong answer and a brief explanation after the correct answer;
8. completion and restart states.

Keep the lesson tight. Remove filler introductions, repeated definitions, generic motivational copy, ornamental cards, fake metrics, and interactions that do not teach the concept. Prefer one strong model over several unrelated illustrations.

## Visual and interaction system

Match the canonical paper/mint design: warm paper background, dark-green text, pale-mint teaching surfaces, lime step accents, restrained semantic colors, moderate editorial headings, thin borders, and generous whitespace. Headings must establish hierarchy without dominating the viewport: follow the canonical responsive type scale and avoid page titles larger than roughly `4.5rem` on desktop or `3rem` on mobile. Keep controls and explanatory text code-native. Use the same component families for steps, diagrams, selectors, hints, quiz options, feedback, and next/restart actions.

Requirements:

- responsive from 390 px mobile through desktop without horizontal overflow;
- fully usable with keyboard and visible `:focus-visible` states;
- semantic headings, labelled controls, and meaningful SVG accessible names;
- `prefers-reduced-motion` support when motion is present;
- no third-party scripts, fonts, trackers, remote images, accounts, or answer uploads;
- a restrictive CSP matching the canonical lesson;
- correct Russian typography and decimal formatting;
- no silent failures or inert controls.

## Content quality

Verify every fact, formula, date, term, example, answer, and explanation. Keep scope to one teachable concept. Introduce terminology only after the visual or concrete idea is clear. Wrong-answer hints should guide the next thought without revealing the answer immediately.

## Workflow and acceptance

Before finishing:

1. add the lesson metadata and page;
2. update `CHANGELOG.md` in Russian;
3. run `npm run check`;
4. serve the site and verify catalogue navigation, desktop, 390 px mobile, keyboard use, the main interaction, wrong/correct quiz feedback, completion, and restart;
5. inspect the browser console and leave no errors or warnings;
6. review the final diff and keep it limited to the lesson and required catalogue/docs changes.

Do not commit, push, or deploy unless the user explicitly asks. `Hammer!` means commit, push, and deploy through the established workflow.
