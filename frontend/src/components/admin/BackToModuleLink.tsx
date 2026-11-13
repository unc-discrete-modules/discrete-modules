/** Link from a lesson or quiz page back to the module's editor. */

import type { MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button-variants'

// A link, not a button inside a link, so it is one control.
export default function BackToModuleLink({
  moduleId,
  onClick,
}: {
  moduleId: number | string
  // Called before navigating; calling preventDefault keeps the admin here.
  onClick?: MouseEventHandler<HTMLAnchorElement>
}) {
  return (
    <Link
      to={`/edit-module/${moduleId}`}
      onClick={onClick}
      className={`${buttonVariants({ variant: 'outline' })} mb-4 rounded-md border-light-blue font-bold text-muted-navy`}
    >
      <ArrowLeft aria-hidden="true" />
      Back to module editing
    </Link>
  )
}
