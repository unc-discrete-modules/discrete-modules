import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Lesson from './pages/Lesson'
import Quiz from './pages/Quiz'
import Layout from './components/Layout'
import { CourseProvider } from './context/course-context'
import { AuthProvider } from './context/auth-context'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import LessonCreation from './pages/LessonCreation'
import QuizCreation from './pages/QuizCreation'
import ModuleEdit from './pages/ModuleEdit'
import AdminHome from './pages/AdminHome'
import NotFound from './pages/NotFound'
import ModuleStart from './pages/ModuleStart'

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
                  <Route path="*" element={<NotFound />} />
                  <Route path="/" element={<Home />} />
                  <Route path="/admin" element={<AdminHome />} />
                  <Route
                    path="/modules/:moduleId"
                    element={<ModuleStart />}
                  />
                  <Route
                    path="/modules/:moduleId/lessons/:lessonId"
                    element={<Lesson />}
                  />
                  <Route
                    path="/modules/:moduleId/quiz/:quizId"
                    element={<Quiz />}
                  />
                  <Route
                    path="/edit-module/:moduleId"
                    element={<ModuleEdit />}
                  />
                  <Route
                    path="/edit-module/:moduleId/create-lesson"
                    element={<LessonCreation />}
                  />
                  <Route
                    path="/edit-module/:moduleId/create-quiz"
                    element={<QuizCreation />}
                  />
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
