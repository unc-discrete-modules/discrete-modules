/** Page where module content is edited. Must take in a module id and load info. */

import { useAuth } from '@/context/auth-context-value'
import NoAccess from './NoAccess'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react'
import { useModule, useModules } from '@/hooks/use-modules'
import { SaveFillButton } from '@/components/admin/SaveButton'
import ReorderButton from '@/components/admin/ReorderButton'
import PlusButton from '@/components/admin/PlusButton'
import ContentRow from '@/components/admin/ContentRow'
import {
  deleteLesson,
  deleteQuiz,
  reorderLessons,
  updateModule,
} from '@/api/client'
import { ErrorState, LoadingState } from '@/components/RequestState'

export default function ModuleEdit() {
  const { state: authState } = useAuth()
  const { updateModuleTitle } = useModules()
  const { moduleId } = useParams()
  const numericModuleId = Number(moduleId)
  const enabled = Number.isSafeInteger(numericModuleId) && numericModuleId > 0
  const { module, loading, error, retry } = useModule(numericModuleId, enabled)
  const [lessonOrder, setLessonOrder] = useState<number[] | null>(null)
  const [reordering, setReordering] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [quizOrder, setQuizOrder] = useState<number[] | null>(null)
  const [reorderingQuizzes, setReorderingQuizzes] = useState(false)
  const [editedModuleName, setEditedModuleName] = useState<{
    moduleId: number
    title: string
  } | null>(null)
  const moduleName =
    editedModuleName !== null &&
    module !== null &&
    editedModuleName.moduleId === module.id
      ? editedModuleName.title
      : (module?.title ?? '')

  const orderedLessons = useMemo(() => {
    if (!module || !lessonOrder) return module?.lessons ?? []
    const lessonsById = new Map(
      module.lessons.map((lesson) => [lesson.id, lesson]),
    )
    const ordered = lessonOrder.flatMap((id) => {
      const lesson = lessonsById.get(id)
      return lesson ? [lesson] : []
    })
    const orderedIds = new Set(lessonOrder)
    return [
      ...ordered,
      ...module.lessons.filter((lesson) => !orderedIds.has(lesson.id)),
    ]
  }, [module, lessonOrder])

  const quizIds = module?.quiz_id == null ? [] : [module.quiz_id]
  const orderedQuizIds = quizOrder
    ? [
        ...quizOrder.filter((id) => quizIds.includes(id)),
        ...quizIds.filter((id) => !quizOrder.includes(id)),
      ]
    : quizIds

  const handleSave = async () => {
    if (
      authState.status !== 'authenticated' ||
      authState.user.role !== 'admin' ||
      module === null
    ) {
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const updatedModule = await updateModule(
        authState.user.csrf_token,
        module.id,
        moduleName,
        module.description,
      )
      setEditedModuleName({ moduleId: module.id, title: updatedModule.title })
      updateModuleTitle(module.id, updatedModule.title)
    } catch {
      setSaveError('Unable to save module name. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Deleting archives the content on the server, so the module is reloaded to
  // drop it from the lists. A failure is thrown for the row to display.
  async function deleteContent(remove: (csrfToken: string) => Promise<void>) {
    if (authState.status !== 'authenticated') {
      throw new Error('Your session has expired. Please sign in again.')
    }
    await remove(authState.user.csrf_token)
    retry()
  }

  function handleDragEnd(event: DragEndEvent) {
    if (event.canceled) return
    const source = event.operation.source
    if (
      typeof source?.id !== 'number' ||
      !('index' in source) ||
      typeof source.index !== 'number'
    ) {
      return
    }

    const fromIndex = orderedLessons.findIndex(
      (lesson) => lesson.id === source.id,
    )
    const toIndex = source.index
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= orderedLessons.length ||
      fromIndex === toIndex
    ) {
      return
    }

    const next = [...orderedLessons]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setLessonOrder(next.map((lesson) => lesson.id))
  }

  async function handleReorderClick() {
    if (!reordering) {
      setSaveError(null)
      setReordering(true)
      return
    }

    if (authState.status !== 'authenticated') {
      setSaveError('Your session has expired. Please sign in again.')
      return
    }
    if (!module) return

    setSaving(true)
    setSaveError(null)
    try {
      const result = await reorderLessons(
        module.id,
        orderedLessons.map((lesson) => lesson.id),
        authState.user.csrf_token,
      )
      setLessonOrder(result.ids)
      setReordering(false)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Unable to save lesson order. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleQuizDragEnd(event: DragEndEvent) {
    if (event.canceled) return
    const source = event.operation.source
    if (
      typeof source?.id !== 'number' ||
      !('index' in source) ||
      typeof source.index !== 'number'
    ) {
      return
    }

    const fromIndex = orderedQuizIds.indexOf(source.id)
    const toIndex = source.index
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= orderedQuizIds.length ||
      fromIndex === toIndex
    ) {
      return
    }

    const next = [...orderedQuizIds]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setQuizOrder(next)
  }

  function handleQuizReorderClick() {
    if (!reorderingQuizzes) {
      setReorderingQuizzes(true)
      return
    }
    setReorderingQuizzes(false)
  }

  if (!enabled) {
    return <ErrorState error={new Error('Module not found.')} />
  }
  if (loading) {
    return <LoadingState message="Loading module..." />
  }
  if (error || !module) {
    return (
      <ErrorState
        error={error ?? new Error('Module not found.')}
        retry={retry}
      />
    )
  }

  if (authState.user?.role !== 'admin') {
    return <NoAccess />
  }

  return (
    <>
      {/* header */}
      <div className="mx-10">
        <div className="flex justify-between items-start py-5">
          <h1 className="text-3xl font-bold text-muted-navy">Edit Module</h1>
        </div>
        <div className="grid grid-cols-2 gap-10">
          {/* module renaming */}
          <div>
            <Label
              htmlFor="name"
              className="text-lg pb-3 font-bold text-muted-navy"
            >
              Module Name
            </Label>
            <div className="grid w-full grid-cols-[minmax(0,4fr)_minmax(0,1fr)] gap-10">
              <Input
                id="name"
                placeholder="Rename module.."
                className="rounded-sm border-3 border-stone-200 bg-white"
                value={moduleName}
                onChange={(event) =>
                  setEditedModuleName({
                    moduleId: module.id,
                    title: event.target.value,
                  })
                }
              />
              <SaveFillButton onClick={handleSave} />
            </div>
            {saveError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {saveError}
              </p>
            )}
          </div>
          <div></div>
          {/* lessons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2">
              <Label className="text-lg font-bold text-muted-navy">
                Lessons
              </Label>
              <div className="flex items-center space-x-3">
                <Link to={`/edit-module/${module.id}/create-lesson`}>
                  <PlusButton />
                </Link>
                <ReorderButton
                  reordering={reordering}
                  disabled={saving}
                  onClick={handleReorderClick}
                />
              </div>
            </div>
            {saveError && (
              <p role="alert" className="text-sm text-red-700">
                {saveError}
              </p>
            )}
            <DragDropProvider onDragEnd={handleDragEnd}>
              <div className="space-y-2">
                {orderedLessons.length === 0 && <p>No lessons available.</p>}
                {orderedLessons.map((lesson, index) => (
                  <ContentRow
                    key={lesson.id}
                    id={lesson.id}
                    index={index}
                    name={lesson.title}
                    reordering={reordering}
                    disabled={saving}
                    onDelete={() =>
                      deleteContent((csrfToken) =>
                        deleteLesson(lesson.id, csrfToken),
                      )
                    }
                  />
                ))}
              </div>
            </DragDropProvider>
          </div>
          {/* quizzes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-2">
              <Label className="text-lg font-bold text-muted-navy">
                Quizzes
              </Label>
              <div className="flex items-center space-x-3">
                <Link to={`/edit-module/${module.id}/create-quiz`}>
                  <PlusButton />
                </Link>
                <ReorderButton
                  reordering={reorderingQuizzes}
                  onClick={handleQuizReorderClick}
                />
              </div>
            </div>
            <DragDropProvider onDragEnd={handleQuizDragEnd}>
              <div className="space-y-2">
                {orderedQuizIds.length === 0 && <p>No quizzes available.</p>}
                {orderedQuizIds.map((quizId, index) => (
                  <ContentRow
                    key={quizId}
                    id={quizId}
                    index={index}
                    name={`Quiz ${index + 1}`}
                    contentType="quiz"
                    reordering={reorderingQuizzes}
                    onDelete={() =>
                      deleteContent((csrfToken) =>
                        deleteQuiz(quizId, csrfToken),
                      )
                    }
                  />
                ))}
              </div>
            </DragDropProvider>
          </div>
        </div>
      </div>
    </>
  )
}
