// Datos de demostración FICTICIOS (sin PII) para probar el tablero.
// Ejecutar: npx tsx scripts/seed-demo.ts
// Limpiar todo: npx tsx scripts/seed-demo.ts --limpiar
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function limpiar() {
  await prisma.adjunto.deleteMany();
  await prisma.valorCampo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.definicionCampo.deleteMany();
  console.log("OK: clientes, valores, adjuntos y campos eliminados (módulos y etapas se conservan).");
}

function enDias(dias: number): Date {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

async function sembrar() {
  await limpiar();

  // Siembra dentro del módulo Ventas (creado por la migración de módulos)
  let modulo = await prisma.modulo.findFirst({
    where: { nombre: "Ventas" },
    include: { etapas: { orderBy: { orden: "asc" } } },
  });
  if (!modulo) {
    const creado = await prisma.modulo.create({
      data: { nombre: "Ventas", orden: 0 },
    });
    modulo = { ...creado, etapas: [] };
  }

  let etapas = modulo.etapas;
  if (etapas.length < 3) {
    etapas = await Promise.all(
      ["Prospecto", "Interesado", "Cliente"].map((nombre, i) =>
        prisma.etapa.create({
          data: { nombre, orden: i, moduloId: modulo.id },
        })
      )
    );
  }
  const [prospeccion, analisis, aprobado] = etapas;

  const monto = await prisma.definicionCampo.create({
    data: { nombre: "Monto", tipo: "NUMERO", orden: 0, moduloId: modulo.id },
  });
  const telefono = await prisma.definicionCampo.create({
    data: { nombre: "Teléfono", tipo: "TEXTO", orden: 1, moduloId: modulo.id },
  });
  const banco = await prisma.definicionCampo.create({
    data: {
      nombre: "Banco",
      tipo: "SELECCION",
      opciones: JSON.stringify(["Banco Uno", "Banco Dos", "Banco Tres"]),
      orden: 2,
      moduloId: modulo.id,
    },
  });

  // Un cliente por cada estado del semáforo
  await prisma.cliente.create({
    data: {
      nombre: "Empresa Demo Atrasada S.A.",
      etapaId: prospeccion.id,
      orden: 0,
      fechaLimite: enDias(-3), // Tarde
      valores: {
        create: [
          { campoId: monto.id, valor: "4500.00" },
          { campoId: banco.id, valor: "Banco Uno" },
        ],
      },
    },
  });
  await prisma.cliente.create({
    data: {
      nombre: "Comercial Demo Urgente Ltda.",
      etapaId: prospeccion.id,
      orden: 1,
      fechaLimite: enDias(2), // Cerca de vencer (con aviso de 3 días)
      valores: {
        create: [
          { campoId: monto.id, valor: "12800.50" },
          { campoId: telefono.id, valor: "6000-0000" },
        ],
      },
    },
  });
  await prisma.cliente.create({
    data: {
      nombre: "Grupo Demo Tranquilo Corp.",
      etapaId: analisis.id,
      orden: 0,
      fechaLimite: enDias(30), // A tiempo
      valores: { create: [{ campoId: monto.id, valor: "7300.00" }] },
    },
  });
  await prisma.cliente.create({
    data: {
      nombre: "Servicios Demo Sin Fecha",
      etapaId: aprobado.id,
      orden: 0,
      fechaLimite: null, // Sin fecha
    },
  });

  console.log(`OK: 3 campos y 4 clientes demo creados en el módulo "${modulo.nombre}".`);
}

async function main() {
  if (process.argv.includes("--limpiar")) await limpiar();
  else await sembrar();
  await prisma.$disconnect();
}

main();
