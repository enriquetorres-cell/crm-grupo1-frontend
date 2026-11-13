import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { especificacion } from '../openapi'
import { useSesion } from '../sesion'

/** Swagger UI de las 5 APIs. Se carga aparte (import dinámico) para no engordar el resto de la app. */
export default function Docs() {
  const { sesion } = useSesion()
  const contenedor = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    Promise.all([import('swagger-ui-dist/swagger-ui-bundle.js'), import('swagger-ui-dist/swagger-ui.css')])
      .then(([modulo]) => {
        if (!vivo || !contenedor.current) return
        const SwaggerUIBundle = (modulo as any).default || modulo
        const ui = SwaggerUIBundle({
          spec: especificacion(),
          domNode: contenedor.current,
          docExpansion: 'list',
          defaultModelsExpandDepth: -1,
          tryItOutEnabled: true,
          persistAuthorization: true,
        })
        if (sesion?.token) ui.preauthorizeApiKey('bearer', sesion.token)
      })
      .catch((e) => setError(String(e)))
    return () => {
      vivo = false
    }
  }, [sesion?.token])

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-marca-900 px-4 py-3 text-sm text-white">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          <span className="font-semibold">API del CRM · Swagger</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-marca-100">{sesion ? `Token de ${sesion.usuario.email} (${sesion.tenant_id}) cargado` : 'Sin sesión: usa POST /ms1/login y Authorize'}</span>
          <Link to={sesion ? '/' : '/login'} className="rounded bg-white/15 px-3 py-1 hover:bg-white/25">
            {sesion ? 'Volver a la app' : 'Iniciar sesión'}
          </Link>
        </div>
      </div>
      {error && <p className="p-4 text-sm text-red-700">No se pudo cargar Swagger UI: {error}</p>}
      <div ref={contenedor} />
    </div>
  )
}
