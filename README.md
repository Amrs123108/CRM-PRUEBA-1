# CRM de prueba V1 — Proyecto A&C

Tablero Kanban de clientes con etapas y campos 100% configurables desde la
interfaz. Versión de prueba para demostración.

## Funciones

- **Kanban con drag & drop**: arrastra clientes entre etapas; el orden se guarda.
- **Etapas configurables**: crear, renombrar, cambiar color, reordenar y
  eliminar columnas desde la UI (al eliminar, elige a dónde mover los clientes).
- **Semáforo de vencimiento**: Tarde / Cerca de vencer / A tiempo según la
  fecha límite de cada cliente; los días de aviso se configuran en ⚙.
- **Campos personalizados** (botón "Campos"): texto, número, fecha o selección
  con opciones — deciden qué información capturar por cliente.
- **Panel de detalle**: clic en una tarjeta muestra toda la información y los
  adjuntos; se pueden subir imágenes (JPG/PNG/WebP/GIF) y PDF de hasta 8 MB.
- **Importación por Excel**: sube un `.xlsx`, mapea cada columna a un campo
  (o crea el campo al vuelo) e importa hasta 500 filas con reporte de
  advertencias.

## Stack

- Next.js 16 (App Router) + Tailwind CSS v4
- Prisma 7 + SQLite en desarrollo local (migrará a Vercel Postgres en producción)
- Adjuntos en disco local vía `./uploads` (migrará a Vercel Blob en producción)

## Desarrollo local

```bash
npm install
npx prisma migrate dev   # crea la base de datos local (dev.db)
npm run dev              # http://localhost:3000
```

Datos de demostración (ficticios): `npx tsx scripts/seed-demo.ts`
Vaciar el tablero: `npx tsx scripts/seed-demo.ts --limpiar`

> **Nota**: `dev.db` y `uploads/` están fuera de git; nunca subir datos
> reales de clientes al repositorio.
