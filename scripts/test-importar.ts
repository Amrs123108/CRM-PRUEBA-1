// Verifica la importación por Excel: genera un .xlsx en memoria con casos
// típicos (fila válida, sin nombre, fecha DD/MM/AAAA, fecha inválida) y
// ejercita analizarExcel + importarClientes.
// Ejecutar: npx tsx scripts/test-importar.ts
import "dotenv/config";
import ExcelJS from "exceljs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { analizarExcel, importarClientes } from "../lib/acciones/importar";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const etapa = await prisma.etapa.findFirst();
  if (!etapa) {
    console.error("No hay etapas. Corre primero: npx tsx scripts/seed-demo.ts");
    process.exit(1);
  }

  // Genera el Excel de prueba
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Clientes");
  hoja.addRow(["Nombre", "Fecha limite", "Monto", "Ciudad"]);
  hoja.addRow(["Importado Uno S.A.", new Date(2026, 7, 15), 1500.5, "Panamá"]);
  hoja.addRow(["", "01/08/2026", 200, "Colón"]); // sin nombre → advertencia
  hoja.addRow(["Importado Dos Ltda.", "20/08/2026", "", "David"]); // fecha latina
  hoja.addRow(["Importado Tres Corp.", "no-es-fecha", 900, ""]); // fecha inválida → advertencia
  const buffer = await libro.xlsx.writeBuffer();

  const archivo = new File([buffer], "clientes.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const fd = new FormData();
  fd.set("archivo", archivo);

  // Paso 1: análisis
  const analisis = await analizarExcel(fd);
  if (!analisis.ok) throw new Error(`analizarExcel falló: ${analisis.error}`);
  console.log(`OK análisis: columnas=[${analisis.columnas.join(", ")}] filas=${analisis.total}`);
  if (analisis.columnas.length !== 4 || analisis.total !== 4)
    throw new Error("Estructura inesperada");

  // Paso 2: importación (Monto → campo existente si hay; Ciudad → campo nuevo)
  const campoMonto = await prisma.definicionCampo.findFirst({
    where: { nombre: "Monto" },
  });
  const antes = await prisma.cliente.count();

  let resultado;
  try {
    resultado = await importarClientes({
      etapaId: etapa.id,
      destinos: [
        { tipo: "nombre" },
        { tipo: "fechaLimite" },
        campoMonto
          ? { tipo: "campo", campoId: campoMonto.id }
          : { tipo: "nuevo-campo", nombre: "Monto", tipoCampo: "NUMERO" },
        { tipo: "nuevo-campo", nombre: "Ciudad", tipoCampo: "TEXTO" },
      ],
      filas: analisis.filas,
    });
  } catch (e) {
    // revalidatePath falla fuera de Next; los datos ya quedaron escritos
    console.log(`(revalidatePath fuera de Next: ${(e as Error).message.slice(0, 60)}…)`);
  }

  const despues = await prisma.cliente.count();
  console.log(`OK importación: ${despues - antes} clientes creados (esperados 3)`);
  if (resultado?.ok) {
    console.log(`Advertencias (${resultado.advertencias.length}):`);
    for (const a of resultado.advertencias) console.log(`  - ${a}`);
  }

  // Verifica el detalle de uno
  const importado = await prisma.cliente.findFirst({
    where: { nombre: "Importado Dos Ltda." },
    include: { valores: { include: { campo: true } } },
  });
  console.log(
    `Verificación "Importado Dos": fecha=${importado?.fechaLimite?.toISOString().slice(0, 10)} valores=${importado?.valores
      .map((v) => `${v.campo.nombre}=${v.valor}`)
      .join(", ")}`
  );

  await prisma.$disconnect();
}

main();
