import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Lesson from './pages/Lesson'
import Module from './pages/Module'
import Layout from './components/Layout'
import { CourseProvider } from './context/course-context'
import Login from './pages/Login'

function Quiz() {
  return <h1>Quiz View</h1>
}

function App() {
  return (
    <>
      <BrowserRouter>
        <CourseProvider>
          <Routes>
            {/* the login page should not display a sidebar. */}
            <Route path="/" element={<Login />} />

            <Route element={<Layout />}>
              <Route path="/modules" element={<Home />} />
              <Route path="/modules/:moduleId" element={<Module />} />
              <Route
                path="/modules/:moduleId/lessons/:lessonId"
                element={<Lesson />}
              />
              <Route
                path="/modules/:moduleId/quiz/:quizId"
                element={<Quiz />}
              />
              <Route path="/modules/:moduleId/summary" element={<Quiz />} />
            </Route>
          </Routes>
        </CourseProvider>
      </BrowserRouter>
    </>
  )
}

export default App
