import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/auth-context-value'
import { Separator } from '@base-ui/react'

type TutorialDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const { state } = useAuth()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="px-2 pt-5 text-xl">Welcome!</DialogTitle>
        </DialogHeader>
        <div className="px-2 pt-2 text-md">
          {state.user?.role === 'admin' && (
            <ul className="list-disc pl-5 flex flex-col gap-5 text-muted-navy">
              <p>
                As an admin, you can switch to the admin view from the
                dashboard.
              </p>
              <p>
                In the admin view, you will be able to create, edit, delete, and
                reorder modules.
              </p>
              <p>
                When editing a module, you can change its name, add lessons, or
                add quizzes.
              </p>
              <Separator></Separator>
            </ul>
          )}
          <ul className="list-disc pl-5 flex flex-col gap-5 text-muted-navy">
            <p>
              As a student, choose a module from the sidebar to get started.
            </p>
            <p>Each module contains lessons and/or quizzes.</p>
            <p>
              You can view lecture content and recordings in each lesson, then
              mark the lesson as complete.
            </p>
            <p>
              You can also take quizzes to test your knowledge and receive
              feedback upon submission.
            </p>
          </ul>
        </div>
        <DialogFooter>
          <DialogClose render={<Button>Let's get started!</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
