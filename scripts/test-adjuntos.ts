// Verifica la capa de almacenamiento: guarda una imagen PNG de prueba
// para el primer cliente demo y crea su registro Adjunto.
// Ejecutar: npx tsx scripts/test-adjuntos.ts
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { guardarArchivo } from "../lib/almacenamiento";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

// PNG válido de 1x1 pixel
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

async function main() {
  const cliente = await prisma.cliente.findFirst();
  if (!cliente) {
    console.error("No hay clientes. Corre primero: npx tsx scripts/seed-demo.ts");
    process.exit(1);
  }

  const archivo = new File([PNG_1X1], "prueba.png", { type: "image/png" });
  const { url } = await guardarArchivo(cliente.id, archivo);
  const adjunto = await prisma.adjunto.create({
    data: {
      clienteId: cliente.id,
      nombre: "prueba.png",
      tipoMime: "image/png",
      url,
      tamano: PNG_1X1.length,
    },
  });
  console.log(`OK: adjunto guardado para "${cliente.nombre}"`);
  console.log(`URL: http://localhost:3000${adjunto.url}`);
  await prisma.$disconnect();
}

main();
