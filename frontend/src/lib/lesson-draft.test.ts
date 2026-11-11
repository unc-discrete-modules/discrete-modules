import { describe, expect, it } from 'vitest'
import { lessonProblems, toLessonInput, type LessonDraft } from './lesson-draft'

const draft = (overrides: Partial<LessonDraft> = {}): LessonDraft => ({
  title: 'Proofs',
  key: 'proofs',
  videoUrl: '',
  body: '## Welcome',
  ...overrides,
})

describe('lessonProblems', () => {
  it('accepts a complete lesson, with or without a video', () => {
    expect(lessonProblems(draft())).toBeNull()
    expect(
      lessonProblems(draft({ videoUrl: 'https://youtu.be/abc' })),
    ).toBeNull()
  })

  it.each([
    ['title', draft({ title: '   ' }), 'Enter a title.'],
    ['key', draft({ key: '' }), 'Enter a key.'],
    ['key', draft({ key: 'Not A Key' }), 'Use lowercase'],
    ['key', draft({ key: 'two--hyphens' }), 'Use lowercase'],
    ['videoUrl', draft({ videoUrl: 'youtube' }), 'full http(s) link'],
    ['videoUrl', draft({ videoUrl: 'ftp://x.test/v' }), 'full http(s) link'],
    ['body', draft({ body: '  \n ' }), 'Write the lesson.'],
  ] as const)('flags %s', (field, input, message) => {
    expect(lessonProblems(input)?.[field]).toContain(message)
  })

  it('reports every problem at once', () => {
    expect(
      Object.keys(
        lessonProblems({ title: '', key: '', videoUrl: 'x', body: '' }) ?? {},
      ),
    ).toEqual(['title', 'key', 'videoUrl', 'body'])
  })
})

describe('toLessonInput', () => {
  it('builds the API body, trimming text and sending no video when empty', () => {
    expect(
      toLessonInput(draft({ title: ' Proofs ', body: '\n## Hi\n\n' })),
    ).toEqual({
      key: 'proofs',
      title: 'Proofs',
      body: '## Hi',
      video_url: null,
    })
  })

  it('keeps a video link, without surrounding spaces', () => {
    expect(
      toLessonInput(draft({ videoUrl: ' https://youtu.be/abc ' })).video_url,
    ).toBe('https://youtu.be/abc')
  })
})
