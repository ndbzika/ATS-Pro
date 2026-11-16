import { Routes, Route } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/resumes" element={<Dashboard />} />
        <Route path="/resumes/:id" element={<Editor />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </>
  )
}
