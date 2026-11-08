export type Rol = 'admin' | 'gerente' | 'vendedor'
export type Plan = 'basico' | 'pro' | 'enterprise'

export interface Usuario {
  tenant_id: string
  email: string
  nombre: string
  rol: Rol
  activo: boolean
  creado_en: string
}

export interface Sesion {
  token: string
  expira_en: number
  tenant_id: string
  tenant_nombre: string
  usuario: Usuario
  plan: Plan
}

export type EstadoLead = 'nuevo' | 'contactado' | 'calificado' | 'convertido' | 'descartado'
export type Temperatura = 'caliente' | 'tibio' | 'frio'

export interface Lead {
  lead_id: string
  empresa: string
  nombre?: string | null
  apellido?: string | null
  cargo?: string | null
  email?: string | null
  telefono?: string | null
  fuente: string
  ruc?: string | null
  empleados: number
  monto_estimado: number
  puntaje: number
  temperatura: Temperatura
  estado: EstadoLead
  propietario?: string | null
  origen: string
  creado_en: string
  motivo_descarte?: string
}

export interface Cuenta {
  id: number
  ruc: string | null
  razon_social: string
  dominio_email: string | null
  industria: string | null
  distrito: string | null
  estado: 'prospecto' | 'cliente' | 'inactivo'
  segmento: 'A' | 'B' | 'C'
  monto_ganado_12m: number
  propietario: string | null
  lead_id: string | null
  creado_en: string
  ultima_actividad_en: string | null
  contactos?: Contacto[]
}

export interface Contacto {
  id: number
  cuenta_id: number
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  cargo: string | null
  es_principal: boolean
}

export type Etapa = 'prospeccion' | 'calificacion' | 'propuesta' | 'negociacion' | 'ganada' | 'perdida'

export interface Oportunidad {
  id: number
  titulo: string
  cuenta_id: number | null
  lead_id: string | null
  propietario: string | null
  etapa: Etapa
  monto: number
  probabilidad: number
  monto_ponderado: number
  fecha_cierre_estimada: string | null
  motivo_perdida: string | null
  actualizado_en: string
  cotizaciones?: Cotizacion[]
}

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada'

export interface Cotizacion {
  id: number
  oportunidad_id: number
  estado: EstadoCotizacion
  descuento_pct: number
  subtotal: number
  descuento: number
  base_imponible: number
  igv: number
  total: number
  vence_en: string
  documento_key: string | null
  documento_url?: string
  creado_por: string | null
  creado_en: string
}

export interface Producto {
  id: number
  codigo: string
  nombre: string
  precio: number
}

export type TipoActividad = 'llamada' | 'reunion' | 'tarea' | 'email' | 'nota'

export interface Actividad {
  actividad_id: string
  tipo: TipoActividad
  titulo: string
  vendedor: string
  estado: 'pendiente' | 'completada' | 'cancelada' | 'vencida'
  ref?: string | null
  notas?: string | null
  inicio?: string
  fin?: string
  vence_en?: string
  creado_por: string
  creado_en: string
}

export interface EntradaHistorial {
  ref_key: string
  orden: string
  evento: string
  titulo: string
  ocurrido_en: string
}

/** Listado de PostgreSQL (MS2, MS4). */
export interface PaginaSql<T> {
  total: number
  page: number
  limit: number
  items: T[]
}

/** Listado de DynamoDB (MS1, MS3, MS5): cursor en vez de número de página. */
export interface PaginaCursor<T> {
  limit: number
  items: T[]
  siguiente: string | null
}
