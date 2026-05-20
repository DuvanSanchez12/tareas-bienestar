'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          border: 'none',
          borderRadius: '8px',
          background: 'var(--background)',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        🌙
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        border: 'none',
        borderRadius: '8px',
        background: 'var(--background)',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'all 0.2s ease',
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}