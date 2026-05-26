'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './TeamView.module.css'

interface TareaAsignada {
  tu_id: string
  tarea_id: string
  titulo: string
  descripcion: string | null
  puntos: number
  fecha_limite: string
  progreso: number
}

interface UsuarioConTareas {
  id: string
  email: string
  nombre: string
  totalTareas: number
  promedioProgreso: number
  tareas: TareaAsignada[]
}

interface TeamViewProps {
  usuarios: UsuarioConTareas[]
}

function getDiasRestantes(fechaLimite: string): number {
  const hoy = new Date()
  const limite = new Date(fechaLimite)
  const diff = limite.getTime() - hoy.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getColorVencimiento(fechaLimite: string): string {
  const dias = getDiasRestantes(fechaLimite)
  if (dias < 0) return 'rojo'
  if (dias <= 3) return 'amarillo'
  return 'verde'
}

function getColorProgreso(progreso: number): string {
  if (progreso < 50) return 'bajo'
  if (progreso < 80) return 'medio'
  return 'alto'
}

function getLabelCompletado(progreso: number): string {
  if (progreso === 0) return 'Sin iniciar'
  if (progreso < 50) return 'En progreso'
  if (progreso < 80) return 'Casi lista'
  if (progreso === 100) return 'Completada'
  return 'Por terminar'
}

export default function TeamView({ usuarios }: TeamViewProps) {
  const supabase = createClient()
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ tu_id: string; titulo: string; userName: string } | null>(null)

  const toggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId)
  }

  const handleDelete = async (tuId: string) => {
    setDeleting(tuId)
    await supabase.from('tarea_usuarios').delete().eq('id', tuId)
    setConfirmDelete(null)
    setDeleting(null)
    window.location.reload()
  }

  return (
    <div>
      {/* Modal de confirmación */}
      {confirmDelete && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>🗑️</div>
            <h2 className={styles.modalTitle}>¿Eliminar asignación?</h2>
            <p className={styles.modalText}>
              Se eliminará la tarea <strong>"{confirmDelete.titulo}"</strong> de <strong>{confirmDelete.userName}</strong>.
            </p>
            <p className={styles.modalSubtext}>El progreso se perderá. La tarea seguirá existiendo.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.deleteConfirmBtn}
                onClick={() => handleDelete(confirmDelete.tu_id)}
                disabled={deleting === confirmDelete.tu_id}
              >
                {deleting === confirmDelete.tu_id ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {usuarios.map((u) => {
          const isExpanded = expandedUserId === u.id

          return (
            <div key={u.id} className={styles.card}>
              <button
                className={styles.cardHeader}
                onClick={() => toggleExpand(u.id)}
              >
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>{u.nombre}</div>
                  <div className={styles.cardEmail}>{u.email}</div>
                </div>
                <div className={styles.stats}>
                  <span className={styles.stat}>
                    <strong>{u.totalTareas}</strong> tareas
                  </span>
                  <span className={styles.stat}>
                    <strong>{u.promedioProgreso}%</strong> prom.
                  </span>
                </div>
                <span className={`${styles.chevron} ${isExpanded ? styles.chevronUp : ''}`}>
                  ▼
                </span>
              </button>

              {isExpanded && (
                <div className={styles.expandedSection}>
                  {u.tareas.length === 0 ? (
                    <p className={styles.noTasks}>No tiene tareas asignadas</p>
                  ) : (
                    <div className={styles.tasksList}>
                      {u.tareas.map((t) => {
                        const colorVenc = getColorVencimiento(t.fecha_limite)
                        const colorProg = getColorProgreso(t.progreso)
                        return (
                          <div key={t.tu_id} className={styles.taskRow}>
                            <div className={styles.taskInfo}>
                              <div className={styles.taskTitle}>{t.titulo}</div>
                              <div className={styles.taskMeta}>
                                <span className={`badge status-${colorVenc}`}>
                                  {getDiasRestantes(t.fecha_limite) < 0
                                    ? `Vencida hace ${Math.abs(getDiasRestantes(t.fecha_limite))}d`
                                    : getDiasRestantes(t.fecha_limite) === 0
                                    ? 'Vence hoy'
                                    : `${getDiasRestantes(t.fecha_limite)}d`}
                                </span>
                                <span className={`badge status-${colorProg === 'alto' ? 'verde' : colorProg === 'medio' ? 'amarillo' : 'rojo'}`}>
                                  {t.progreso}% • {getLabelCompletado(t.progreso)}
                                </span>
                                <span className={styles.taskPts}>⭐ {t.puntos} pts</span>
                              </div>
                            </div>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => setConfirmDelete({ tu_id: t.tu_id, titulo: t.titulo, userName: u.nombre })}
                              title="Eliminar asignación"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {usuarios.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No hay usuarios en el equipo</p>
        )}
      </div>
    </div>
  )
}
