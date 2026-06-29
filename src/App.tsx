import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './ui/contexts/AuthContext'
import { Header } from './ui/components/Header'
import { HomePage } from './ui/pages/HomePage'
import { ProductsPage } from './ui/pages/ProductsPage'
import { ProductDetailPage } from './ui/pages/ProductDetailPage'
import { LoginPage } from './ui/pages/LoginPage'
import { RegisterPage } from './ui/pages/RegisterPage'
import { AdminPage } from './ui/pages/AdminPage'
import { ContactPage } from './ui/pages/ContactPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Header />
        <main className="app-body">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/productos" element={<ProductsPage />} />
            <Route path="/producto/:id" element={<ProductDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/contacto" element={<ContactPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
