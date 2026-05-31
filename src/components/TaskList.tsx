'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './TaskList.module.css'

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

interface TaskListProps {
  tareas: Tarea[]
  rol: 'jefe' | 'usuario'
  userId: string
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

function getLabelVencimiento(fechaLimite: string): string {
  const dias = getDiasRestantes(fechaLimite)
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) > 1 ? 's' : ''}`
  if (dias === 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `Vence en ${dias} días`
}

function getProgresoLabel(progreso: number): string {
  if (progreso === 0) return 'Sin iniciar'
  if (progreso < 50) return 'En progreso'
  if (progreso < 80) return 'Casi lista'
  if (progreso === 100) return 'Completada'
  return 'Por terminar'
}

function getImportanciaLabel(puntos: number): string {
  if (puntos >= 8) return 'Muy importante'
  if (puntos >= 4) return 'Más o menos'
  return 'Nada importante'
}

function getImportanciaColor(puntos: number): string {
  if (puntos >= 8) return 'rojo'
  if (puntos >= 4) return 'amarillo'
  return 'verde'
}

type FilterVencimiento = 'todas' | 'vencidas' | 'proximo' | 'lejanas'
type FilterImportancia = 'toda' | 'muy_importante' | 'mas_o_menos' | 'nada_importante'

export default function TaskList({ tareas, rol, userId }: TaskListProps) {
  const supabase = createClient()
  const [updating, setUpdating] = useState<string | null>(null)
  const [filterVencimiento, setFilterVencimiento] = useState<FilterVencimiento>('todas')
  const [filterImportancia, setFilterImportancia] = useState<FilterImportancia>('toda')
  const [filterCategoria, setFilterCategoria] = useState('todas')
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [progresoTemporal, setProgresoTemporal] = useState<{ [key: string]: number | undefined }>({})

  const categoriasDisponibles = useMemo(() => {
    const cats = new Map<string, string>()
    tareas.forEach(t => {
      if (t.categoria?.nombre) {
        cats.set(t.categoria.nombre, t.categoria.nombre)
      }
    })
    return Array.from(cats.values()).sort()
  }, [tareas])

  const handleProgresoChange = (tareaId: string, progreso: number) => {
    if (progreso === 100) {
      setProgresoTemporal({ ...progresoTemporal, [tareaId]: progreso })
      setShowConfirm(tareaId)
    } else {
      updateProgreso(tareaId, progreso)
    }
  }

  const updateProgreso = async (tareaId: string, progreso: number) => {
    setUpdating(tareaId)
    await supabase
      .from('tarea_usuarios')
      .update({ progreso, checked_at: new Date().toISOString() })
      .eq('tarea_id', tareaId)
      .eq('user_id', userId)
    window.location.reload()
  }

  const completarTarea = async (tareaId: string) => {
    setUpdating(tareaId)
    await supabase
      .from('tarea_usuarios')
      .update({ progreso: 100, checked_at: new Date().toISOString() })
      .eq('tarea_id', tareaId)
      .eq('user_id', userId)
    setShowConfirm(null)
    const newTemporal1 = { ...progresoTemporal }
    delete newTemporal1[tareaId]
    setProgresoTemporal(newTemporal1)
    window.location.reload()
  }

  const cancelarConfirmacion = (tareaId: string) => {
    setShowConfirm(null)
    const newTemporal2 = { ...progresoTemporal }
    delete newTemporal2[tareaId]
    setProgresoTemporal(newTemporal2)
  }

  const filteredTareas = useMemo(() => {
    let result = tareas

    // Aplicar filtro de búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      result = result.filter(t => 
        t.titulo.toLowerCase().includes(search) ||
        (t.descripcion && t.descripcion.toLowerCase().includes(search)) ||
        (t.creator?.nombre && t.creator.nombre.toLowerCase().includes(search))
      )
    }

    // Aplicar filtro de vencimiento
    result = result.filter(tarea => {
      const dias = getDiasRestantes(tarea.fecha_limite)
      switch (filterVencimiento) {
        case 'vencidas':
          return dias < 0
        case 'proximo':
          return dias >= 0 && dias <= 7
        case 'lejanas':
          return dias > 7
        default:
          return true
      }
    })

    // Aplicar filtro de importancia
    result = result.filter(tarea => {
      switch (filterImportancia) {
        case 'muy_importante':
          return tarea.puntos >= 8
        case 'mas_o_menos':
          return tarea.puntos >= 4 && tarea.puntos <= 7
        case 'nada_importante':
          return tarea.puntos <= 3
        default:
          return true
      }
    })

    // Aplicar filtro de categoria
    if (filterCategoria !== 'todas') {
      result = result.filter(t => t.categoria?.nombre === filterCategoria)
    }

    return result
  }, [tareas, filterVencimiento, filterImportancia, filterCategoria, searchTerm])

  const getFilterVencimientoLabel = (f: FilterVencimiento) => {
    switch (f) {
      case 'todas': return 'Todas'
      case 'vencidas': return 'Vencidas'
      case 'proximo': return 'Próximas 7 días'
      case 'lejanas': return 'Lejanas'
    }
  }

  const getFilterImportanciaLabel = (f: FilterImportancia) => {
    switch (f) {
      case 'toda': return 'Toda'
      case 'muy_importante': return '🔥 Muy importante'
      case 'mas_o_menos': return '😐 Más o menos'
      case 'nada_importante': return '✅ Nada importante'
    }
  }

  if (tareas.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>📋</div>
        <h3 className={styles.emptyTitle}>No hay tareas</h3>
        <p className={styles.emptyDesc}>
          {rol === 'jefe' 
            ? 'Crea tu primera tarea desde el botón de arriba'
            : 'No tienes tareas asignadas todavía'}
        </p>
      </div>
    )
  }

  const tareaConfirmando = showConfirm ? tareas.find(t => t.id === showConfirm) : null

  return (
    <div>
      {/* Modal de confirmación */}
      {showConfirm && tareaConfirmando && (
        <div className={styles.modalOverlay} onClick={() => setShowConfirm(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalIcon}>🎉</div>
            <h2 className={styles.modalTitle}>¿Estás segura?</h2>
            <p className={styles.modalText}>
              La tarea <strong>"{tareaConfirmando.titulo}"</strong> se marcará como completada (100%).
            </p>
            <p className={styles.modalSubtext}>Esta acción no se puede deshacer.</p>
            <div className={styles.modalActions}>
              <button 
                className="btn btn-success"
                onClick={() => completarTarea(tareaConfirmando.id)}
                disabled={updating === tareaConfirmando.id}
              >
                ✅ Sí, estoy segura
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => tareaConfirmando && cancelarConfirmacion(tareaConfirmando.id)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className={styles.searchWrapper}>
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Buscar tareas por título, descripción o responsable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button 
              className={styles.searchClear}
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filtros de vencimiento */}
      <div className={styles.filterSection}>
        <div className={styles.filterLabel}>📅 Venimiento</div>
        <div className={styles.filters}>
          {(['todas', 'vencidas', 'proximo', 'lejanas'] as FilterVencimiento[]).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filterVencimiento === f ? styles.filterActive : ''}`}
              onClick={() => setFilterVencimiento(f)}
            >
              {getFilterVencimientoLabel(f)}
              {f !== 'todas' && (
                <span className={styles.filterCount}>
                  {tareas.filter(t => {
                    const dias = getDiasRestantes(t.fecha_limite)
                    if (f === 'vencidas') return dias < 0
                    if (f === 'proximo') return dias >= 0 && dias <= 7
                    if (f === 'lejanas') return dias > 7
                    return false
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros de importancia */}
      <div className={styles.filterSection}>
        <div className={styles.filterLabel}>⚡ Importancia</div>
        <div className={styles.filters}>
          {(['toda', 'muy_importante', 'mas_o_menos', 'nada_importante'] as FilterImportancia[]).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filterImportancia === f ? styles.filterActive : ''} ${styles.importanceBtn}`}
              onClick={() => setFilterImportancia(f)}
              style={filterImportancia === f && f === 'muy_importante' ? { background: '#dc2626', borderColor: '#dc2626' } : 
                     filterImportancia === f && f === 'mas_o_menos' ? { background: '#f59e0b', borderColor: '#f59e0b' } :
                     filterImportancia === f && f === 'nada_importante' ? { background: '#10b981', borderColor: '#10b981' } : {}}
            >
              {getFilterImportanciaLabel(f)}
              {f !== 'toda' && (
                <span className={styles.filterCount}>
                  {tareas.filter(t => {
                    if (f === 'muy_importante') return t.puntos >= 8
                    if (f === 'mas_o_menos') return t.puntos >= 4 && t.puntos <= 7
                    if (f === 'nada_importante') return t.puntos <= 3
                    return false
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de categoria */}
      {categoriasDisponibles.length > 0 && (
        <div className={styles.filterSection}>
          <div className={styles.filterLabel}>📂 Categoría</div>
          <div className={styles.filters}>
            <button
              className={`${styles.filterBtn} ${filterCategoria === 'todas' ? styles.filterActive : ''}`}
              onClick={() => setFilterCategoria('todas')}
            >
              Todas
            </button>
            {categoriasDisponibles.map((cat) => (
              <button
                key={cat}
                className={`${styles.filterBtn} ${filterCategoria === cat ? styles.filterActive : ''}`}
                onClick={() => setFilterCategoria(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contador de resultados */}
      {searchTerm && (
        <div className={styles.resultCount}>
          {filteredTareas.length} resultado{filteredTareas.length !== 1 ? 's' : ''} encontrado{filteredTareas.length !== 1 ? 's' : ''}
        </div>
      )}

      {filteredTareas.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3 className={styles.emptyTitle}>No se encontraron tareas</h3>
          <p className={styles.emptyDesc}>
            {searchTerm 
              ? 'No hay tareas que coincidan con tu búsqueda'
              : 'No hay tareas en esta categoría'}
          </p>
        </div>
      ) : (
        (() => {
          const tareasCompletadas = filteredTareas.filter(t =>
            rol === 'jefe'
              ? t.tarea_usuarios?.every(a => a.progreso === 100) ?? false
              : (t.miProgreso ?? 0) === 100
          )
          const completadasSet = new Set(tareasCompletadas.map(t => t.id))
          const tareasActivas = filteredTareas.filter(t => !completadasSet.has(t.id))

          return (
            <>
              {tareasActivas.length > 0 && (
                <div className={styles.sectionTitle}>📋 En progreso</div>
              )}
              <div className={styles.grid}>
                {tareasActivas.map((tarea) => {
                  const colorVenc = getColorVencimiento(tarea.fecha_limite)
                  const progreso = tarea.miProgreso || tarea.promedioTarea || 0
                  const colorProgreso = getColorProgreso(progreso)
                  const importanciaColor = getImportanciaColor(tarea.puntos)

                  return (
                    <div key={tarea.id} className={`${styles.card} fade-in`}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{tarea.titulo}</h3>
                        <span className={`${styles.puntosBadge} ${styles[`puntos${tarea.puntos}`]}`}>
                          ⭐ {tarea.puntos} pts
                        </span>
                      </div>

                      {tarea.descripcion && (
                        <p className={styles.desc}>{tarea.descripcion}</p>
                      )}

                      <div className={styles.meta}>
                        <div className={styles.metaItem}>
                          <span className={styles.metaIcon}>📅</span>
                          <span>{new Date(tarea.fecha_limite).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <span className={`badge status-${colorVenc}`}>
                          {getLabelVencimiento(tarea.fecha_limite)}
                        </span>
                        <span className={`badge status-${importanciaColor}`}>
                          {getImportanciaLabel(tarea.puntos)}
                        </span>
                        {tarea.categoria?.nombre && (
                          <span className={styles.categoriaBadge}>{tarea.categoria.nombre}</span>
                        )}
                      </div>

                      {rol === 'usuario' && (
                        <div className={styles.progresoSection}>
                          <div className={styles.progresoHeader}>
                            <span className={styles.progresoLabel}>Mi progreso</span>
                            <span className={`${styles.progresoValue} ${styles[`progreso-${colorProgreso}`]}`}>
                              {progreso}% • {getProgresoLabel(progreso)}
                            </span>
                          </div>
                          
                          {progreso < 100 ? (
                            <>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={progresoTemporal[tarea.id] !== undefined ? progresoTemporal[tarea.id] : progreso}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value)
                                  if (newValue === 100) {
                                    setProgresoTemporal({ ...progresoTemporal, [tarea.id]: newValue })
                                    setShowConfirm(tarea.id)
                                  } else {
                                    updateProgreso(tarea.id, newValue)
                                  }
                                }}
                                className={styles.progresoSlider}
                                disabled={updating === tarea.id}
                              />
                              <div className={styles.sliderLabels}>
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                              </div>
                              {progreso >= 80 && (
                                <button 
                                  className={styles.completeBtn}
                                  onClick={() => setShowConfirm(tarea.id)}
                                >
                                  ✅ Marcar como completada
                                </button>
                              )}
                            </>
                          ) : (
                            <div className={styles.completedBadge}>
                              🎉 Tarea completada
                            </div>
                          )}
                        </div>
                      )}

                      {rol === 'jefe' && tarea.tarea_usuarios && tarea.tarea_usuarios.length > 0 && (
                        <div className={styles.asignadosSection}>
                          <div className={styles.asignadosTitle}>👥 Asignados</div>
                          <div className={styles.asignadosList}>
                            {tarea.tarea_usuarios.map((asignacion) => (
                              <div key={asignacion.user_id} className={styles.asignado}>
                                <span className={styles.asignadoName}>{asignacion.user?.nombre}</span>
                                <span className={`${styles.asignadoProgreso} badge status-${getColorProgreso(asignacion.progreso) === 'alto' ? 'verde' : getColorProgreso(asignacion.progreso) === 'medio' ? 'amarillo' : 'rojo'}`}>
                                  {asignacion.progreso}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {tareasCompletadas.length > 0 && (
                <div className={styles.completedSection}>
                  <div className={styles.sectionTitle}>✅ Completadas</div>
                  <div className={styles.grid}>
                    {tareasCompletadas.map((tarea) => {
                      const colorVenc = getColorVencimiento(tarea.fecha_limite)
                      const importanciaColor = getImportanciaColor(tarea.puntos)

                      return (
                        <div key={tarea.id} className={`${styles.card} ${styles.completedCard} fade-in`}>
                          <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>{tarea.titulo}</h3>
                            <span className={`${styles.puntosBadge} ${styles[`puntos${tarea.puntos}`]}`}>
                              ⭐ {tarea.puntos} pts
                            </span>
                          </div>

                          {tarea.descripcion && (
                            <p className={styles.desc}>{tarea.descripcion}</p>
                          )}

                          <div className={styles.meta}>
                            <div className={styles.metaItem}>
                              <span className={styles.metaIcon}>📅</span>
                              <span>{new Date(tarea.fecha_limite).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                            </div>
                            <span className={`badge status-${colorVenc}`}>
                              {getLabelVencimiento(tarea.fecha_limite)}
                            </span>
                            <span className={`badge status-${importanciaColor}`}>
                              {getImportanciaLabel(tarea.puntos)}
                            </span>
                            {tarea.categoria?.nombre && (
                              <span className={styles.categoriaBadge}>{tarea.categoria.nombre}</span>
                            )}
                          </div>

                          <div className={styles.completedBadge}>
                            🎉 Tarea completada
                          </div>

                          {rol === 'jefe' && tarea.tarea_usuarios && tarea.tarea_usuarios.length > 0 && (
                            <div className={styles.asignadosSection}>
                              <div className={styles.asignadosTitle}>👥 Asignados</div>
                              <div className={styles.asignadosList}>
                                {tarea.tarea_usuarios.map((asignacion) => (
                                  <div key={asignacion.user_id} className={styles.asignado}>
                                    <span className={styles.asignadoName}>{asignacion.user?.nombre}</span>
                                    <span className={styles.asignadoProgresoCompleto}>
                                      ✅ 100%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )
        })()
      )}
    </div>
  )
}