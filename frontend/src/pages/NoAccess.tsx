// Referenced from https://medium.com/@michal-worwag/redirect-with-react-router-99aa0b74852a.
// Use for pages that "student" users do not have access to.

import { Spinner } from '@/components/ui/spinner'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

const NoAccess = () => {
  const [redirect, setRedirect] = useState(false)
  const navigate = useNavigate()

  setTimeout(() => {
    setRedirect(true)
  }, 3000)

  useEffect(() => {
    if (redirect) {
      navigate('/')
    }
  }, [redirect, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center">
      <h1 className="text-muted-navy text-lg pt-15">
        You do not have access to this page.
      </h1>
      <p className="text-muted-foreground pt-15 pb-10">
        You will be redirected to the home page in 3 seconds.
      </p>
      <Spinner className="size-8" />
    </div>
  )
}

export default NoAccess
