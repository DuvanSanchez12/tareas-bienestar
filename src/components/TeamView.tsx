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
  const [selectedUser, setSelectedUser] = useState<UsuarioConTareas | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ tu_id: string; titulo: string } | null>(null)

  const handleDelete = async (tuId: string) => {
    setDeleting(tuId)
    try {
      const { error } = await supabase.from('tarea_usuarios').delete().eq('id', tuId)
      if (error) throw error
    } catch (err) {
      console.error('Error al quitar asignación:', err)
    }
    setConfirmDelete(null)
    setDeleting(null)
    window.location.reload()
  }

  return (
    <div>
      <div className={styles.grid}>
        {usuarios.map((u) => (
          <button key={u.id} className={styles.card} onClick={() => setSelectedUser(u)}>
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
            <span className={styles.chevron}>▶</span>
          </button>
        ))}
        {usuarios.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No hay usuarios en el equipo</p>
        )}
      </div>

      {selectedUser && !confirmDelete && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalUserName}>{selectedUser.nombre}</h2>
                <p className={styles.modalUserEmail}>{selectedUser.email}</p>
              </div>
              <button className={styles.modalClose} onClick={() => setSelectedUser(null)}>✕</button>
            </div>

            <div className={styles.modalUserStats}>
              <div className={styles.modalStat}>
                <span className={styles.modalStatValue}>{selectedUser.totalTareas}</span>
                <span className={styles.modalStatLabel}>Tareas asignadas</span>
              </div>
              <div className={styles.modalStat}>
                <span className={styles.modalStatValue}>{selectedUser.promedioProgreso}%</span>
                <span className={styles.modalStatLabel}>Progreso promedio</span>
              </div>
            </div>

            <div className={styles.modalTasksSection}>
              {(() => {
                const activas = selectedUser.tareas.filter(t => t.progreso < 100)
                const completadas = selectedUser.tareas.filter(t => t.progreso === 100)

                return (
                  <>
                    {activas.length > 0 && (
                      <>
                        <h3 className={styles.modalTasksTitle}>📋 En progreso</h3>
                        <div className={styles.modalTasksList}>
                          {activas.map((t) => {
                            const colorVenc = getColorVencimiento(t.fecha_limite)
                            const colorProg = getColorProgreso(t.progreso)
                            return (
                              <div key={t.tu_id} className={styles.modalTaskRow}>
                                <div className={styles.modalTaskInfo}>
                                  <div className={styles.modalTaskTitle}>{t.titulo}</div>
                                  <div className={styles.modalTaskMeta}>
                                    <span className={`badge status-${colorVenc}`}>
                                      {getDiasRestantes(t.fecha_limite) < 0
                                        ? `Vencida ${Math.abs(getDiasRestantes(t.fecha_limite))}d`
                                        : getDiasRestantes(t.fecha_limite) === 0
                                        ? 'Vence hoy'
                                        : `${getDiasRestantes(t.fecha_limite)}d`}
                                    </span>
                                    <span className={`badge status-${colorProg === 'alto' ? 'verde' : colorProg === 'medio' ? 'amarillo' : 'rojo'}`}>
                                      {t.progreso}% • {getLabelCompletado(t.progreso)}
                                    </span>
                                    <span>⭐ {t.puntos} pts</span>
                                  </div>
                                </div>
                                <button
                                  className={styles.removeBtn}
                                  onClick={() => setConfirmDelete({ tu_id: t.tu_id, titulo: t.titulo })}
                                >
                                  Quitar asignación
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {completadas.length > 0 && (
                      <>
                        <h3 className={styles.modalTasksTitle} style={{ marginTop: activas.length > 0 ? '20px' : 0 }}>✅ Completadas</h3>
                        <div className={styles.modalTasksList}>
                          {completadas.map((t) => {
                            const colorVenc = getColorVencimiento(t.fecha_limite)
                            return (
                              <div key={t.tu_id} className={styles.modalTaskRow}>
                                <div className={styles.modalTaskInfo}>
                                  <div className={styles.modalTaskTitle}>{t.titulo}</div>
                                  <div className={styles.modalTaskMeta}>
                                    <span className={`badge status-${colorVenc}`}>
                                      {getDiasRestantes(t.fecha_limite) < 0
                                        ? `Vencida ${Math.abs(getDiasRestantes(t.fecha_limite))}d`
                                        : getDiasRestantes(t.fecha_limite) === 0
                                        ? 'Vence hoy'
                                        : `${getDiasRestantes(t.fecha_limite)}d`}
                                    </span>
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>✅ 100%</span>
                                    <span>⭐ {t.puntos} pts</span>
                                  </div>
                                </div>
                                <button
                                  className={styles.removeBtn}
                                  onClick={() => setConfirmDelete({ tu_id: t.tu_id, titulo: t.titulo })}
                                >
                                  Quitar asignación
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {selectedUser.tareas.length === 0 && (
                      <p className={styles.noTasks}>No tiene tareas asignadas</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setConfirmDelete(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>🗑️</div>
            <h2 className={styles.modalTitle}>¿Quitar asignación?</h2>
            <p className={styles.modalText}>
              Se quitará la tarea <strong>"{confirmDelete.titulo}"</strong> de <strong>{selectedUser.nombre}</strong>.
            </p>
            <p className={styles.modalSubtext}>El progreso se perderá. La tarea seguirá existiendo.</p>
            <div className={styles.modalActions}>
              <button
                className={styles.deleteConfirmBtn}
                onClick={() => handleDelete(confirmDelete.tu_id)}
                disabled={deleting === confirmDelete.tu_id}
              >
                {deleting === confirmDelete.tu_id ? 'Quitando...' : 'Sí, quitar'}
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
    </div>
  )
}
