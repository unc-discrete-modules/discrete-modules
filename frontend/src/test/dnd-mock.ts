// Stands in for @dnd-kit in tests, since jsdom cannot drag. A test mocks the
// two modules with these, then calls `drag` to finish a drag as the library
// would. Use in a test file:
//   vi.mock('@dnd-kit/react', async () => (await import('@/test/dnd-mock')).reactModule())
//   vi.mock('@dnd-kit/react/sortable', async () => (await import('@/test/dnd-mock')).sortableModule())
import { act } from '@testing-library/react'
import { createElement, Fragment, type ReactNode } from 'react'

type DragEnd = (event: unknown) => void

const state: { onDragEnd: DragEnd | null } = { onDragEnd: null }

export function reactModule() {
  return {
    DragDropProvider: ({
      onDragEnd,
      children,
    }: {
      onDragEnd: DragEnd
      children: ReactNode
    }) => {
      state.onDragEnd = onDragEnd
      return createElement(Fragment, null, children)
    },
  }
}

export function sortableModule() {
  return {
    useSortable: () => ({
      ref: () => {},
      handleRef: () => {},
      isDragging: false,
    }),
  }
}

// Ends a drag of the item `id`, dropped at `index`, like @dnd-kit/react does.
export function drag(id: string | number, index: number, canceled = false) {
  act(() => {
    state.onDragEnd?.({
      canceled,
      operation: { source: { id, index }, target: { id } },
    })
  })
}
