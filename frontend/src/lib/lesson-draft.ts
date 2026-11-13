import type { LessonInput } from '@/types/types'
import { isHttpUrl, isLessonKey } from './lesson-content'

export const MAX_TITLE_LENGTH = 200
export const MAX_VIDEO_URL_LENGTH = 2048
export const MAX_KEY_LENGTH = 100

export type LessonDraft = {
  title: string
  key: string
  videoUrl: string
  body: string
}

export type LessonProblems = {
  title?: string
  key?: string
  videoUrl?: string
  body?: string
}

// Mirrors the API's rules so mistakes are caught before a request is made;
// the API still has the final say.
export function lessonProblems(draft: LessonDraft): LessonProblems | null {
  const problems: LessonProblems = {}

  if (!draft.title.trim()) problems.title = 'Enter a title.'
  if (!draft.key) {
    problems.key = 'Enter a key.'
  } else if (!isLessonKey(draft.key)) {
    problems.key =
      'Use lowercase letters and numbers, joined by single hyphens.'
  }
  if (draft.videoUrl.trim() && !isHttpUrl(draft.videoUrl.trim())) {
    problems.videoUrl = 'Enter a full http(s) link, or leave this empty.'
  }
  if (!draft.body.trim()) problems.body = 'Write the lesson.'

  return Object.keys(problems).length > 0 ? problems : null
}

export function toLessonInput(draft: LessonDraft): LessonInput {
  return {
    key: draft.key,
    title: draft.title.trim(),
    body: draft.body.trim(),
    video_url: draft.videoUrl.trim() || null,
  }
}
