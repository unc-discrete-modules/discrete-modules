import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Lesson from './pages/Lesson'
import Module from './pages/Module'
import Quiz from './pages/Quiz'
import Layout from './components/Layout'
import { CourseProvider } from './context/course-context'
import { AuthProvider } from './context/auth-context'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'

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
