import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { LanguageProvider } from './ui/contexts/LanguageContext'
import { AuthProvider } from './ui/contexts/AuthContext'
import { UserCoursesProvider } from './ui/contexts/UserCoursesContext'
import { useAuth } from './ui/contexts/AuthContext'
import { HomePage } from './ui/pages/HomePage/HomePage'
import { CoursePage } from './ui/pages/CoursePage/CoursePage'
import { CoursesPage } from './ui/pages/CoursesPage/CoursesPage'
import { MisCoursesPage } from './ui/pages/MisCoursesPage/MisCoursesPage'
import { AdminPage } from './ui/pages/AdminPage/AdminPage'
import { EnrollmentsPage } from './ui/pages/EnrollmentsPage/EnrollmentsPage'
import { ProfilePage } from './ui/pages/ProfilePage/ProfilePage'
import { PruebasPage } from './ui/pages/PruebasPage/PruebasPage'
import { PaymentSuccessPage } from './ui/pages/PaymentSuccessPage/PaymentSuccessPage'
import { TeachersPage } from './ui/pages/TeachersPage/TeachersPage'
import { TeacherDetailPage } from './ui/pages/TeachersPage/TeacherDetailPage'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAnyOrgStaff, isSuperAdmin, loading } = useAuth()
  const navigate = useNavigate()
  const canEnter = isAnyOrgStaff || isSuperAdmin

  useEffect(() => {
    if (!loading && !canEnter) navigate('/', { replace: true })
  }, [canEnter, loading, navigate])

  if (loading || !canEnter) return null
  return <>{children}</>
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <UserCoursesProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/cursos" element={<CoursesPage />} />
              <Route path="/mis-cursos" element={<MisCoursesPage />} />
              <Route path="/curso/:slug" element={<CoursePage />} />
              <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
              <Route path="/admin/inscritos/:slug" element={<AdminGuard><EnrollmentsPage /></AdminGuard>} />
              <Route path="/profesorado" element={<TeachersPage />} />
              <Route path="/profesorado/:slug" element={<TeacherDetailPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/pruebas" element={<PruebasPage />} />
              <Route path="/pago-ok" element={<PaymentSuccessPage />} />
            </Routes>
          </BrowserRouter>
        </UserCoursesProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
