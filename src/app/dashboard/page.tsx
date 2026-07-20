import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardCliente from '@/components/DashboardCliente'

export default async function DashboardPage() {
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

  if (!profile) {
    redirect('/')
  }

  let tareas: any[] = []
  let categorias: { id: string; nombre: string }[] = []

  if (profile.rol === 'jefe') {
    const { data: tareasData } = await supabase
      .from('tareas')
      .select('*')
      .eq('created_by', user.id)
      .order('fecha_limite', { ascending: true })

    const tareasIds = (tareasData || []).map(t => t.id)
    const creatorIds = [...new Set((tareasData || []).map(t => t.created_by).filter(Boolean))]
    const categoriaIds = [...new Set((tareasData || []).map(t => t.categoria_id).filter(Boolean))]

    const [creatorsData, asignacionesData, categoriasData] = await Promise.all([
      creatorIds.length > 0 
        ? supabase.from('profiles').select('id, nombre').in('id', creatorIds).then(r => r.data || [])
        : Promise.resolve([]),
      supabase.from('tarea_usuarios').select('*, user:profiles(nombre, rol)').in('tarea_id', tareasIds).then(r => r.data || []),
      categoriaIds.length > 0
        ? supabase.from('categorias').select('id, nombre').in('id', categoriaIds).then(r => r.data || [])
        : Promise.resolve([]),
    ])

    const creatorsMap = new Map(creatorsData.map(c => [c.id, c.nombre]))
    const categoriasMap = new Map(categoriasData.map(c => [c.id, c.nombre]))
    categorias = categoriasData

    tareas = (tareasData || [])
      .map(tarea => {
        const asignacionesTarea = asignacionesData.filter(a => a.tarea_id === tarea.id)
        const promedioTarea = asignacionesTarea.length > 0
          ? Math.round(asignacionesTarea.reduce((acc, a) => acc + a.progreso, 0) / asignacionesTarea.length)
          : 0
        const miProgreso = asignacionesTarea.find(a => a.user_id === user.id)?.progreso
        return {
          ...tarea,
          promedioTarea,
          miProgreso,
          creator: creatorsMap.has(tarea.created_by) ? { nombre: creatorsMap.get(tarea.created_by) } : null,
          categoria: tarea.categoria_id && categoriasMap.has(tarea.categoria_id)
            ? { nombre: categoriasMap.get(tarea.categoria_id) }
            : null,
          tarea_usuarios: asignacionesTarea,
        }
      })
      .filter(t => t.tarea_usuarios.length > 0)
  } else {
    const { data: asignaciones } = await supabase
      .from('tarea_usuarios')
      .select('*, tarea:tareas(*)')
      .eq('user_id', user.id)

    const tareasIds = (asignaciones || []).map(a => a.tarea_id)
    const categoriaIds = [...new Set((asignaciones || []).map(a => a.tarea?.categoria_id).filter(Boolean))]
    const creatorsData = tareasIds.length > 0 
      ? await supabase.from('profiles').select('id, nombre').in('id', [...new Set((asignaciones || []).map(a => a.tarea?.created_by).filter(Boolean))]).then(r => r.data || [])
      : []
    const categoriasData = categoriaIds.length > 0
      ? await supabase.from('categorias').select('id, nombre').in('id', categoriaIds).then(r => r.data || [])
      : []
    
    const creatorsMap = new Map(creatorsData.map(c => [c.id, c.nombre]))
    const categoriasMap = new Map(categoriasData.map(c => [c.id, c.nombre]))

    tareas = (asignaciones || []).map(t => ({
      ...t.tarea,
      miProgreso: t.progreso,
      creator: t.tarea?.created_by && creatorsMap.has(t.tarea.created_by) 
        ? { nombre: creatorsMap.get(t.tarea.created_by) } 
        : null,
      categoria: t.tarea?.categoria_id && categoriasMap.has(t.tarea.categoria_id)
        ? { nombre: categoriasMap.get(t.tarea.categoria_id) }
        : null,
      tarea_usuarios: [],
    }))
  }

  // Calcular estadísticas
  let totalTareas = tareas.length
  let tareasCompletadas = 0
  let sumaPromedios = 0
  let totalAsignaciones = 0

  if (profile.rol === 'jefe') {
    for (const tarea of tareas) {
      if (tarea.tarea_usuarios && tarea.tarea_usuarios.length > 0) {
        for (const asig of tarea.tarea_usuarios) {
          totalAsignaciones++
          sumaPromedios += asig.progreso
          if (asig.progreso === 100) {
            tareasCompletadas++
          }
        }
      }
    }
  } else {
    tareasCompletadas = tareas.filter(t => (t.miProgreso || 0) === 100).length
    sumaPromedios = tareas.reduce((acc, t) => acc + (t.miProgreso || 0), 0)
    totalAsignaciones = tareas.length
  }

  const promedioProgreso = totalAsignaciones > 0 ? Math.round(sumaPromedios / totalAsignaciones) : 0

  return (
    <DashboardCliente
      tareas={tareas}
      categorias={categorias}
      rol={profile.rol}
      userId={user.id}
      totalTareas={totalTareas}
      tareasCompletadas={tareasCompletadas}
      promedioProgreso={promedioProgreso}
    />
  )
}
