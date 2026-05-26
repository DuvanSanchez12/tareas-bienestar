'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'
import styles from './page.module.css'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<'jefe' | 'usuario'>('usuario')
  const [jefeId, setJefeId] = useState('')
  const [jefes, setJefes] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!isLogin && rol === 'usuario') {
      supabase
        .from('profiles')
        .select('id, nombre')
        .eq('rol', 'jefe')
        .order('nombre')
        .then(({ data }) => {
          setJefes(data || [])
          if ((data || []).length > 0) {
            setJefeId(data![0].id)
          }
        })
    }
  }, [isLogin, rol, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const metaData: Record<string, string> = { nombre, rol }
        if (rol === 'usuario' && jefeId) {
          metaData.jefe_id = jefeId
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metaData,
          },
        })
        if (signUpError) throw signUpError
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <ThemeToggle />
      </div>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Bienvenido</h1>
          <p>{isLogin ? 'Inicia sesión para continuar' : 'Crea tu cuenta para comenzar'}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <>
              <div className={styles.field}>
                <label className="label">👤 Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input"
                  required={!isLogin}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div className={styles.field}>
                <label className="label">🎭 ¿Cómo te registras?</label>
                <div className={styles.roleSelector}>
                  <label className={`${styles.roleOption} ${rol === 'jefe' ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="rol"
                      value="jefe"
                      checked={rol === 'jefe'}
                      onChange={() => setRol('jefe')}
                    />
                    <span className={styles.roleIcon}>👔</span>
                    <span className={styles.roleName}>Jefe</span>
                    <span className={styles.roleDesc}>Crea y asigna tareas</span>
                  </label>
                  <label className={`${styles.roleOption} ${rol === 'usuario' ? styles.selected : ''}`}>
                    <input
                      type="radio"
                      name="rol"
                      value="usuario"
                      checked={rol === 'usuario'}
                      onChange={() => setRol('usuario')}
                    />
                    <span className={styles.roleIcon}>💻</span>
                    <span className={styles.roleName}>Usuario</span>
                    <span className={styles.roleDesc}>Realiza las tareas</span>
                  </label>
                </div>
              </div>

              {rol === 'usuario' && jefes.length > 0 && (
                <div className={styles.field}>
                  <label className="label">👔 Selecciona tu jefe</label>
                  <select
                    value={jefeId}
                    onChange={(e) => setJefeId(e.target.value)}
                    className="input"
                    required
                  >
                    {jefes.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className={styles.field}>
            <label className="label">📧 Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className={styles.field}>
            <label className="label">🔐 Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '14px' }}>
            {loading ? '⏳ Cargando...' : isLogin ? '🚀 Iniciar sesión' : '✨ Crear cuenta'}
          </button>
        </form>

        <div className={styles.toggle}>
          {isLogin ? (
            <>
              ¿No tienes cuenta?{' '}
              <button onClick={() => setIsLogin(false)}>Regístrate gratis</button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button onClick={() => setIsLogin(true)}>Inicia sesión</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}