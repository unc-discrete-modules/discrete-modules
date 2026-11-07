/** Button that opens the module creation popover. */

import type { ComponentProps } from 'react'
import { Button } from '../ui/button'
import { Plus } from 'lucide-react'

export default function CreateButton({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className="rounded-md border-light-green border-3 text-light-green font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-green hover:bg-lightest-green hover:scale-102 aria-expanded:bg-background aria-expanded:text-light-green aria-expanded:hover:bg-lightest-green dark:aria-expanded:bg-transparent dark:aria-expanded:hover:bg-lightest-green"
      {...props}
    >
      Create
      <Plus className="stroke-light-green" />
      {children}
    </Button>
  )
}
