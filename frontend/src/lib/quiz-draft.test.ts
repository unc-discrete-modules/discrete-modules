import { describe, expect, it } from 'vitest'
import type { AdminQuiz } from '@/types/types'
import {
  MAX_OPTIONS,
  createOption,
  createQuestion,
  draftsFromQuiz,
  firstInvalidQuestion,
  questionProblems,
  quizSnapshot,
  toQuizInput,
  type DraftQuestion,
} from './quiz-draft'

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function choice(overrides: Partial<DraftQuestion> = {}): DraftQuestion {
  return {
    ...createQuestion('multiple_choice'),
    prompt: 'Which?',
    options: [
      { id: 'a', text: 'One', correct: true },
      { id: 'b', text: 'Two', correct: false },
    ],
    ...overrides,
  }
}

describe('createQuestion', () => {
  it('gives every question a distinct key the API accepts', () => {
    const keys = Array.from(
      { length: 50 },
      () => createQuestion('free_response').id,
    )

    expect(new Set(keys).size).toBe(50)
    keys.forEach((key) => {
      expect(key).toMatch(KEY)
      expect(key.length).toBeLessThanOrEqual(100)
    })
  })

  it('starts multiple choice with two empty options and others with none', () => {
    const mc = createQuestion('multiple_choice')

    expect(mc.options).toHaveLength(2)
    expect(mc.options.every((o) => o.text === '' && !o.correct)).toBe(true)
    expect(createQuestion('fill_in_blank').options).toEqual([])
    expect(createQuestion('free_response').options).toEqual([])
  })

  it('creates options with distinct ids', () => {
    expect(createOption().id).not.toBe(createOption().id)
  })
})

describe('questionProblems', () => {
  it('accepts complete questions of every type', () => {
    expect(questionProblems(choice())).toBeNull()
    expect(
      questionProblems({
        ...createQuestion('fill_in_blank'),
        prompt: 'A ____',
        answer: 'x',
      }),
    ).toBeNull()
    expect(
      questionProblems({
        ...createQuestion('free_response'),
        prompt: 'Prove it.',
        answer: 'Model.',
      }),
    ).toBeNull()
  })

  it('requires question text, ignoring blank space', () => {
    expect(questionProblems(choice({ prompt: '   ' }))?.prompt).toBe(
      'Enter the question.',
    )
  })

  it('requires every option to have text and reports which are empty', () => {
    const problems = questionProblems(
      choice({
        options: [
          { id: 'a', text: 'One', correct: true },
          { id: 'b', text: '  ', correct: false },
        ],
      }),
    )

    expect(problems?.options).toContain('Fill in every option')
    expect(problems?.emptyOptionIds).toEqual(['b'])
  })

  it('requires one option to be marked correct', () => {
    const problems = questionProblems(
      choice({
        options: [
          { id: 'a', text: 'One', correct: false },
          { id: 'b', text: 'Two', correct: false },
        ],
      }),
    )

    expect(problems?.options).toBe('Choose the correct option.')
  })

  it('requires at least two options', () => {
    const problems = questionProblems(
      choice({ options: [{ id: 'a', text: 'One', correct: true }] }),
    )

    expect(problems?.options).toBe('Add at least 2 options.')
  })

  it.each([
    ['fill_in_blank', 'Enter the correct answer.'],
    ['free_response', 'Enter a model answer.'],
  ] as const)('requires an answer for %s', (type, message) => {
    const question = { ...createQuestion(type), prompt: 'Q', answer: ' ' }

    expect(questionProblems(question)?.answer).toBe(message)
  })

  it('allows as many options as the API does', () => {
    expect(MAX_OPTIONS).toBe(26)
  })
})

describe('toQuizInput', () => {
  it('builds the API body, trimming text and sending only fitting fields', () => {
    const fill = {
      ...createQuestion('fill_in_blank'),
      prompt: ' A ____ ',
      answer: ' x ',
    }
    const mc = choice({ prompt: ' Which? ' })

    const { questions } = toQuizInput([mc, fill])

    expect(questions).toEqual([
      {
        key: mc.id,
        type: 'multiple_choice',
        prompt: 'Which?',
        options: [
          { text: 'One', correct: true },
          { text: 'Two', correct: false },
        ],
      },
      { key: fill.id, type: 'fill_in_blank', prompt: 'A ____', answer: 'x' },
    ])
    // The API rejects an answer on multiple choice and options on the others.
    expect(questions[0]).not.toHaveProperty('answer')
    expect(questions[1]).not.toHaveProperty('options')
  })

  it('keeps the order of the questions', () => {
    const [a, b, c] = ['free_response', 'fill_in_blank', 'free_response'].map(
      (type) => ({
        ...createQuestion(type as 'free_response'),
        prompt: 'Q',
        answer: 'A',
      }),
    )

    expect(toQuizInput([c, a, b]).questions.map((q) => q.key)).toEqual([
      c.id,
      a.id,
      b.id,
    ])
  })
})

const saved: AdminQuiz = {
  id: 5,
  module_id: 9,
  archived: false,
  questions: [
    {
      id: 1,
      key: 'pick',
      type: 'multiple_choice',
      prompt: 'Which?',
      answer: null,
      archived: false,
      options: [
        { text: 'One', correct: false },
        { text: 'Two', correct: true },
      ],
    },
    {
      id: 2,
      key: 'blank',
      type: 'fill_in_blank',
      prompt: 'A ____',
      answer: 'x',
      archived: false,
      options: null,
    },
    {
      id: 3,
      key: 'gone',
      type: 'free_response',
      prompt: 'Removed',
      answer: 'y',
      archived: true,
      options: null,
    },
  ],
}

describe('draftsFromQuiz', () => {
  it('turns a saved quiz into drafts that keep each question key', () => {
    const drafts = draftsFromQuiz(saved)

    expect(drafts.map((d) => d.id)).toEqual(['pick', 'blank'])
    expect(drafts[0]).toMatchObject({
      type: 'multiple_choice',
      prompt: 'Which?',
      answer: '',
    })
    expect(
      drafts[0].options.map(({ text, correct }) => ({ text, correct })),
    ).toEqual([
      { text: 'One', correct: false },
      { text: 'Two', correct: true },
    ])
    expect(drafts[1]).toMatchObject({ answer: 'x', options: [] })
  })

  it('skips archived questions', () => {
    expect(draftsFromQuiz(saved).map((d) => d.id)).not.toContain('gone')
  })

  it('gives options distinct ids for the screen', () => {
    const ids = draftsFromQuiz(saved)[0].options.map((o) => o.id)

    expect(new Set(ids).size).toBe(2)
  })

  it('round-trips to the same API body', () => {
    expect(toQuizInput(draftsFromQuiz(saved))).toEqual({
      questions: [
        {
          key: 'pick',
          type: 'multiple_choice',
          prompt: 'Which?',
          options: [
            { text: 'One', correct: false },
            { text: 'Two', correct: true },
          ],
        },
        { key: 'blank', type: 'fill_in_blank', prompt: 'A ____', answer: 'x' },
      ],
    })
  })
})

describe('quizSnapshot', () => {
  it('is the same for drafts that would be saved the same', () => {
    expect(quizSnapshot(draftsFromQuiz(saved))).toBe(
      quizSnapshot(draftsFromQuiz(saved)),
    )
  })

  it('changes with the content, the order and the answer key', () => {
    const base = draftsFromQuiz(saved)
    const original = quizSnapshot(base)

    expect(quizSnapshot([{ ...base[0], prompt: 'Changed' }, base[1]])).not.toBe(
      original,
    )
    expect(quizSnapshot([base[1], base[0]])).not.toBe(original)
    expect(
      quizSnapshot([
        {
          ...base[0],
          options: base[0].options.map((o) => ({ ...o, correct: !o.correct })),
        },
        base[1],
      ]),
    ).not.toBe(original)
  })
})

describe('firstInvalidQuestion', () => {
  it('finds the first incomplete question, or nothing when all are complete', () => {
    const good = {
      ...createQuestion('free_response'),
      prompt: 'Q',
      answer: 'A',
    }
    const bad = createQuestion('free_response')

    expect(firstInvalidQuestion([good, bad, good])).toBe(bad)
    expect(firstInvalidQuestion([good])).toBeUndefined()
    expect(firstInvalidQuestion([])).toBeUndefined()
  })
})
