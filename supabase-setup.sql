-- Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('jefe', 'usuario')),
  jefe_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Añadir columnas faltantes en tablas existentes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jefe_id UUID REFERENCES profiles(id);
ALTER TABLE tareas ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol, jefe_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario'),
    NULLIF(NEW.raw_user_meta_data->>'jefe_id', '')::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabla de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nombre, created_by)
);

-- Tabla de tareas
CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  puntos INTEGER CHECK (puntos >= 1 AND puntos <= 10),
  fecha_limite DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  categoria_id UUID REFERENCES categorias(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de asignaciones tarea-usuario
CREATE TABLE IF NOT EXISTS tarea_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  checked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tarea_id, user_id)
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  jefe_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('progreso', 'completada')),
  progreso INTEGER,
  leida BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para usuarios autenticados
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
CREATE POLICY "Users can read profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can read categorias" ON categorias;
CREATE POLICY "Users can read categorias" ON categorias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Jefe can create categorias" ON categorias;
CREATE POLICY "Jefe can create categorias" ON categorias FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can read tareas" ON tareas;
CREATE POLICY "Users can read tareas" ON tareas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can read tarea_usuarios" ON tarea_usuarios;
CREATE POLICY "Users can read tarea_usuarios" ON tarea_usuarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can read notificaciones" ON notificaciones;
CREATE POLICY "Users can read notificaciones" ON notificaciones FOR SELECT TO authenticated USING (jefe_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert notificaciones" ON notificaciones;
CREATE POLICY "Users can insert notificaciones" ON notificaciones FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update notificaciones" ON notificaciones;
CREATE POLICY "Users can update notificaciones" ON notificaciones FOR UPDATE TO authenticated USING (jefe_id = auth.uid());

-- Políticas para categorias
DROP POLICY IF EXISTS "Jefe can update categorias" ON categorias;
CREATE POLICY "Jefe can update categorias" ON categorias FOR UPDATE TO authenticated USING (created_by = auth.uid());
DROP POLICY IF EXISTS "Jefe can delete categorias" ON categorias;
CREATE POLICY "Jefe can delete categorias" ON categorias FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Políticas de escritura
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Jefe can create tareas" ON tareas;
CREATE POLICY "Jefe can create tareas" ON tareas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Jefe can update tareas" ON tareas;
CREATE POLICY "Jefe can update tareas" ON tareas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Jefe can delete tareas" ON tareas;
CREATE POLICY "Jefe can delete tareas" ON tareas FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "Users can update their tarea_usuarios" ON tarea_usuarios;
CREATE POLICY "Users can update their tarea_usuarios" ON tarea_usuarios FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Jefe can create tarea_usuarios" ON tarea_usuarios;
CREATE POLICY "Jefe can create tarea_usuarios" ON tarea_usuarios FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Jefe can delete tarea_usuarios" ON tarea_usuarios;
CREATE POLICY "Jefe can delete tarea_usuarios" ON tarea_usuarios FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'jefe')
);
