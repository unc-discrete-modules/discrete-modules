import { parse } from 'yaml'
import type { QuizInput } from '@/types/types'

export type ParsedQuizFile = { quiz: QuizInput } | { error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A quiz file uses the same fields as the API (key, type, prompt, answer,
// options), so questions are passed through as written and the server, which
// knows every rule, reports exactly what to fix.
export function parseQuizFile(text: string): ParsedQuizFile {
  let data: unknown
  try {
    data = parse(text)
  } catch {
    return { error: 'The file is not valid YAML.' }
  }

  if (
    !isRecord(data) ||
    !Array.isArray(data.questions) ||
    data.questions.length === 0
  ) {
    return {
      error: 'The file needs a questions list with at least one question.',
    }
  }
  if (!data.questions.every(isRecord)) {
    return {
      error: 'Each question needs fields such as key, type, and prompt.',
    }
  }
  return { quiz: { questions: data.questions as QuizInput['questions'] } }
}
