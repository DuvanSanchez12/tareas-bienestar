-- Limpiar todo primero
DELETE FROM tarea_usuarios;
DELETE FROM tareas;

-- Ahora crear las tareas
DO $$
DECLARE
  jefe_id UUID;
  usuario_id UUID;
  tarea_id UUID;
BEGIN
  SELECT id INTO jefe_id FROM profiles WHERE email = 'duvansanchez2304@gmail.com';
  SELECT id INTO usuario_id FROM profiles WHERE email = 'duvandcrs@gmail.com';

  -- Tarea 1: Progreso 0%
  tarea_id := gen_random_uuid();
  INSERT INTO tareas (id, titulo, descripcion, puntos, fecha_limite, created_by)
  VALUES (tarea_id, 'Cambiar color pantalla inicio', 'Cambiar color', 5, '2026-05-21', jefe_id);
  INSERT INTO tarea_usuarios (tarea_id, user_id, progreso, checked_at)
  VALUES (tarea_id, usuario_id, 0, NOW());

  -- Tarea 2: Progreso 90%
  tarea_id := gen_random_uuid();
  INSERT INTO tareas (id, titulo, descripcion, puntos, fecha_limite, created_by)
  VALUES (tarea_id, 'Revisar código fuente', 'Code review', 3, '2026-05-23', jefe_id);
  INSERT INTO tarea_usuarios (tarea_id, user_id, progreso, checked_at)
  VALUES (tarea_id, usuario_id, 90, NOW());

  -- Tarea 3: Progreso 40%
  tarea_id := gen_random_uuid();
  INSERT INTO tareas (id, titulo, descripcion, puntos, fecha_limite, created_by)
  VALUES (tarea_id, 'Actualizar documentación', 'Documentar APIs', 5, '2026-05-27', jefe_id);
  INSERT INTO tarea_usuarios (tarea_id, user_id, progreso, checked_at)
  VALUES (tarea_id, usuario_id, 40, NOW());

  -- Tarea 4: Vencida
  tarea_id := gen_random_uuid();
  INSERT INTO tareas (id, titulo, descripcion, puntos, fecha_limite, created_by)
  VALUES (tarea_id, 'Tarea vencida', 'Pasó la fecha', 4, '2026-05-10', jefe_id);
  INSERT INTO tarea_usuarios (tarea_id, user_id, progreso, checked_at)
  VALUES (tarea_id, usuario_id, 30, NOW());

  -- Tarea 5: Vence en 5 días
  tarea_id := gen_random_uuid();
  INSERT INTO tareas (id, titulo, descripcion, puntos, fecha_limite, created_by)
  VALUES (tarea_id, 'Nueva tarea próxima', 'Vence en 5 días', 5, '2026-05-25', jefe_id);
  INSERT INTO tarea_usuarios (tarea_id, user_id, progreso, checked_at)
  VALUES (tarea_id, usuario_id, 10, NOW());

  RAISE NOTICE 'OK';
END $$;