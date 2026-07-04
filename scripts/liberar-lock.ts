// Diagnóstico y liberación del advisory lock de Prisma Migrate (P1002).
// Un `migrate deploy` interrumpido puede dejar la sesión viva en el pooler
// y el lock retenido para siempre. Ejecutar: npx tsx scripts/liberar-lock.ts
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Fila = {
  pid: number;
  state: string | null;
  backend_start: Date;
  query: string | null;
  application_name: string | null;
};

async function main() {
  const filas = await prisma.$queryRaw<Fila[]>`
    SELECT l.pid, a.state, a.backend_start, a.query, a.application_name
    FROM pg_locks l
    JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.locktype = 'advisory' AND l.objid = 72707369
  `;
  if (filas.length === 0) {
    console.log("Nadie tiene el lock 72707369. El P1002 fue transitorio.");
  }
  for (const f of filas) {
    console.log(
      `Lock retenido por pid ${f.pid} (${f.application_name ?? "?"}, estado ${f.state}, desde ${f.backend_start.toISOString()})`
    );
    const [r] = await prisma.$queryRaw<{ ok: boolean }[]>`
      SELECT pg_terminate_backend(${f.pid}) AS ok
    `;
    console.log(`  pg_terminate_backend(${f.pid}) → ${r.ok}`);
  }
  await prisma.$disconnect();
}

main();
