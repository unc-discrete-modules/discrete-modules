import { describe, expect, it } from 'vitest'
import {
  isHttpUrl,
  isLessonKey,
  lessonKeyFromFileName,
  lessonKeyFromTitle,
  parseLessonFile,
} from './lesson-content'

const file = (meta: string, body = '## Hi\n\nText.') =>
  `---\n${meta}\n---\n\n${body}\n`

describe('parseLessonFile', () => {
  it('reads the title, video and body', () => {
    expect(
      parseLessonFile(
        file('title: Proofs Continued\nvideo_url: https://youtu.be/abc'),
      ),
    ).toEqual({
      lesson: {
        title: 'Proofs Continued',
        videoUrl: 'https://youtu.be/abc',
        body: '## Hi\n\nText.',
      },
    })
  })

  it('treats the video as optional', () => {
    expect(parseLessonFile(file('title: Intro'))).toMatchObject({
      lesson: { title: 'Intro', videoUrl: null },
    })
  })

  it('accepts quoted titles, Windows line endings and a byte order mark', () => {
    const text = `\uFEFF${file('title: "Sets: a start"')}`.replace(
      /\n/g,
      '\r\n',
    )

    expect(parseLessonFile(text)).toMatchObject({
      lesson: { title: 'Sets: a start', body: '## Hi\n\nText.' },
    })
  })

  it.each([
    ['no front matter', '## Hi\n\nText.', 'front matter block'],
    ['an unclosed block', '---\ntitle: Intro\n\n## Hi', 'front matter block'],
    ['invalid YAML', file('title: [unclosed'), 'not valid YAML'],
    ['no title', file('video_url: https://youtu.be/abc'), 'needs a title'],
    ['a blank title', file('title: "  "'), 'needs a title'],
    ['a numeric title', file('title: 42'), 'needs a title'],
    [
      'a non-http video',
      file('title: A\nvideo_url: ftp://x.test/v'),
      'http(s)',
    ],
    ['an empty body', file('title: A', '   '), 'body is empty'],
  ])('rejects %s', (_name, text, message) => {
    const parsed = parseLessonFile(text)

    expect(parsed).toHaveProperty('error')
    expect((parsed as { error: string }).error).toContain(message)
  })
})

describe('lessonKeyFromFileName', () => {
  it.each([
    ['01-proofs.md', 'proofs'],
    ['02-proofs-continued.md', 'proofs-continued'],
    ['proofs.md', 'proofs'],
    ['3-sets2.md', 'sets2'],
  ])('derives the key from %s', (name, key) => {
    expect(lessonKeyFromFileName(name)).toBe(key)
  })

  it.each([
    'Proofs Continued.md',
    'proofs_continued.md',
    '01-Proofs.md',
    '-proofs.md',
    '01-.md',
    '.md',
    `${'a'.repeat(101)}.md`,
  ])('rejects %s instead of rewriting it', (name) => {
    expect(lessonKeyFromFileName(name)).toBeNull()
  })
})

describe('lessonKeyFromTitle', () => {
  it.each([
    ['Proofs', 'proofs'],
    ['Proofs, Continued!', 'proofs-continued'],
    ['  Sets & Tuples  ', 'sets-tuples'],
    ['Lesson 2: Induction', 'lesson-2-induction'],
    ['Éléments', 'l-ments'],
    ['!!!', ''],
    ['', ''],
  ])('suggests a key for %j', (title, key) => {
    expect(lessonKeyFromTitle(title)).toBe(key)
  })

  it('never exceeds the longest key and never ends in a hyphen', () => {
    const key = lessonKeyFromTitle(`${'word '.repeat(40)}`)

    expect(key.length).toBeLessThanOrEqual(100)
    expect(key.endsWith('-')).toBe(false)
    expect(isLessonKey(key)).toBe(true)
  })

  it('always yields a valid key when it yields one', () => {
    for (const title of ['A b', 'x--y', '9 lives', 'CamelCaseTitle']) {
      expect(isLessonKey(lessonKeyFromTitle(title))).toBe(true)
    }
  })
})

describe('isHttpUrl', () => {
  it.each([
    ['https://youtu.be/abc', true],
    ['http://example.com/a', true],
    ['ftp://example.com', false],
    ['javascript:alert(1)', false],
    ['not a url', false],
    ['', false],
    [42, false],
  ])('%j -> %s', (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected)
  })
})
