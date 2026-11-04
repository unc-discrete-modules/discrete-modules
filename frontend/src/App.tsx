import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Lesson from './pages/Lesson'
import Module from './pages/Module'
import Layout from './components/Layout'
import { CourseProvider } from './context/course-context'
import { AuthProvider } from './context/auth-context'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import ModuleCreation from './pages/ModuleCreation'
import LessonCreation from './pages/LessonCreation'
import ModuleEdit from './pages/ModuleEdit'

function Quiz() {
  return <h1>Quiz View</h1>
}

function LearningLayout() {
  return (
    <CourseProvider>
      <Outlet />
    </CourseProvider>
  )
}

function App() {
  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth />}>
              <Route element={<LearningLayout />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
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
                  <Route path="/create-module" element={<ModuleCreation />} />
                  <Route
                    path="/edit-module/:moduleId"
                    element={<ModuleEdit />}
                  />
                  <Route path="/create-lesson" element={<LessonCreation />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </>
  )
}

export default App
