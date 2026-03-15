import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Splash from './pages/Splash'
import Home from './pages/Home'
import Detail from './pages/Detail'
import AddEdit from './pages/AddEdit'
import Login from './pages/Login'
import OfflineBanner from './components/OfflineBanner'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/splash" replace />} />
        <Route path="/splash" element={<Splash />} />
        <Route path="/home" element={<Home />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/add" element={<AddEdit />} />
        <Route path="/edit/:id" element={<AddEdit />} />
        <Route path="/login" element={<Login />} />
      </Routes>
      <OfflineBanner />
    </BrowserRouter>
  )
}
