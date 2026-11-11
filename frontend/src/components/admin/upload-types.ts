import type { LessonSummary, Module } from '@/types/types'

export type UploadedFile = { name: string; text: string }

export type PreviewProps = {
  file: UploadedFile
  // The module the content is being added to, for previews shown in context.
  module?: Module
}

export type CreateContext = {
  module: Module
  csrfToken: string
}

// Resolves with the lesson that was added, if any, so the page can keep its
// view of the module current without refetching it.
export type CreateContent = (
  file: UploadedFile,
  context: CreateContext,
) => Promise<LessonSummary | void>
