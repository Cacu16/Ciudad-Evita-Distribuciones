# Supabase Setup

## 1. Crear el proyecto

1. Entra a Supabase y crea un proyecto nuevo.
2. Espera a que termine la provision.

## 2. Crear tablas y politicas

1. Abre el SQL Editor.
2. Copia el contenido de `supabase/schema.sql`.
3. Ejecutalo completo.

Esto crea:

- `public.products`
- `public.site_config`
- Politicas RLS
- Datos iniciales
- Realtime para productos y configuracion

## 3. Crear el usuario administrador

1. Ve a `Authentication` > `Users`.
2. Crea un usuario con email y contrasena.
3. Ese usuario sera el que use el panel admin de la web.

## 4. Configurar variables locales

1. Crea un archivo `.env.local` en la raiz del proyecto.
2. Copia el formato de `.env.example`.
3. Completa:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
```

## 5. Probar localmente

```bash
npm run dev
```

## 6. Importar catalogo local anterior

Si ya cargaste productos en la version vieja:

1. Abre la web en el mismo navegador donde los cargaste.
2. Revela el panel admin.
3. Inicia sesion.
4. Usa `Importar datos locales a Supabase`.

## 7. Configurar Netlify

En Netlify agrega las mismas variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Luego vuelve a desplegar el sitio.

## 8. Como entra el admin

1. Toca 5 veces el nombre del negocio en la cabecera.
2. Se muestra el acceso admin.
3. Ingresa con el email y la contrasena del usuario creado en Supabase Auth.

## Nota sobre imagenes

Las fotos siguen guardandose dentro de la base como texto para mantener esta version simple.
Por eso conviene usar imagenes chicas. La app limita la carga a menos de 700 KB por foto.
