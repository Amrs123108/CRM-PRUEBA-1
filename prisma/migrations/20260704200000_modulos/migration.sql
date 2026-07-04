-- Módulos (pipelines independientes): Ventas y Cobros Judiciales.
-- Migración escrita a mano para preservar datos existentes.

-- 1. Tabla Modulo
CREATE TABLE "Modulo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- 2. Columna moduloId (primero opcional para poder rellenar)
ALTER TABLE "Etapa" ADD COLUMN "moduloId" TEXT;
ALTER TABLE "DefinicionCampo" ADD COLUMN "moduloId" TEXT;

-- 3. Si ya existían etapas o campos (creados antes de los módulos),
--    se conservan dentro de un módulo "General"
INSERT INTO "Modulo" ("id", "nombre", "orden")
SELECT 'mod-general', 'General', 99
WHERE EXISTS (SELECT 1 FROM "Etapa") OR EXISTS (SELECT 1 FROM "DefinicionCampo");

UPDATE "Etapa" SET "moduloId" = 'mod-general' WHERE "moduloId" IS NULL;
UPDATE "DefinicionCampo" SET "moduloId" = 'mod-general' WHERE "moduloId" IS NULL;

-- 4. Ahora sí: obligatorio + llaves foráneas con borrado en cascada
ALTER TABLE "Etapa" ALTER COLUMN "moduloId" SET NOT NULL;
ALTER TABLE "DefinicionCampo" ALTER COLUMN "moduloId" SET NOT NULL;

ALTER TABLE "Etapa" ADD CONSTRAINT "Etapa_moduloId_fkey"
    FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DefinicionCampo" ADD CONSTRAINT "DefinicionCampo_moduloId_fkey"
    FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Módulos del cliente (documento "CRM DE SEGUIMIENTO") con sus etapas.
--    Idempotente: solo si no existen todavía.
INSERT INTO "Modulo" ("id", "nombre", "orden")
SELECT 'mod-ventas', 'Ventas', 0
WHERE NOT EXISTS (SELECT 1 FROM "Modulo" WHERE "id" = 'mod-ventas');

INSERT INTO "Modulo" ("id", "nombre", "orden")
SELECT 'mod-cobros', 'Cobros Judiciales', 1
WHERE NOT EXISTS (SELECT 1 FROM "Modulo" WHERE "id" = 'mod-cobros');

INSERT INTO "Etapa" ("id", "nombre", "color", "orden", "moduloId")
SELECT v.id, v.nombre, v.color, v.orden, 'mod-ventas'
FROM (VALUES
    ('etv-01', 'Prospecto',         '#64748b', 0),
    ('etv-02', 'Primer contacto',   '#0ea5e9', 1),
    ('etv-03', 'Interesado',        '#6366f1', 2),
    ('etv-04', 'Reunión',           '#8b5cf6', 3),
    ('etv-05', 'Propuesta enviada', '#ec4899', 4),
    ('etv-06', 'Negociación',       '#f59e0b', 5),
    ('etv-07', 'Cliente',           '#10b981', 6)
) AS v(id, nombre, color, orden)
WHERE NOT EXISTS (SELECT 1 FROM "Etapa" WHERE "moduloId" = 'mod-ventas');

INSERT INTO "Etapa" ("id", "nombre", "color", "orden", "moduloId")
SELECT v.id, v.nombre, v.color, v.orden, 'mod-cobros'
FROM (VALUES
    ('etc-01', 'Documentación recibida', '#64748b', 0),
    ('etc-02', 'Análisis Legal',         '#0ea5e9', 1),
    ('etc-03', 'Preparando demanda',     '#6366f1', 2),
    ('etc-04', 'Demanda presentada',     '#8b5cf6', 3),
    ('etc-05', 'Proceso Judicial',       '#ec4899', 4),
    ('etc-06', 'Negociación',            '#f59e0b', 5),
    ('etc-07', 'Acuerdo de Pago',        '#f59e0b', 6),
    ('etc-08', 'Pagando',                '#0ea5e9', 7),
    ('etc-09', 'Caso Cerrado',           '#10b981', 8)
) AS v(id, nombre, color, orden)
WHERE NOT EXISTS (SELECT 1 FROM "Etapa" WHERE "moduloId" = 'mod-cobros');
