export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <p role="status" className="p-4 text-sm text-gray-500">
      {message}
    </p>
  )
}

export function ErrorState({
  error,
  retry,
}: {
  error: Error
  retry?: () => void
}) {
  return (
    <div role="alert" className="p-4 text-sm">
      <p>{error.message}</p>
      {retry && (
        <button type="button" className="mt-2 underline" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  )
}
