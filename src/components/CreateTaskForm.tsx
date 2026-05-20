'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './CreateTaskForm.module.css'

interface Usuario {
  id: string
  nombre: string
  email: string
}

interface CreateTaskFormProps {
  jefeId: string
  usuarios: Usuario[]
}

export default function CreateTaskForm({ jefeId, usuarios }: CreateTaskFormProps) {
  const supabase = createClient()
  const router = useRouter()

  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [puntos, setPuntos] = useState(5)
  const [fechaLimite, setFechaLimite] = useState('')
  const [asignados, setAsignados] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleAsignado = (userId: string) => {
    setAsignados((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: tarea, error: tareaError } = await supabase
        .from('tareas')
        .insert({
          titulo,
          descripcion: descripcion || null,
          puntos,
          fecha_limite: fechaLimite,
          created_by: jefeId,
        })
        .select()
        .single()

      if (tareaError) throw tareaError

      if (asignados.length > 0 && tarea) {
        const asignaciones = asignados.map((userId) => ({
          tarea_id: tarea.id,
          user_id: userId,
          progreso: 0,
          checked_at: null,
        }))

        const { error: asigError } = await supabase
          .from('tarea_usuarios')
          .insert(asignaciones)

        if (asigError) throw asigError
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>📝 Información de la tarea</div>
          
          <div className={styles.field}>
            <label className="label">Título de la tarea *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input"
              required
              placeholder="Ej: Actualizar el diseño del homepage"
            />
          </div>

          <div className={styles.field}>
            <label className="label">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="textarea"
              placeholder="Detalles adicionales sobre la tarea..."
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>⚡ Configuración</div>
          
          <div className={styles.row}>
            <div className={styles.field}>
              <label className="label">Puntos (dificultad)</label>
              <div className={styles.puntosInput}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={puntos}
                  onChange={(e) => setPuntos(parseInt(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.puntosValue}>{puntos}</span>
              </div>
              <div className={styles.puntosLabels}>
                <span>Fácil</span>
                <span>Media</span>
                <span>Difícil</span>
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">Fecha límite *</label>
              <input
                type="date"
                value={fechaLimite}
                onChange={(e) => setFechaLimite(e.target.value)}
                className="input"
                required
                min={hoy}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>👥 Asignar a usuarios</div>
          
          {usuarios.length === 0 ? (
            <div className={styles.noUsers}>
              No hay usuarios disponibles. Los usuarios deben registrarse primero.
            </div>
          ) : (
            <div className={styles.usersSection}>
              <div className={styles.usersHeader}>
                Selecciona los usuarios que realizarán esta tarea
              </div>
              <div className={styles.usersList}>
                {usuarios.map((user) => (
                  <label 
                    key={user.id} 
                    className={`${styles.userOption} ${asignados.includes(user.id) ? styles.selected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={asignados.includes(user.id)}
                      onChange={() => toggleAsignado(user.id)}
                    />
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{user.nombre}</span>
                      <span className={styles.userEmail}>{user.email}</span>
                    </div>
                    <div className={styles.userCheck}>
                      {asignados.includes(user.id) ? '✓' : ''}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creando...' : '✅ Crear Tarea'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => router.push('/dashboard')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}