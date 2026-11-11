import { parse } from 'yaml'

export type LessonSections = {
  objectives: string
  body: string
}

export function splitLessonSections(body: string): LessonSections {
  const heading = /^## Learning Objectives\s*$/m.exec(body)
  if (!heading || heading.index === undefined) {
    return { objectives: '', body }
  }

  const objectivesStart = heading.index + heading[0].length
  const remainingBody = body.slice(objectivesStart)
  const nextHeading = /\n##\s+/.exec(remainingBody)
  const objectivesEnd = nextHeading?.index ?? remainingBody.length
  const objectives = remainingBody.slice(0, objectivesEnd).trim()
  const beforeObjectives = body.slice(0, heading.index).trim()
  const afterObjectives = remainingBody.slice(objectivesEnd).trim()

  return {
    objectives,
    body: [beforeObjectives, afterObjectives].filter(Boolean).join('\n\n'),
  }
}

export type LessonFile = {
  title: string
  videoUrl: string | null
  body: string
}

export type ParsedLessonFile = { lesson: LessonFile } | { error: string }

// Same shape the content loader expects: a --- block, then the Markdown body.
const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_KEY_LENGTH = 100

// Lesson files are named NN-key.md, as in content/; the prefix only orders
// them there, and the server appends new lessons, so it is dropped. The key is
// permanent, so a name that is not already a valid key is rejected rather
// than rewritten.
export function lessonKeyFromFileName(fileName: string): string | null {
  const key = fileName.replace(/\.md$/i, '').replace(/^\d+-/, '')
  return isLessonKey(key) ? key : null
}

export function isLessonKey(key: string): boolean {
  return KEY.test(key) && key.length <= MAX_KEY_LENGTH
}

// A suggestion for a lesson written in the editor, where the title is typed
// first: "Proofs, Continued!" becomes "proofs-continued". Empty if the title
// has no letters or numbers.
export function lessonKeyFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_KEY_LENGTH)
    .replace(/^-+|-+$/g, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export function parseLessonFile(text: string): ParsedLessonFile {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const match = FRONT_MATTER.exec(normalized)
  if (!match) {
    return { error: 'The file must start with a --- front matter block.' }
  }

  let meta: unknown
  try {
    meta = parse(match[1])
  } catch {
    return { error: 'The front matter is not valid YAML.' }
  }
  if (!isRecord(meta) || typeof meta.title !== 'string' || !meta.title.trim()) {
    return { error: 'The front matter needs a title.' }
  }
  if (meta.video_url != null && !isHttpUrl(meta.video_url)) {
    return { error: 'video_url must be an http(s) URL.' }
  }

  const body = match[2].trim()
  if (!body) {
    return { error: 'The lesson body is empty.' }
  }

  return {
    lesson: {
      title: meta.title.trim(),
      videoUrl: meta.video_url ?? null,
      body,
    },
  }
}
