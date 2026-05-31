import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateTaskForm from '@/components/CreateTaskForm'

export default async function CrearTareaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.rol !== 'jefe') {
    redirect('/dashboard')
  }

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('id, nombre, email')
    .eq('rol', 'usuario')
    .order('nombre')

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('created_by', user.id)
    .order('nombre')

  return (
    <div>
      <h2 style={{ marginBottom: '24px' }}>Crear Nueva Tarea</h2>
      <CreateTaskForm jefeId={user.id} usuarios={usuarios || []} categorias={categorias || []} />
    </div>
  )
}