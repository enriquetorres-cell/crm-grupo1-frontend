import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { FALTAN_URLS } from './config'
import Agenda from './pages/Agenda'
import CuentaDetalle from './pages/CuentaDetalle'
import Cuentas from './pages/Cuentas'
import Leads from './pages/Leads'
import Login from './pages/Login'
import Oportunidades from './pages/Oportunidades'
import Panel from './pages/Panel'
import Registro from './pages/Registro'
import Usuarios from './pages/Usuarios'
import { useSesion } from './sesion'
import type { ReactNode } from 'react'

function Protegida({ children }: { children: ReactNode }) {
  const { sesion } = useSesion()
  const ubicacion = useLocation()
  if (!sesion) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  return <>{children}</>
}

export default function App() {
  if (FALTAN_URLS.length) {
    return (
      <div className="mx-auto max-w-xl p-8 text-sm">
        <h1 className="mb-2 text-lg font-semibold">Falta configurar las APIs</h1>
        <p>
          No están definidas: <b>{FALTAN_URLS.join(', ')}</b>. Copia <code>.env.example</code> a <code>.env.local</code> con
          las URLs, o despliega con <code>./desplegar-frontend.sh</code>, que las lee de CloudFormation.
        </p>
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route
        element={
          <Protegida>
            <Layout />
          </Protegida>
        }
      >
        <Route index element={<Panel />} />
        <Route path="leads" element={<Leads />} />
        <Route path="oportunidades" element={<Oportunidades />} />
        <Route path="cuentas" element={<Cuentas />} />
        <Route path="cuentas/:id" element={<CuentaDetalle />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
