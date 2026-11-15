import { describe, expect, it } from 'vitest'
import type { AttemptDetail, AttemptSummary } from '@/types/types'
import { answerValuesFromAttempt, bestAttempt } from './quiz-answers'

function attempt(id: number, score: number, max_score: number): AttemptSummary {
  return { id, score, max_score, submitted_at: id }
}

describe('bestAttempt', () => {
  it('is undefined without attempts', () => {
    expect(bestAttempt([])).toBeUndefined()
  })

  it('compares fractions, not raw scores', () => {
    expect(bestAttempt([attempt(3, 3, 5), attempt(2, 2, 3)])?.id).toBe(2)
  })

  it('prefers the latest attempt on a tie', () => {
    expect(bestAttempt([attempt(2, 1, 2), attempt(1, 1, 2)])?.id).toBe(2)
  })

  it('treats an attempt with nothing graded as zero', () => {
    expect(bestAttempt([attempt(2, 0, 0), attempt(1, 1, 4)])?.id).toBe(1)
  })
})

describe('answerValuesFromAttempt', () => {
  it('uses option ids for choices and text otherwise', () => {
    const detail = {
      ...attempt(1, 0, 0),
      answers: [
        { question_id: 1, option_id: 11, text: null },
        { question_id: 2, option_id: null, text: 'proof' },
        { question_id: 3, option_id: null, text: null },
      ],
      result: { results: [] },
    } satisfies AttemptDetail

    expect(answerValuesFromAttempt(detail)).toEqual({
      1: '11',
      2: 'proof',
      3: '',
    })
  })
})
