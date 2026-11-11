# Learning content

Version-controlled Markdown lessons and quiz definitions for the discrete
mathematics modules. The seed script (`backend/src/seed.py`) loads this
directory into PostgreSQL. Only the lesson images are read at request time.

## Layout

```text
content/
  09-proofs/                 one folder per module: NN-<module-key>
    module.yaml              title and description
    01-proofs.md             one file per lesson: NN-<lesson-key>.md
    02-proofs-continued.md
    quiz.yaml                optional; one quiz per module
    images/                  optional; referenced from lessons
```

The `NN-` prefix sets the order and the rest of the name is the stable key the
seed matches rows by. Renaming a module key creates a new module,
so treat keys as permanent. Prefixes determine the order of newly inserted modules.

Keys are lowercase words joined by hyphens. Module prefixes must be unique
across the directory, and lesson prefixes unique within a module.

## Modules

`module.yaml` has exactly two fields:

```yaml
title: Proofs
description: >-
  Write structured two-column proofs: direct proofs, contradiction, and more.
```

## Lessons

A lesson is Markdown with a front matter block:

```markdown
---
title: Proofs Continued
video_url: https://www.youtube.com/watch?v=vUmOQp2vlJw
---

## Proof by contradiction

If $x^2$ is odd then $x$ is odd, because ...

$$
P \rightarrow Q \equiv \neg(P \land \neg Q)
$$
```

- `title` is required. `video_url` is optional and must be an http(s) URL.
- Write inline math as `$...$` and display math as `$$...$$`. Do not use
  `\(...\)` or `\[...\]`.
- Start headings at `##`; the lesson title comes from the front matter.
- Use standard Markdown only: no raw HTML, no slide or presentation syntax.
  Tables are GitHub-flavoured.
- Reference images relative to the module folder: `![Venn diagram](images/union.png)`.
  Always write alt text. The seed stores the path as
  `/api/content/<module-folder>/images/union.png`.

## Quizzes

`quiz.yaml` lists questions in display order. Three types are supported:

```yaml
questions:
  - key: identify-p          # unique within the quiz
    type: multiple_choice
    prompt: Which part is $P$ in "if $x$ is even, then $x^2$ is even"?
    options:                 # 2 to 26 choices; exactly one has correct: true
      - text: "$x$ is even"
        correct: true
      - text: "$x^2$ is even"

  - key: disprove-technique
    type: fill_in_blank
    prompt: A single failing case is a proof by ______.
    answer: counterexample

  - key: odd-square
    type: free_response
    prompt: Prove that if $x$ is odd then $x^2$ is odd.
    answer: |
      Model answer shown after the student submits.
```

Quote text that contains `: ` or starts with a YAML indicator such as `[`, `{`
or `*`. Inside double quotes write each LaTeX backslash twice
(`"$\\neg Q$"`); in plain and block scalars (`|`, `>-`) write it once.

Option keys are generated (`a`, `b`, ...) from the option order.

## Loading content

Run from `backend/`:

```sh
uv run python -m src.seed --check   # validate only; no database needed
uv run python -m src.seed           # load into DATABASE_URL
```

- Re-running appends new modules and refreshes the title, body and video of
  lessons already in the database, unless a lesson was edited there since the
  seed last wrote it; those are reported and left as they are. Quizzes, module
  details, lesson order and database-only content are never changed.
- Removing content here does not remove it from the database. A module archived
  through the admin API is not inserted again, even while it remains here.
- The whole run is one transaction. If validation or the database fails,
  nothing is changed.
- Validation reports every problem at once (missing files, unknown fields,
  missing images, a multiple-choice question without exactly one correct
  option, duplicate keys or positions).

## Publishing

Edit this directory and open a pull request; CI runs `--check`. After the merge,
the backend image is rebuilt and the deployment's `seed` init container loads the
content when the backend is rolled out (see
[`deploy/README.md`](../deploy/README.md#publish-content)). A failed seed keeps the
previous version serving. Locally, `docker compose up` migrates and seeds
automatically; run `docker compose run --rm seed` to insert new modules.

Set `CONTENT_DIR` or pass `--content-dir` to load a different directory.

## Rendering requirements

Lesson bodies are stored as authored. A renderer must:

- Parse math before Markdown (for example `remark-math`) so `\`, `_` and `*`
  inside `$...$` are not treated as Markdown, then typeset with MathJax.
- Support GitHub-flavoured Markdown tables.
- Serve this directory at `/api/content/` so image paths resolve; the backend
  does this, and the `/api` prefix is what the frontend proxy already forwards.

The current lessons use `\cancel`, which needs MathJax's `cancel` extension
loaded. Everything else they use (`\mathscr`, `\bigwedge`, `\choose`,
`\implies`, `\iff`, `\lfloor`, `\square`, `\texttt`, `\textrm`) is standard
TeX input.

## Adding or converting content

New lessons in existing modules: use the admin API. For new modules, add `NN-key.md`, then run `--check` and the seed. Prefer short
sections of a few paragraphs, each with its own `##` heading.

The first twelve modules were converted once from Slidev slide decks. Slides
became `##` sections; click-by-click reveals are shown at once, and two-column
layouts are sequential. Some sections therefore repeat a heading where the deck
built up a slide in steps, and can be merged by hand. Slidev syntax is not
supported by the loader.
