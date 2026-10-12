import { useParams } from 'react-router-dom'

export default function Lessons() {
  const { lessonId } = useParams()
  return <h1>Lesson {lessonId}</h1>
}
