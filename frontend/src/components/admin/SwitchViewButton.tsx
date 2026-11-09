/** Button that triggers switching between admin and student view. */

import { GraduationCap, UserKey } from 'lucide-react'
import { Button } from '../ui/button'

type viewButtonProps = {
  viewType: string
}

export default function SwitchViewButton({ viewType }: viewButtonProps) {
  return (
    <>
      <Button
        variant="outline"
        className="rounded-md border-light-blue border-3 text-light-blue font-bold drop-shadow-sm drop-shadow-muted-navy/25 transition ease-in-out hover:text-light-blue hover:bg-lightest-blue hover:scale-102"
      >
        Switch to {viewType} View
        {viewType == 'Student' ? <GraduationCap /> : <UserKey />}
      </Button>
    </>
  )
}
