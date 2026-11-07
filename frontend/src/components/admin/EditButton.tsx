/** Button that navigates to module editing. */

import { SquarePen } from 'lucide-react'
import { Button } from '../ui/button'
import { Link } from 'react-router-dom'

export default function EditButton() {
  return (
    <>
      <Link to="/edit-module/:moduleId">
        <Button className="w-full truncate rounded-md bg-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:saturate-130 hover:scale-102">
          Edit
          <SquarePen />
        </Button>
      </Link>
    </>
  )
}
