import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import Maintenance from './pages/Maintenance'
import WorkOrders from './pages/WorkOrders'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Quotes from './pages/Quotes'
import Checklists from './pages/Checklists'
import Appointments from './pages/Appointments'
import Certificates from './pages/Certificates'
import Chat from './pages/Chat'
import Callouts from './pages/Callouts'
import CalloutReports from './pages/CalloutReports'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }
  
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="work-orders" element={<WorkOrders />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="chat" element={<Chat />} />
        <Route path="callouts" element={<Callouts />} />
        <Route path="callout-reports" element={<CalloutReports />} />
      </Route>
    </Routes>
  )
}

export default App
