import { describe, expect, it } from 'vitest'
import { parseQuizFile } from './quiz-content'

const quiz = `questions:
  - key: identify-p
    type: multiple_choice
    prompt: |
      Which part is $P$?
    options:
      - text: "$x$ is even"
        correct: true
      - text: "$x^2$ is even"
  - key: disprove
    type: fill_in_blank
    prompt: A single failing case is a proof by ______.
    answer: counterexample
`

describe('parseQuizFile', () => {
  it('passes questions through as written for the server to check', () => {
    expect(parseQuizFile(quiz)).toEqual({
      quiz: {
        questions: [
          {
            key: 'identify-p',
            type: 'multiple_choice',
            prompt: 'Which part is $P$?\n',
            options: [
              { text: '$x$ is even', correct: true },
              { text: '$x^2$ is even' },
            ],
          },
          {
            key: 'disprove',
            type: 'fill_in_blank',
            prompt: 'A single failing case is a proof by ______.',
            answer: 'counterexample',
          },
        ],
      },
    })
  })

  it.each([
    ['invalid YAML', 'questions: [unclosed', 'not valid YAML'],
    ['an empty file', '', 'questions list'],
    ['a list at the top level', '- key: a', 'questions list'],
    ['no questions key', 'question:\n  - key: a', 'questions list'],
    ['an empty list', 'questions: []', 'questions list'],
    ['questions that are not a list', 'questions: yes', 'questions list'],
    [
      'a question that is plain text',
      'questions:\n  - just text',
      'Each question',
    ],
  ])('rejects %s', (_name, text, message) => {
    const parsed = parseQuizFile(text)

    expect(parsed).toHaveProperty('error')
    expect((parsed as { error: string }).error).toContain(message)
  })
})
