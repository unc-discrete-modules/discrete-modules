import { apiFetch } from '@/api'
import type {
  ErrorResponse,
  Lesson,
  Module,
  ModuleSummary,
  Quiz,
  SubmissionRequest,
  SubmissionResult,
} from '@/types/types'

type ErrorBody = ErrorResponse['error']

export class ApiError extends Error {
  readonly status: number | null
  readonly code?: string
  readonly details?: ErrorBody['details']

  constructor(message: string, status: number | null = null, body?: ErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.code
    this.details = body?.details
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}

function isModuleSummary(value: unknown): value is ModuleSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.display_order === 'number'
  )
}

function isModule(value: unknown): value is Module {
  return (
    isModuleSummary(value) &&
    'quiz_id' in value &&
    (value.quiz_id === null || typeof value.quiz_id === 'number') &&
    'lessons' in value &&
    Array.isArray(value.lessons) &&
    value.lessons.every(
      (lesson: unknown) =>
        isRecord(lesson) &&
        typeof lesson.id === 'number' &&
        typeof lesson.title === 'string',
    )
  )
}

function isOrderResponse(value: unknown): value is { ids: number[] } {
  return (
    isRecord(value) &&
    Array.isArray(value.ids) &&
    value.ids.every((id: unknown) => typeof id === 'number')
  )
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  validate?: (value: unknown) => value is T,
): Promise<T> {
  let response: Response
  try {
    response = await apiFetch(path, init)
  } catch (error) {
    if (
      init.signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    )
      throw error
    throw new ApiError(
      'Unable to connect. Check your connection and try again.',
    )
  }

  let value: unknown
  try {
    value = await response.json()
  } catch (error) {
    if (
      init.signal?.aborted ||
      (error instanceof Error && error.name === 'AbortError')
    )
      throw error
    if (response.ok)
      throw new ApiError(
        'The server returned an invalid response. Please try again.',
        response.status,
      )
  }

  if (!response.ok) {
    const body = isErrorResponse(value) ? value.error : undefined
    const fallback =
      response.status === 404
        ? 'The requested content could not be found.'
        : response.status === 401
          ? 'Your session has expired. Please sign in again.'
          : response.status === 422
            ? 'Please check your answers and try again.'
            : 'Unable to load this content. Please try again.'
    throw new ApiError(
      response.status >= 500 ? fallback : body?.message || fallback,
      response.status,
      body,
    )
  }
  if (validate && !validate(value)) {
    throw new ApiError(
      'The server returned an invalid response. Please try again.',
      response.status,
    )
  }
  return value as T
}

export function listModules(signal?: AbortSignal): Promise<ModuleSummary[]> {
  return requestJson(
    '/modules',
    { signal },
    (value): value is ModuleSummary[] =>
      Array.isArray(value) && value.every(isModuleSummary),
  )
}

export function reorderModules(
  ids: number[],
  csrfToken: string,
): Promise<{ ids: number[] }> {
  return requestJson(
    '/admin/modules/order',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ ids }),
    },
    (value): value is { ids: number[] } =>
      isOrderResponse(value) &&
      value.ids.length === ids.length &&
      value.ids.every((id, index) => id === ids[index]),
  )
}

export function getModule(
  moduleId: number,
  signal?: AbortSignal,
): Promise<Module> {
  return requestJson(`/modules/${moduleId}`, { signal }, isModule)
}

export function getLesson(
  lessonId: number,
  signal?: AbortSignal,
): Promise<Lesson> {
  return requestJson(`/lessons/${lessonId}`, { signal })
}

export function getQuiz(moduleId: number, signal?: AbortSignal): Promise<Quiz> {
  return requestJson(`/modules/${moduleId}/quiz`, { signal })
}

export function submitQuiz(
  quizId: number,
  submission: SubmissionRequest,
  options: { csrfToken: string; signal?: AbortSignal },
): Promise<SubmissionResult> {
  return requestJson(`/quizzes/${quizId}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': options.csrfToken,
    },
    body: JSON.stringify(submission),
    signal: options.signal,
  })
}
