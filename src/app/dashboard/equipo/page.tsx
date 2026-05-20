import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    .order('nombre')

  const { data: tareaUsuarios } = await supabase
    .from('tarea_usuarios')
    .select('user_id, progreso')

  const usuariosConStats = (usuarios || []).map((u) => {
    const asignaciones = (tareaUsuarios || []).filter((a) => a.user_id === u.id)
    const totalTareas = asignaciones.length
    const promedioProgreso = totalTareas > 0
      ? Math.round(asignaciones.reduce((acc, a) => acc + a.progreso, 0) / totalTareas)
      : 0

    return {
      ...u,
      totalTareas,
      promedioProgreso,
    }
  })

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Equipo</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {usuariosConStats.map((u) => (
          <div
            key={u.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>{u.nombre}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
              {u.email}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <span>
                <strong>{u.totalTareas}</strong> tareas asignadas
              </span>
              <span>
                <strong>{u.promedioProgreso}%</strong> progreso promedio
              </span>
            </div>
          </div>
        ))}
        {usuariosConStats.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No hay usuarios en el equipo</p>
        )}
      </div>
    </div>
  )
}