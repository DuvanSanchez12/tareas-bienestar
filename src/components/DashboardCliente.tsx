'use client'

import { useState } from 'react'
import TaskList from './TaskList'
import VistaSemanal from './VistaSemanal'

interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  puntos: number
  fecha_limite: string
  created_by: string
  categoria_id?: string | null
  categoria?: { nombre: string } | null
  miProgreso?: number
  promedioTarea?: number
  creator?: { nombre: string }
  tarea_usuarios?: Array<{
    user_id: string
    progreso: number
    user?: { nombre: string; rol: string }
  }>
}

interface Categoria {
  id: string
  nombre: string
}

interface DashboardClienteProps {
  tareas: Tarea[]
  categorias: Categoria[]
  rol: 'jefe' | 'usuario'
  userId: string
  totalTareas: number
  tareasCompletadas: number
  promedioProgreso: number
}

export default function DashboardCliente({
  tareas, categorias, rol, userId,
  totalTareas, tareasCompletadas, promedioProgreso,
}: DashboardClienteProps) {
  const [tab, setTab] = useState<'todas' | 'semanal'>('todas')

  return (
    <div className="fade-in">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={() => setTab('todas')}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius)',
            background: tab === 'todas' ? 'var(--primary)' : 'var(--surface)',
            color: tab === 'todas' ? 'white' : 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: tab === 'todas' ? 'none' : '1px solid var(--border)',
          }}
        >
          📋 Todas
        </button>
        <button
          onClick={() => setTab('semanal')}
          style={{
            padding: '10px 20px',
            borderRadius: 'var(--radius)',
            background: tab === 'semanal' ? 'var(--primary)' : 'var(--surface)',
            color: tab === 'semanal' ? 'white' : 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            border: tab === 'semanal' ? 'none' : '1px solid var(--border)',
          }}
        >
          📅 Semanal
        </button>
      </div>

      {tab === 'todas' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {rol === 'jefe' ? '📊 Dashboard' : '📋 Mis Tareas'}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {rol === 'jefe'
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

          {rol === 'jefe' && categorias.length > 0 && (
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

          <TaskList tareas={tareas} rol={rol} userId={userId} />
        </>
      ) : (
        <>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
              📅 Vista Semanal
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Tareas organizadas por semana desde enero
            </p>
          </div>
          <VistaSemanal tareas={tareas} rol={rol} userId={userId} />
        </>
      )}
    </div>
  )
}
