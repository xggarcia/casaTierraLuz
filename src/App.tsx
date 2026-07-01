import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './ui/contexts/AuthContext'
import { CartProvider } from './ui/contexts/CartContext'
import { Header } from './ui/components/Header'
import { HomePage } from './ui/pages/HomePage'
import { ProductsPage } from './ui/pages/ProductsPage'
import { ProductDetailPage } from './ui/pages/ProductDetailPage'
import { LoginPage } from './ui/pages/LoginPage'
import { RegisterPage } from './ui/pages/RegisterPage'
import { AdminPage } from './ui/pages/AdminPage'
import { ContactPage } from './ui/pages/ContactPage'
import { CartPage } from './ui/pages/CartPage'
import { CartDrawer } from './ui/components/CartDrawer'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Header />
          <CartDrawer />
          <main className="app-body">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/productos" element={<ProductsPage />} />
              <Route path="/producto/:id" element={<ProductDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/carrito" element={<CartPage />} />
            </Routes>
          </main>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
