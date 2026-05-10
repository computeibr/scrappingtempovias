import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Monitor from './pages/Monitor';
import Feriados from './pages/Feriados';
import Metodologia from './pages/Metodologia';
import Usuarios from './pages/Usuarios';
import Ajustes from './pages/Ajustes';
import Saude from './pages/Saude';
import Agente from './pages/Agente';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <Admin />
              </PrivateRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <PrivateRoute>
                <Usuarios />
              </PrivateRoute>
            }
          />
          <Route
            path="/monitor"
            element={
              <PrivateRoute>
                <Monitor />
              </PrivateRoute>
            }
          />
          <Route
            path="/feriados"
            element={
              <PrivateRoute>
                <Feriados />
              </PrivateRoute>
            }
          />
          <Route
            path="/metodologia"
            element={
              <PrivateRoute>
                <Metodologia />
              </PrivateRoute>
            }
          />
          <Route
            path="/ajustes"
            element={
              <PrivateRoute>
                <Ajustes />
              </PrivateRoute>
            }
          />
          <Route
            path="/saude"
            element={
              <PrivateRoute>
                <Saude />
              </PrivateRoute>
            }
          />
          <Route
            path="/agente"
            element={
              <PrivateRoute>
                <Agente />
              </PrivateRoute>
            }
          />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
