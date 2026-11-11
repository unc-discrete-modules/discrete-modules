/** Page where a quiz's content is edited. The route carries the module and quiz ids. */

import { useParams } from 'react-router-dom'
import BackToModuleLink from '@/components/admin/BackToModuleLink'
import { useAuth } from '@/context/auth-context-value'
import NoAccess from './NoAccess'

export default function QuizEdit() {
  const { state: authState } = useAuth()
  const { moduleId } = useParams()

  if (authState.user?.role !== 'admin') {
    return <NoAccess />
  }

  return (
    <div className="mx-10">
      <div className="py-5">
        <BackToModuleLink moduleId={moduleId ?? ''} />
        <h1 className="text-3xl font-bold text-muted-navy">Edit quiz</h1>
      </div>
    </div>
  )
}
