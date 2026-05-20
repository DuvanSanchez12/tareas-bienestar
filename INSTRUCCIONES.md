# TaskMatrix - Configuración

## Paso 1: Crear proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Crea un nuevo proyecto (o usa uno existente)
3. En **Project Settings > API**, copia:
   - **Project URL** (ej: https://abcdefghijklmno.supabase.co)
   - **anon public** key (empezar con `eyJ...`)

## Paso 2: Configurar variables de entorno

Edita el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

Reemplaza los valores con los de tu proyecto de Supabase.

## Paso 3: Crear las tablas en Supabase

Ve a **SQL Editor** en el panel de Supabase y ejecuta este SQL:

```sql
-- Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('jefe', 'usuario')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabla de tareas
CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  puntos INTEGER CHECK (puntos >= 1 AND puntos <= 10),
  fecha_limite DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
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

-- Habilitar Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_usuarios ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para usuarios autenticados
CREATE POLICY "Users can read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read tareas" ON tareas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can read tarea_usuarios" ON tarea_usuarios FOR SELECT TO authenticated USING (true);

-- Políticas de escritura
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Jefe can create tareas" ON tareas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Jefe can update tareas" ON tareas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Jefe can delete tareas" ON tareas FOR DELETE TO authenticated USING (true);
CREATE POLICY "Users can update their tarea_usuarios" ON tarea_usuarios FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Jefe can create tarea_usuarios" ON tarea_usuarios FOR INSERT TO authenticated WITH CHECK (true);
```

## Paso 4: Ejecutar el build

```bash
npm run build
```

## Paso 5: Desplegar a Vercel

1. Sube el código a GitHub
2. Ve a https://vercel.com y conecta tu repositorio
3. Agrega las variables de entorno en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy会自动

## Cómo usar el sistema

1. **Regístrate** como "Jefe" o "Usuario"
2. **Si eres Jefe**: Crea tareas y asígnalas a usuarios
3. **Si eres Usuario**: Ve tus tareas y actualiza tu progreso con el slider
4. **Colores**:
   - Por vencimiento: Verde (>3 días), Amarillo (1-3 días), Rojo (vencido)
   - Por progreso: Verde (>80%), Amarillo (50-80%), Rojo (<50%)