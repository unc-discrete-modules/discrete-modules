import { useEffect, type MouseEvent } from 'react'

// Guards against losing edits. Closing or reloading the tab gets the browser's
// own warning. The returned handler is for links out of the page: it asks
// first when changes are unsaved. (The app's router cannot block other
// navigation, such as the sidebar.)
export function useUnsavedChangesGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return function confirmLeave(event: MouseEvent<HTMLAnchorElement>) {
    if (dirty && !window.confirm('Leave without saving your changes?')) {
      event.preventDefault()
    }
  }
}
