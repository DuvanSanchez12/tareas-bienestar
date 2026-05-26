import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamView from '@/components/TeamView'

export default async function EquipoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.rol !== 'jefe') {
    redirect('/dashboard')
  }

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('*')
    .eq('rol', 'usuario')
    .eq('jefe_id', user.id)
    .order('nombre')

  const { data: tareas } = await supabase
    .from('tareas')
    .select('id, titulo, descripcion, puntos, fecha_limite')
    .eq('created_by', user.id)

  const tareasIds = (tareas || []).map(t => t.id)

  const { data: tareaUsuarios } = tareasIds.length > 0
    ? await supabase.from('tarea_usuarios').select('id, tarea_id, user_id, progreso').in('tarea_id', tareasIds)
    : { data: [] }

  const tareasMap = new Map((tareas || []).map(t => [t.id, t]))

  const usuariosConStats = (usuarios || []).map((u) => {
    const asignaciones = (tareaUsuarios || []).filter((a) => a.user_id === u.id)
    const totalTareas = asignaciones.length
    const promedioProgreso = totalTareas > 0
      ? Math.round(asignaciones.reduce((acc, a) => acc + a.progreso, 0) / totalTareas)
      : 0

    const tareasDelUsuario = asignaciones
      .map((a) => {
        const t = tareasMap.get(a.tarea_id)
        if (!t) return null
        return {
          tu_id: a.id,
          tarea_id: a.tarea_id,
          titulo: t.titulo,
          descripcion: t.descripcion,
          puntos: t.puntos,
          fecha_limite: t.fecha_limite,
          progreso: a.progreso,
        }
      })
      .filter(Boolean) as Array<{
        tu_id: string
        tarea_id: string
        titulo: string
        descripcion: string | null
        puntos: number
        fecha_limite: string
        progreso: number
      }>

    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      totalTareas,
      promedioProgreso,
      tareas: tareasDelUsuario,
    }
  })

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Equipo</h2>
      <TeamView usuarios={usuariosConStats} />
    </div>
  )
}