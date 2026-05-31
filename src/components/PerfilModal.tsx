'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './PerfilModal.module.css'

interface PerfilModalProps {
  profile: { id: string; nombre: string; email: string; rol: string }
  onClose: () => void
  onUpdate: () => void
}

interface Categoria {
  id: string
  nombre: string
  tareas_count?: number
}

export default function PerfilModal({ profile, onClose, onUpdate }: PerfilModalProps) {
  const supabase = createClient()
  const [nombre, setNombre] = useState(profile.nombre)
  const [email, setEmail] = useState(profile.email || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const cargarCategorias = useCallback(async () => {
    const { data } = await supabase
      .from('categorias')
      .select('*')
      .eq('created_by', profile.id)
      .order('nombre')
    if (data) {
      const catIds = data.map(c => c.id)
      let counts: Record<string, number> = {}
      if (catIds.length > 0) {
        const { data: tareas } = await supabase
          .from('tareas')
          .select('categoria_id')
          .in('categoria_id', catIds)
        if (tareas) {
          tareas.forEach(t => {
            counts[t.categoria_id] = (counts[t.categoria_id] || 0) + 1
          })
        }
      }
      setCategorias(data.map(c => ({ ...c, tareas_count: counts[c.id] || 0 })))
    }
  }, [profile.id, supabase])

  useEffect(() => { cargarCategorias() }, [cargarCategorias])

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')
    setError('')

    try {
      if (nombre.trim() !== profile.nombre) {
        const { error: err } = await supabase
          .from('profiles')
          .update({ nombre: nombre.trim() })
          .eq('id', profile.id)
        if (err) throw err
      }

      if (email.trim() !== profile.email) {
        const { error: err } = await supabase.auth.updateUser({ email: email.trim() })
        if (err) throw err
      }

      if (password) {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden')
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres')
        }
        const { error: err } = await supabase.auth.updateUser({ password })
        if (err) throw err
        setPassword('')
        setConfirmPassword('')
      }

      setMensaje('Perfil actualizado correctamente')
      onUpdate()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarCategoria = async (catId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Las tareas que la usen quedarán sin categoría.')) return
    setEliminando(catId)
    await supabase.from('tareas').update({ categoria_id: null }).eq('categoria_id', catId)
    await supabase.from('categorias').delete().eq('id', catId)
    setEliminando(null)
    cargarCategorias()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Configuración</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardarPerfil}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>👤 Perfil</h3>

            <div className={styles.field}>
              <label className="label">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className={styles.field}>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>

            <div className={styles.field}>
              <label className="label">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="Dejar en blanco para no cambiar"
                autoComplete="new-password"
              />
            </div>

            <div className={styles.field}>
              <label className="label">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Repetir nueva contraseña"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : '💾 Guardar cambios'}
            </button>
          </div>
        </form>

        {profile.rol === 'jefe' && (
          <div className={styles.section} style={{ marginTop: '24px' }}>
            <h3 className={styles.sectionTitle}>📂 Categorías</h3>
            {categorias.length === 0 ? (
              <p className={styles.empty}>No has creado categorías todavía</p>
            ) : (
              <div className={styles.catList}>
                {categorias.map(cat => (
                  <div key={cat.id} className={styles.catItem}>
                    <div className={styles.catInfo}>
                      <span className={styles.catName}>{cat.nombre}</span>
                      <span className={styles.catCount}>
                        {cat.tareas_count} tarea{cat.tareas_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => eliminarCategoria(cat.id)}
                      disabled={eliminando === cat.id}
                      title="Eliminar categoría"
                    >
                      {eliminando === cat.id ? '...' : '✕'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mensaje && <div className={styles.success}>{mensaje}</div>}
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  )
}
