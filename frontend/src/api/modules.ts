import type { Module, ModuleSummary } from '@/types/types'
import { apiFetch } from '@/api'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isModuleSummary(
  value: unknown,
): value is ModuleSummary & Record<string, unknown> {
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
    typeof value.has_quiz === 'boolean' &&
    Array.isArray(value.lessons) &&
    value.lessons.every(
      (lesson: unknown) =>
        isRecord(lesson) &&
        typeof lesson.id === 'number' &&
        typeof lesson.title === 'string',
    )
  )
}

async function fetchApiData<T>(
  path: string,
  isExpectedShape: (value: unknown) => value is T,
  resource: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiFetch(path, { signal })
  if (!response.ok) {
    throw new Error(`Failed to load ${resource}: ${response.status}`)
  }

  const value: unknown = await response.json()
  if (!isExpectedShape(value)) {
    throw new Error(`The ${resource} API returned an invalid response`)
  }
  return value
}

export function fetchModuleSummaries(signal?: AbortSignal) {
  return fetchApiData(
    '/modules',
    (value): value is ModuleSummary[] =>
      Array.isArray(value) && value.every(isModuleSummary),
    'modules',
    signal,
  )
}

export function fetchModule(moduleId: number, signal?: AbortSignal) {
  return fetchApiData(`/modules/${moduleId}`, isModule, 'module', signal)
}
