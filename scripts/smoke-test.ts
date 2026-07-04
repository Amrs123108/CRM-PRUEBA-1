// Prueba de humo: verifica conexión a la BD y CRUD básico.
// Ejecutar: npx tsx scripts/smoke-test.ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
  const prisma = new PrismaClient({ adapter });

  const etapa = await prisma.etapa.create({
    data: { nombre: "Etapa de prueba", orden: 0 },
  });
  const cliente = await prisma.cliente.create({
    data: { nombre: "Cliente de prueba", etapaId: etapa.id },
  });
  const conteo = await prisma.cliente.count();
  console.log(`OK: etapa "${etapa.nombre}" y cliente "${cliente.nombre}" creados. Total clientes: ${conteo}`);

  await prisma.cliente.delete({ where: { id: cliente.id } });
  await prisma.etapa.delete({ where: { id: etapa.id } });
  console.log("OK: limpieza completada. La base queda vacía.");
  await prisma.$disconnect();
}

main();
