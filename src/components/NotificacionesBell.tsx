'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './NotificacionesBell.module.css'

interface Notificacion {
  id: string
  tarea_id: string
  user_id: string
  tipo: 'progreso' | 'completada'
  progreso: number
  leida: boolean
  created_at: string
  profiles: { nombre: string }
}

interface TareaDetalle {
  id: string
  titulo: string
  descripcion: string | null
  puntos: number
  fecha_limite: string
  categoria?: { nombre: string } | null
  creator?: { nombre: string }
  tarea_usuarios?: Array<{
    user_id: string
    progreso: number
    user?: { nombre: string; rol: string }
  }>
}

export default function NotificacionesBell({ jefeId }: { jefeId: string }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [detalleTarea, setDetalleTarea] = useState<TareaDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  const cargarNotificaciones = useCallback(async () => {
    const { data } = await supabase
      .from('notificaciones')
      .select('*, profiles!notificaciones_user_id_fkey(nombre)')
      .eq('jefe_id', jefeId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotificaciones(data)
  }, [jefeId, supabase])

  useEffect(() => {
    cargarNotificaciones()
    const interval = setInterval(cargarNotificaciones, 30000)
    return () => clearInterval(interval)
  }, [cargarNotificaciones])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const noLeidas = notificaciones.filter(n => !n.leida).length

  const marcarLeidas = async () => {
    const ids = notificaciones.filter(n => !n.leida).map(n => n.id)
    if (ids.length === 0) return
    await supabase.from('notificaciones').update({ leida: true }).in('id', ids)
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  const abrirDetalle = async (tareaId: string) => {
    setDropdownOpen(false)
    setLoadingDetalle(true)
    setDetalleTarea(null)
    const { data } = await supabase
      .from('tareas')
      .select('*, categoria(nombre), creator:profiles!tareas_created_by_fkey(nombre), tarea_usuarios(*, user:profiles(nombre, rol))')
      .eq('id', tareaId)
      .single()
    if (data) setDetalleTarea(data)
    setLoadingDetalle(false)
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

  function getProgresoLabel(progreso: number): string {
    if (progreso === 0) return 'Sin iniciar'
    if (progreso < 50) return 'En progreso'
    if (progreso < 80) return 'Casi lista'
    if (progreso === 100) return 'Completada'
    return 'Por terminar'
  }

  function getColorProgreso(p: number): string {
    if (p < 50) return 'bajo'
    if (p < 80) return 'medio'
    return 'alto'
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button className={styles.bellBtn} onClick={() => { setDropdownOpen(!dropdownOpen); if (!dropdownOpen) marcarLeidas() }}>
        🔔
        {noLeidas > 0 && <span className={styles.badge}>{noLeidas}</span>}
      </button>

      {dropdownOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notificaciones</span>
            {noLeidas > 0 && (
              <button className={styles.markReadBtn} onClick={marcarLeidas}>
                ✓ Marcar todas leídas
              </button>
            )}
          </div>
          <div className={styles.notifList}>
            {notificaciones.length === 0 ? (
              <div className={styles.empty}>Sin notificaciones</div>
            ) : (
              notificaciones.map(n => (
                <button
                  key={n.id}
                  className={`${styles.notifItem} ${!n.leida ? styles.noLeida : ''}`}
                  onClick={() => abrirDetalle(n.tarea_id)}
                >
                  <span className={styles.notifIcon}>
                    {n.tipo === 'completada' ? '🎉' : '📈'}
                  </span>
                  <div className={styles.notifContent}>
                    <span className={styles.notifText}>
                      <strong>{n.profiles?.nombre || 'Usuario'}</strong>{' '}
                      {n.tipo === 'completada' ? 'completó' : `progresó a ${n.progreso}%`}
                      {' '}la tarea
                    </span>
                    <span className={styles.notifTime}>
                      {new Date(n.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {!n.leida && <span className={styles.dot} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {detalleTarea && (
        <div className={styles.modalOverlay} onClick={() => setDetalleTarea(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{detalleTarea.titulo}</h3>
              <button className={styles.modalClose} onClick={() => setDetalleTarea(null)}>✕</button>
            </div>

            {detalleTarea.descripcion && (
              <p className={styles.modalDesc}>{detalleTarea.descripcion}</p>
            )}

            <div className={styles.modalMeta}>
              <div className={styles.modalMetaItem}>
                <span>📅</span>
                <span>{new Date(detalleTarea.fecha_limite).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className={`badge status-${getColorVencimiento(detalleTarea.fecha_limite)}`}>
                  {getDiasRestantes(detalleTarea.fecha_limite) < 0
                    ? `Vencida hace ${Math.abs(getDiasRestantes(detalleTarea.fecha_limite))} días`
                    : `Vence en ${getDiasRestantes(detalleTarea.fecha_limite)} días`}
                </span>
              </div>
              <div className={styles.modalMetaItem}>
                <span>⭐</span>
                <span>{detalleTarea.puntos} pts</span>
                <span>{detalleTarea.categoria?.nombre && `📂 ${detalleTarea.categoria.nombre}`}</span>
              </div>
              {detalleTarea.creator && (
                <div className={styles.modalMetaItem}>
                  <span>👤 Creada por {detalleTarea.creator.nombre}</span>
                </div>
              )}
            </div>

            {detalleTarea.tarea_usuarios && detalleTarea.tarea_usuarios.length > 0 && (
              <div className={styles.asignadosSection}>
                <h4 className={styles.asignadosTitle}>👥 Asignados</h4>
                <div className={styles.asignadosList}>
                  {detalleTarea.tarea_usuarios.map(a => (
                    <div key={a.user_id} className={styles.asignado}>
                      <span>{a.user?.nombre}</span>
                      <span className={`badge ${a.user?.rol === 'jefe' ? 'badge-jefe' : 'badge-usuario'}`}>
                        {a.user?.rol === 'jefe' ? '👔 Jefe' : '💻 Usuario'}
                      </span>
                      <span className={`badge status-${getColorProgreso(a.progreso) === 'alto' ? 'verde' : getColorProgreso(a.progreso) === 'medio' ? 'amarillo' : 'rojo'}`}>
                        {a.progreso}% • {getProgresoLabel(a.progreso)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className="btn btn-secondary" onClick={() => setDetalleTarea(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {loadingDetalle && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.loading}>Cargando...</div>
          </div>
        </div>
      )}
    </div>
  )
}
