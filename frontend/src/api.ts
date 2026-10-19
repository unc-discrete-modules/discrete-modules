export const SESSION_EXPIRED = 'dm-session-expired'

export async function apiFetch(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
  })
  if (response.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED))
  }
  return response
}
