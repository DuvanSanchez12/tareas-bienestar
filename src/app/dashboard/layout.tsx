'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './layout.module.css'
import ThemeToggle from '@/components/ThemeToggle'

interface Profile {
  id: string
  nombre: string
  rol: 'jefe' | 'usuario'
  email: string
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        redirect('/')
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileData) {
        redirect('/')
      }

      setProfile(profileData)
      setLoading(false)
    }
    loadUser()
  })

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  if (loading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div>Cargando...</div>
      </div>
    )
  }

  const initials = profile.nombre?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'

  return (
    <div className={styles.layout}>
      {/* Overlay for mobile */}
      <div 
        className={`${styles.overlay} ${sidebarOpen ? styles.visible : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <header className={styles.header}>
        <div className={styles.logo}>
          <button 
            className={styles.mobileMenuBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <Link href="/dashboard" className={styles.logoIcon}>T</Link>
        </div>
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{profile.nombre}</span>
              <span className={styles.userRole}>{profile.rol === 'jefe' ? '👔 Jefe' : '💻 Usuario'}</span>
            </div>
          </div>
          <ThemeToggle />
          <button onClick={handleLogout} className={styles.logoutBtn}>
            🚪 <span>Salir</span>
          </button>
        </div>
      </header>

      <div className={styles.main}>
        <nav className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <Link href="/dashboard" className={styles.navItem} onClick={() => setSidebarOpen(false)}>
            <span className={styles.navIcon}>📋</span>
            Mis Tareas
          </Link>
          {profile.rol === 'jefe' && (
            <Link href="/dashboard/crear" className={styles.navItem} onClick={() => setSidebarOpen(false)}>
              <span className={styles.navIcon}>➕</span>
              Crear Tarea
            </Link>
          )}
          {profile.rol === 'jefe' && (
            <Link href="/dashboard/equipo" className={styles.navItem} onClick={() => setSidebarOpen(false)}>
              <span className={styles.navIcon}>👥</span>
              Equipo
            </Link>
          )}
        </nav>
        
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}