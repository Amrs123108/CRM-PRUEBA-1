// Diagnóstico rápido: qué hay en la base antes de sembrar demo
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const modulos = await prisma.modulo.findMany({
    orderBy: { orden: "asc" },
    include: {
      etapas: { orderBy: { orden: "asc" }, include: { _count: { select: { clientes: true } } } },
      campos: { orderBy: { orden: "asc" } },
    },
  });
  for (const m of modulos) {
    const totalClientes = m.etapas.reduce((s, e) => s + e._count.clientes, 0);
    console.log(`MODULO ${m.nombre} (${m.id}) — ${totalClientes} clientes, ${m.campos.length} campos`);
    for (const e of m.etapas) console.log(`  etapa ${e.id} ${e.nombre}: ${e._count.clientes}`);
    for (const c of m.campos) console.log(`  campo ${c.nombre} (${c.tipo})`);
  }
  const clientes = await prisma.cliente.findMany({ select: { nombre: true, etapaId: true } });
  console.log("CLIENTES:", JSON.stringify(clientes));
  const adjuntos = await prisma.adjunto.count();
  console.log("ADJUNTOS:", adjuntos);
  await prisma.$disconnect();
}

main();
