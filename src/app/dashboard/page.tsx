import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskList from '@/components/TaskList'

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

  // Calcular estadísticas correctas para el jefe
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
    <div>
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {profile.rol === 'jefe' ? '📊 Dashboard' : '📋 Mis Tareas'}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {profile.rol === 'jefe' 
                ? 'Overview de todas las tareas del equipo'
                : 'Seguimiento de tus tareas asignadas'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'rgba(37, 99, 235, 0.1)' }}>📋</div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{totalTareas}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total de tareas</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'var(--success-light)' }}>✅</div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{tareasCompletadas}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Completadas</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: 'var(--warning-light)' }}>📈</div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' }}>{promedioProgreso}%</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Progreso promedio</div>
            </div>
          </div>
        </div>

        {profile.rol === 'jefe' && categorias.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📂 Progreso por categoría</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {categorias.map((cat) => {
                const tareasCat = tareas.filter(t => t.categoria?.nombre === cat.nombre)
                let totalAsig = 0
                let completadas = 0
                let sumaProgreso = 0
                tareasCat.forEach(t => {
                  if (t.tarea_usuarios) {
                    t.tarea_usuarios.forEach((a: { progreso: number }) => {
                      totalAsig++
                      sumaProgreso += a.progreso
                      if (a.progreso === 100) completadas++
                    })
                  }
                })
                const promedio = totalAsig > 0 ? Math.round(sumaProgreso / totalAsig) : 0
                return (
                  <div key={cat.id} style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>{cat.nombre}</div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span><strong style={{ color: 'var(--text-primary)' }}>{tareasCat.length}</strong> tareas</span>
                      <span><strong style={{ color: 'var(--text-primary)' }}>{completadas}</strong> completadas</span>
                      <span><strong style={{ color: 'var(--text-primary)' }}>{promedio}%</strong> prom.</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <TaskList tareas={tareas} rol={profile.rol} userId={user.id} />
      </div>
    </div>
  )
}