# Supabase + Netlify Setup

## 1. Crear el proyecto

1. Crea un proyecto nuevo en Supabase.
2. Espera a que termine la provision.

## 2. Ejecutar el esquema

1. Abre `SQL Editor`.
2. Copia todo el archivo `supabase/schema.sql`.
3. Ejecutalo completo.

Ese script:

- crea o ajusta `products`, `site_config` y `profiles`
- activa RLS
- agrega realtime para catalogo y configuracion
- prepara roles `ADMIN` y `USER`
- deja un trigger para crear perfiles cuando se registran usuarios

## 3. Crear el usuario administrador

1. Ve a `Authentication` > `Users`.
2. Crea el usuario con email y contrasena.
3. Luego abre `Table Editor` > `profiles`.
4. Busca ese email y cambia el campo `role` a `ADMIN`.

Tambien puedes hacerlo por SQL:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'tu-admin@dominio.com';
```

## 4. Variables locales

Crea `.env.local` en la raiz del proyecto con este formato:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key_publica
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_privada
APP_JWT_SECRET=una_clave_larga_y_segura_para_firmar_jwt
```

Notas:

- `VITE_...` se usa en el frontend para catalogo publico y realtime.
- `SUPABASE_SERVICE_ROLE_KEY` se usa solo en Netlify Functions.
- `APP_JWT_SECRET` firma el JWT propio del panel admin.
- No subas `.env.local` a GitHub.

## 5. Probar localmente

El catalogo publico funciona con:

```bash
npm run dev
```

Para probar los endpoints protegidos en local, lo ideal es usar `netlify dev`.
Si no lo usas, el modo desarrollo igual puede apoyarse en Supabase directo para no frenarte mientras diseñas el panel.

## 6. Migrar catalogo viejo del navegador

Si en una compu todavia tienes productos guardados localmente de la version anterior:

1. Entra al dashboard en esa misma compu.
2. Inicia sesion como admin.
3. Busca la tarjeta `Sincronizacion y migracion`.
4. Toca `Subir este catalogo a Supabase`.

Eso publica ese catalogo para todos los dispositivos.

## 7. Variables en Netlify

En `Project configuration` > `Environment variables`, agrega:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_JWT_SECRET`

Luego dispara un redeploy.

## 8. Acceso administrador

La tienda publica queda en `#/`.

El panel admin entra por:

```text
#/admin
```

Flujo:

1. Abrir `https://tu-sitio.netlify.app/#/admin`
2. Iniciar sesion con el usuario admin
3. El backend valida credenciales, rol y devuelve JWT
4. El dashboard usa ese JWT para acciones protegidas

## 9. Imagenes

Las imagenes siguen guardandose como texto base64 para mantener esta version simple y desplegable sin storage extra.
La app limita cada foto a menos de `700 KB`.

Si mas adelante quieres una version mas escalable, el siguiente paso natural es mover imagenes a Supabase Storage.
