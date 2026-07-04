// Prueba de humo: verifica conexión a la BD y CRUD básico.
// Ejecutar: npx tsx scripts/smoke-test.ts
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const modulo = await prisma.modulo.create({
    data: { nombre: "Módulo de prueba", orden: 999 },
  });
  const etapa = await prisma.etapa.create({
    data: { nombre: "Etapa de prueba", orden: 0, moduloId: modulo.id },
  });
  const cliente = await prisma.cliente.create({
    data: { nombre: "Cliente de prueba", etapaId: etapa.id },
  });
  const conteo = await prisma.cliente.count();
  console.log(`OK: módulo, etapa y cliente de prueba creados. Total clientes: ${conteo}`);

  await prisma.cliente.delete({ where: { id: cliente.id } });
  await prisma.modulo.delete({ where: { id: modulo.id } }); // cascada a la etapa
  console.log("OK: limpieza completada. La base queda vacía.");
  await prisma.$disconnect();
}

main();
