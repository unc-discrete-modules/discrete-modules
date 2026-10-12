import { useParams } from 'react-router-dom'

export default function Modules() {
  const { moduleId } = useParams()
  return <h1>Module {moduleId}</h1>
}
