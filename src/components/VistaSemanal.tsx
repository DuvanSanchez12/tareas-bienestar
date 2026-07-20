'use client'

import { useState, useMemo } from 'react'
import TaskList from './TaskList'
import styles from './VistaSemanal.module.css'

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

interface VistaSemanalProps {
  tareas: Tarea[]
  rol: 'jefe' | 'usuario'
  userId: string
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
}

function generarSemanas(): { label: string; lunes: Date; domingo: Date }[] {
  const hoy = new Date()
  const lunesHoy = getMonday(hoy)
  const enero = new Date(hoy.getFullYear(), 0, 1)
  const lunesEnero = getMonday(enero)

  const semanas: { label: string; lunes: Date; domingo: Date }[] = []
  const current = new Date(lunesHoy)

  while (current >= lunesEnero) {
    const lunes = new Date(current)
    const domingo = new Date(current)
    domingo.setDate(domingo.getDate() + 6)
    semanas.push({
      label: `Semana del ${formatDate(lunes)} al ${formatDate(domingo)}`,
      lunes,
      domingo,
    })
    current.setDate(current.getDate() - 7)
  }
  return semanas
}

function tareaEnSemana(fechaLimite: string, lunes: Date, domingo: Date): boolean {
  const fecha = new Date(fechaLimite)
  fecha.setHours(0, 0, 0, 0)
  return fecha >= lunes && fecha <= domingo
}

export default function VistaSemanal({ tareas, rol, userId }: VistaSemanalProps) {
  const semanas = useMemo(() => generarSemanas(), [])
  const [semanaIdx, setSemanaIdx] = useState(0)

  const semanaActual = semanas[semanaIdx]

  const tareasSemana = useMemo(() => {
    if (!semanaActual) return []
    return tareas.filter(t => tareaEnSemana(t.fecha_limite, semanaActual.lunes, semanaActual.domingo))
  }, [tareas, semanaActual])

  if (semanas.length === 0) return null

  return (
    <div className={styles.container}>
      <div className={styles.selector}>
        <label className={styles.label}>📅 Seleccionar semana</label>
        <select
          className={styles.select}
          value={semanaIdx}
          onChange={e => setSemanaIdx(Number(e.target.value))}
        >
          {semanas.map((s, i) => (
            <option key={i} value={i}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.weekInfo}>
        <strong>{semanaActual.label}</strong>
        <span className={styles.count}>{tareasSemana.length} tarea{tareasSemana.length !== 1 ? 's' : ''}</span>
      </div>

      {tareasSemana.length > 0 ? (
        <TaskList tareas={tareasSemana} rol={rol} userId={userId} />
      ) : (
        <div className={styles.empty}>
          <p>No hay tareas en esta semana</p>
        </div>
      )}
    </div>
  )
}
