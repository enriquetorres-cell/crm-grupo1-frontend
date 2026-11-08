import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { mensajeError } from '../api'
import { Alerta, Boton, Campo } from '../components/ui'
import { useSesion } from '../sesion'

// Usuarios de la demo (los crea la ingesta: datos/generar_datos.py del repo infra).
const DEMO = [
  { etiqueta: 'Andina · admin', tenant: 'tenant_andina', email: 'admin@andina.pe', clave: 'DemoAndina2026' },
  { etiqueta: 'Andina · vendedor', tenant: 'tenant_andina', email: 'vendedor@andina.pe', clave: 'DemoAndina2026' },
  { etiqueta: 'Nexo · admin', tenant: 'tenant_nexo', email: 'admin@nexo.pe', clave: 'DemoNexo2026' },
]

export default function Login() {
  const { sesion, entrar } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [tenant, setTenant] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  if (sesion) return <Navigate to="/" replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await entrar(tenant, email, clave)
      navegar((ubicacion.state as { desde?: string } | null)?.desde || '/', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 to-marca-700 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <img src="/favicon.svg" alt="" className="h-10 w-10" />
          <div>
            <div className="text-lg font-semibold">CRM SaaS</div>
            <div className="text-xs text-marca-100">Multi-tenant · Serverless · Eventos</div>
          </div>
        </div>
        <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-lg font-semibold">Iniciar sesión</h1>
          {error && <Alerta>{error}</Alerta>}
          <Campo etiqueta="Empresa (tenant)" placeholder="tenant_andina" value={tenant} onChange={(e) => setTenant(e.target.value)} required autoComplete="organization" />
          <Campo etiqueta="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          <Campo etiqueta="Contraseña" type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" />
          <Boton type="submit" cargando={cargando} className="w-full">
            Entrar
          </Boton>
          <p className="text-center text-sm text-slate-500">
            ¿Tu empresa aún no está?{' '}
            <Link to="/registro" className="font-medium text-marca-600 hover:underline">
              Regístrala
            </Link>
          </p>
        </form>
        <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-marca-50">
          <div className="mb-2 font-medium">Acceso rápido (demo)</div>
          <div className="flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <button
                key={d.etiqueta}
                type="button"
                onClick={() => {
                  setTenant(d.tenant)
                  setEmail(d.email)
                  setClave(d.clave)
                }}
                className="rounded-full bg-white/15 px-3 py-1 hover:bg-white/25"
              >
                {d.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
