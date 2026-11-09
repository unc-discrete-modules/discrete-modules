// For routes that do not exist.

import { Button } from '@/components/ui/button'
import { FaceSlightlyFrowning } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center">
      <h1 className="text-muted-navy text-lg pt-15 pb-10">Page not found.</h1>
      <FaceSlightlyFrowning size={80} className="stroke-muted-foreground" />
      <p className="text-muted-foreground p-10">
        Want to go back to the dashboard?
      </p>
      <Link to="/">
        <Button
          variant="outline"
          className="rounded-md border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:bg-lightest-blue hover:scale-102"
        >
          Take me back
        </Button>
      </Link>
    </div>
  )
}
