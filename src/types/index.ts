export type UserRole = 'jefe' | 'usuario'

export interface Profile {
  id: string
  email: string
  nombre: string
  rol: UserRole
  created_at: string
}

export interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  puntos: number
  fecha_limite: string
  created_by: string
  created_at: string
  creator?: Profile
  asignaciones?: TareaUsuario[]
}

export interface TareaUsuario {
  id: string
  tarea_id: string
  user_id: string
  progreso: number
  checked_at: string | null
  user?: Profile
}

export interface DashboardStats {
  totalTareas: number
  tareasCompletadas: number
  promedioProgreso: number
}