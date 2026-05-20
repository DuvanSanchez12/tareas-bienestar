# Sistema de Gestión de Tareas - SPEC.md

## 1. Project Overview

**Project Name:** TaskMatrix
**Type:** Web Application (SPA)
**Core Functionality:** Sistema de gestión de tareas donde el jefe crea tareas con puntos y el usuario hace check-in, mostrando progreso y colores según vencimiento y porcentaje.
**Target Users:** Equipos pequeños (6-20 personas)

## 2. Technology Stack

- **Frontend:** React 18 + Next.js 14 (App Router)
- **Styling:** CSS Modules + CSS Variables
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deployment:** Vercel

## 3. UI/UX Specification

### Color Palette

```css
--primary: #1e3a5f;        /* Azul oscuro - header, botones principales */
--primary-light: #2d5a8a;  /* Azul más claro - hover */
--secondary: #4a90a4;      /* Azul suave - acentos */
--background: #f8fafc;     /* Fondo general */
--surface: #ffffff;        /* Tarjetas, paneles */
--text-primary: #1a202c;   /* Texto principal */
--text-secondary: #64748b; /* Texto secundario */
--border: #e2e8f0;         /* Bordes, divisores */

/* Colores de estado */
--success: #10b981;        /* Verde - completado / >80% */
--warning: #f59e0b;        /* Amarillo - por vencer / 50-80% */
--danger: #ef4444;         /* Rojo - vencido / <50% */
--info: #3b82f6;           /* Azul - información */
```

### Typography

- **Font Family:** system-ui, -apple-system, sans-serif
- **Headings:**
  - H1: 28px, bold
  - H2: 22px, semibold
  - H3: 18px, semibold
- **Body:** 14px, regular
- **Small:** 12px

### Layout Structure

**Pantalla de Login/Register:**
- Centrada, fondo con gradiente sutil
- Formulario con email, password, nombre (register)
- Selector de rol en register

**Dashboard (Después de login):**
- Header: logo, nombre usuario, logout
- Sidebar: navegación (tareas, crear, según rol)
- Main content: panel principal

### Components

1. **AuthForm** - Login/Register conmutables
2. **TaskCard** - Tarjeta de tarea con estado de color
3. **TaskList** - Lista de tareas filtrable
4. **CreateTaskForm** - Formulario crear tarea (solo jefe)
5. **ProgressBar** - Barra de progreso con color
6. **UserBadge** - Badge usuario con rol
7. **Modal** - Para confirmaciones

### Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 4. Data Model

### Tables (Supabase)

```sql
-- Users (extendida de auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('jefe', 'usuario')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tareas
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  puntos INTEGER CHECK (puntos >= 1 AND puntos <= 10),
  fecha_limite DATE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asignaciones de tareas a usuarios
CREATE TABLE tarea_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id UUID REFERENCES tareas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  progreso INTEGER DEFAULT 0 CHECK (progreso >= 0 AND progreso <= 100),
  checked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tarea_id, user_id)
);
```

## 5. Functionality Specification

### Autenticación

- Register: email, password, nombre, seleccionar rol
- Login: email + password
- Logout
- Sesión persistente con Supabase Auth

### Rol Jefe

1. **Crear Tarea:**
   - Título (requerido)
   - Descripción (opcional)
   - Puntos (1-10, slider)
   - Fecha límite (date picker)
   - Asignar a usuarios (multi-select)

2. **Ver Dashboard:**
   - Lista de todas las tareas
   - Ver progreso de cada usuario en cada tarea
   - Colores según:
     - Vencimiento: >3 días=verde, 1-3 días=amarillo, vencido=hoy=rojo
     - Promedio de progreso del equipo

3. **Estadísticas:**
   - Total tareas
   - Tareas completadas
   - Promedio de progreso

### Rol Usuario

1. **Ver Mis Tareas:**
   - Lista de tareas asignadas
   - Mostrar progreso propio (0-100%)

2. **Actualizar Progreso:**
   - Slider o input numérico (0-100)
   - Actualiza automáticamente

3. **Colores según progreso:**
   - < 50%: rojo
   - 50-80%: amarillo
   - > 80%: verde

### API Endpoints

```
GET    /api/auth/me        - Obtener usuario actual
POST   /api/auth/register  - Registrar usuario
POST   /api/auth/login     - Login
POST   /api/auth/logout    - Logout

GET    /api/tareas         - Listar tareas (jefe=todas, usuario=asignadas)
POST   /api/tareas         - Crear tarea (jefe)
GET    /api/tareas/[id]   - Obtener tarea específica
PUT    /api/tareas/[id]    - Actualizar tarea (jefe)
DELETE /api/tareas/[id]    - Eliminar tarea (jefe)

GET    /api/tarea-usuarios - Obtener asignaciones
PUT    /api/tarea-usuarios - Actualizar progreso (usuario)
```

## 6. Acceptance Criteria

### Auth
- [ ] Usuario puede registrarse con email, password, nombre, rol
- [ ] Usuario puede hacer login
- [ ] Sesión persiste al recargar página
- [ ] Logout funciona correctamente

### Jefe
- [ ] Puede crear tarea con todos los campos
- [ ] Puede asignar tarea a múltiples usuarios
- [ ] Ve todas las tareas del equipo
- [ ] Ve progreso de cada usuario en cada tarea
- [ ] Colores de vencimiento funcionan (>3 días verde, 1-3 amarillo, 0=rojo)

### Usuario
- [ ] Ve solo sus tareas asignadas
- [ ] Puede actualizar progreso (0-100)
- [ ] Colores por porcentaje funcionan (<50 rojo, 50-80 amarillo, >80 verde)

### General
- [ ] UI es responsive
- [ ] No hay errores en consola
- [ ] La app carga en menos de 3 segundos