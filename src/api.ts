import { URLS, type Ms } from './config'
import type { PaginaCursor } from './tipos'

const CLAVE_SESION = 'crm.sesion'

/** Error con el formato del backend: {error, detalle}. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public codigo: string,
    public detalle: unknown,
  ) {
    super(codigo)
  }
}

function token(): string | null {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null')?.token ?? null
  } catch {
    return null
  }
}

type Query = Record<string, string | number | undefined | null>

export async function api<T>(
  ms: Ms,
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; query?: Query } = {},
): Promise<T> {
  const url = new URL(URLS[ms] + ruta)
  for (const [k, v] of Object.entries(opciones.query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = token()
  if (t) cabeceras.Authorization = `Bearer ${t}`

  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: opciones.metodo || 'GET',
      headers: cabeceras,
      body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
    })
  } catch {
    throw new ApiError(0, 'sin_conexion', `No se pudo conectar con ${ms.toUpperCase()}`)
  }
  const texto = await respuesta.text()
  let datos: any = null
  try {
    datos = texto ? JSON.parse(texto) : null
  } catch {
    datos = { error: 'respuesta_invalida', detalle: texto }
  }
  // Token inválido o vencido: API Gateway responde 401 (sin token) o 403 {"message":"Forbidden"}
  // (el Authorizer lo rechazó). Un 403 de NUESTRO backend trae {error: 'rol_insuficiente'}.
  const rechazadoPorAuthorizer = respuesta.status === 401 || (respuesta.status === 403 && datos?.message && !datos?.error)
  if (rechazadoPorAuthorizer && t) window.dispatchEvent(new Event('crm:sesion-expirada'))
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, datos?.error || datos?.message || 'error', datos?.detalle ?? null)
  }
  return datos as T
}

/**
 * Listado de DynamoDB con filtro: `limit` cuenta los ítems LEÍDOS antes del filtro, así que una
 * página puede venir vacía aunque haya más resultados. Se sigue el cursor hasta juntar `minimo`
 * ítems o hasta que no haya más.
 */
export async function paginaCursor<T>(
  ms: Ms,
  ruta: string,
  query: Query,
  desde: string | null = null,
  minimo = 20,
): Promise<PaginaCursor<T>> {
  const items: T[] = []
  let siguiente = desde
  for (let i = 0; i < 25; i++) {
    const pagina = await api<PaginaCursor<T>>(ms, ruta, { query: { limit: 100, ...query, siguiente } })
    items.push(...pagina.items)
    siguiente = pagina.siguiente
    if (!siguiente || items.length >= minimo) break
  }
  return { limit: minimo, items, siguiente }
}

const MENSAJES: Record<string, string> = {
  credenciales_invalidas: 'Empresa, email o contraseña incorrectos',
  cuenta_suspendida: 'El usuario o la empresa están suspendidos',
  rol_insuficiente: 'Tu rol no tiene permiso para esta acción',
  limite_plan: 'Llegaste al límite de tu plan',
  sin_conexion: 'No hay conexión con el servidor',
  error_interno: 'Error interno del servidor',
  Unauthorized: 'La sesión expiró: vuelve a iniciar sesión',
  Forbidden: 'La sesión expiró: vuelve a iniciar sesión',
}

export function mensajeError(e: unknown): string {
  if (!(e instanceof ApiError)) return e instanceof Error ? e.message : String(e)
  const base = MENSAJES[e.codigo]
  const d = e.detalle
  const detalle = Array.isArray(d)
    ? d.join(' · ')
    : typeof d === 'string'
      ? d
      : d && typeof d === 'object'
        ? Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(', ')
        : ''
  return [base || e.codigo.replace(/_/g, ' '), detalle].filter(Boolean).join(' — ')
}

export const sesionGuardada = {
  leer: () => {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null')
    } catch {
      return null
    }
  },
  guardar: (s: unknown) => {
    try {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(s))
    } catch {
      /* modo privado: la sesión vive solo en memoria */
    }
  },
  borrar: () => {
    try {
      localStorage.removeItem(CLAVE_SESION)
    } catch {
      /* nada */
    }
  },
}
