import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Lesson from './pages/Lesson'
import Module from './pages/Module'

function Quiz() {
  return <h1>Quiz View</h1>
}

function Login() {
  return <h1>Login</h1>
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/lessons/:lessonId" element={<Lesson />} />
        <Route path="/lessons/:lessonId/quiz" element={<Quiz />} />
        <Route path="/modules/:moduleId" element={<Module />} />
        <Route path="/modules/:moduleId/quiz" element={<Quiz />} />
      </Routes>
    </>
  )
}

export default App
