// Datos de demostración FICTICIOS (sin PII) para probar el tablero.
// Ejecutar: npx tsx scripts/seed-demo.ts
// Limpiar todo: npx tsx scripts/seed-demo.ts --limpiar
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function limpiar() {
  await prisma.adjunto.deleteMany();
  await prisma.valorCampo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.etapa.deleteMany();
  await prisma.definicionCampo.deleteMany();
  console.log("OK: base de datos vacía.");
}

function enDias(dias: number): Date {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

async function sembrar() {
  await limpiar();

  const prospeccion = await prisma.etapa.create({
    data: { nombre: "Prospección", color: "#6366f1", orden: 0 },
  });
  const analisis = await prisma.etapa.create({
    data: { nombre: "Análisis", color: "#f59e0b", orden: 1 },
  });
  const aprobado = await prisma.etapa.create({
    data: { nombre: "Aprobado", color: "#10b981", orden: 2 },
  });

  const monto = await prisma.definicionCampo.create({
    data: { nombre: "Monto", tipo: "NUMERO", orden: 0 },
  });
  const telefono = await prisma.definicionCampo.create({
    data: { nombre: "Teléfono", tipo: "TEXTO", orden: 1 },
  });
  const banco = await prisma.definicionCampo.create({
    data: {
      nombre: "Banco",
      tipo: "SELECCION",
      opciones: JSON.stringify(["Banco Uno", "Banco Dos", "Banco Tres"]),
      orden: 2,
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

  console.log("OK: 3 etapas, 3 campos y 4 clientes demo creados.");
}

async function main() {
  if (process.argv.includes("--limpiar")) await limpiar();
  else await sembrar();
  await prisma.$disconnect();
}

main();
