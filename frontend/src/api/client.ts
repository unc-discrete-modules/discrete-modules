import { apiFetch } from '@/api'
import type {
  AdminQuiz,
  ErrorResponse,
  Lesson,
  LessonCompletionResponse,
  LessonInput,
  LessonPatch,
  LessonResponse,
  Module,
  ModuleProgress,
  ModuleResponse,
  ModuleSummary,
  Quiz,
  QuizInput,
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

function isModuleResponse(value: unknown): value is ModuleResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.key === 'string' &&
    typeof value.title === 'string' &&
    typeof value.description === 'string' &&
    typeof value.position === 'number'
  )
}

function isLessonResponse(value: unknown): value is LessonResponse {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.module_id === 'number' &&
    typeof value.key === 'string' &&
    typeof value.title === 'string' &&
    typeof value.body === 'string' &&
    (value.video_url === null || typeof value.video_url === 'string') &&
    typeof value.position === 'number' &&
    typeof value.archived === 'boolean'
  )
}

function isAdminQuiz(value: unknown): value is AdminQuiz {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.module_id === 'number' &&
    typeof value.archived === 'boolean' &&
    Array.isArray(value.questions) &&
    value.questions.every(
      (question: unknown) =>
        isRecord(question) &&
        typeof question.key === 'string' &&
        typeof question.type === 'string' &&
        typeof question.prompt === 'string' &&
        typeof question.archived === 'boolean' &&
        (question.answer === null || typeof question.answer === 'string') &&
        (question.options === null || Array.isArray(question.options)),
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
  expectNoContent = false,
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

  if (expectNoContent && response.status === 204) return undefined as T

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
  if (expectNoContent) {
    throw new ApiError(
      'The server returned an invalid response. Please try again.',
      response.status,
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

export function getMyProgress(signal?: AbortSignal): Promise<ModuleProgress[]> {
  return requestJson(
    '/me/progress',
    { signal },
    (value): value is ModuleProgress[] =>
      Array.isArray(value) &&
      value.every(
        (item: unknown) =>
          isRecord(item) &&
          typeof item.module_id === 'number' &&
          typeof item.lesson_count === 'number' &&
          Array.isArray(item.completed_lesson_ids) &&
          item.completed_lesson_ids.every(
            (id: unknown) => typeof id === 'number',
          ) &&
          (item.best_quiz_attempt === null ||
            (isRecord(item.best_quiz_attempt) &&
              typeof item.best_quiz_attempt.score === 'number' &&
              typeof item.best_quiz_attempt.max_score === 'number')),
      ),
  )
}

export function completeLesson(
  lessonId: number,
  csrfToken: string,
): Promise<LessonCompletionResponse> {
  return requestJson(
    `/lessons/${lessonId}/complete`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    },
    (value): value is LessonCompletionResponse =>
      isRecord(value) &&
      value.lesson_id === lessonId &&
      typeof value.completed_at === 'number',
  )
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

export function reorderLessons(
  moduleId: number,
  ids: number[],
  csrfToken: string,
): Promise<{ ids: number[] }> {
  return requestJson(
    `/admin/modules/${moduleId}/lessons/order`,
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

export function deleteModule(
  moduleId: number,
  csrfToken: string,
): Promise<void> {
  return requestJson<void>(
    `/admin/modules/${moduleId}`,
    {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': csrfToken },
    },
    undefined,
    true,
  )
}

export function createModule(
  csrfToken: string,
  key: string,
  title: string,
  description: string,
): Promise<ModuleResponse> {
  const body = { key, title, description }
  return requestJson(
    '/admin/modules',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(body),
    },
    isModuleResponse,
  )
}

export function createLesson(
  csrfToken: string,
  moduleId: number,
  lesson: LessonInput,
): Promise<LessonResponse> {
  return requestJson(
    `/admin/modules/${moduleId}/lessons`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(lesson),
    },
    isLessonResponse,
  )
}

export function listModuleLessons(
  moduleId: number,
  includeArchived: boolean,
  signal?: AbortSignal,
): Promise<LessonResponse[]> {
  return requestJson(
    `/admin/modules/${moduleId}/lessons?include_archived=${includeArchived}`,
    { signal },
    (value): value is LessonResponse[] =>
      Array.isArray(value) && value.every(isLessonResponse),
  )
}

// Unlike the student endpoint, this includes the key and archived state.
export function getAdminLesson(
  lessonId: number,
  signal?: AbortSignal,
): Promise<LessonResponse> {
  return requestJson(`/admin/lessons/${lessonId}`, { signal }, isLessonResponse)
}

export function updateLesson(
  csrfToken: string,
  lessonId: number,
  changes: LessonPatch,
): Promise<LessonResponse> {
  return requestJson(
    `/admin/lessons/${lessonId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(changes),
    },
    isLessonResponse,
  )
}

export function restoreLesson(
  csrfToken: string,
  lessonId: number,
): Promise<LessonResponse> {
  return requestJson(
    `/admin/lessons/${lessonId}/restore`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    },
    isLessonResponse,
  )
}

// Rejects with a 404 ApiError when the module has no quiz.
export function getAdminQuiz(
  moduleId: number,
  includeArchived: boolean,
  signal?: AbortSignal,
): Promise<AdminQuiz> {
  return requestJson(
    `/admin/modules/${moduleId}/quiz?include_archived=${includeArchived}`,
    { signal },
    isAdminQuiz,
  )
}

export function createQuiz(
  csrfToken: string,
  moduleId: number,
  quiz: QuizInput,
): Promise<AdminQuiz> {
  return requestJson(
    `/admin/modules/${moduleId}/quiz`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(quiz),
    },
    isAdminQuiz,
  )
}

export function replaceQuiz(
  csrfToken: string,
  quizId: number,
  quiz: QuizInput,
): Promise<AdminQuiz> {
  return requestJson(
    `/admin/quizzes/${quizId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(quiz),
    },
    isAdminQuiz,
  )
}

export function restoreQuiz(
  csrfToken: string,
  quizId: number,
): Promise<AdminQuiz> {
  return requestJson(
    `/admin/quizzes/${quizId}/restore`,
    {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken },
    },
    isAdminQuiz,
  )
}

export function updateModule(
  csrfToken: string,
  moduleId: number,
  title: string,
  description: string,
): Promise<ModuleResponse> {
  const body = { title, description }
  return requestJson(
    `/admin/modules/${moduleId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify(body),
    },
    isModuleResponse,
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

export function deleteLesson(
  lessonId: number,
  csrfToken: string,
): Promise<void> {
  return requestJson<void>(
    `/admin/lessons/${lessonId}`,
    {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': csrfToken },
    },
    undefined,
    true,
  )
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

export function deleteQuiz(quizId: number, csrfToken: string): Promise<void> {
  return requestJson<void>(
    `/admin/quizzes/${quizId}`,
    {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': csrfToken },
    },
    undefined,
    true,
  )
}
