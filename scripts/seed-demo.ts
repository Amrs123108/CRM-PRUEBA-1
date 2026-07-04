// Datos de demostración FICTICIOS (sin PII real) para que el cliente
// pueda observar y usar la herramienta con los dos módulos poblados.
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

// Fecha relativa a hoy, sin hora (null = sin fecha límite)
function enDias(dias: number): Date {
  const f = new Date();
  f.setDate(f.getDate() + dias);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate());
}

type CampoDemo = {
  nombre: string;
  tipo: "TEXTO" | "NUMERO" | "FECHA" | "SELECCION";
  opciones?: string[];
};

type ClienteDemo = {
  nombre: string;
  etapa: number; // índice de la etapa dentro del módulo (0 = primera)
  dias: number | null; // fecha límite relativa a hoy
  valores: Record<string, string>; // nombre de campo → valor
};

async function sembrarModulo(
  moduloId: string,
  campos: CampoDemo[],
  clientes: ClienteDemo[]
) {
  const modulo = await prisma.modulo.findUnique({
    where: { id: moduloId },
    include: { etapas: { orderBy: { orden: "asc" } } },
  });
  if (!modulo) {
    console.log(`AVISO: no existe el módulo ${moduloId}, se omite.`);
    return;
  }

  const campoPorNombre = new Map<string, string>();
  for (const [i, c] of campos.entries()) {
    const creado = await prisma.definicionCampo.create({
      data: {
        nombre: c.nombre,
        tipo: c.tipo,
        opciones: c.opciones ? JSON.stringify(c.opciones) : null,
        orden: i,
        moduloId: modulo.id,
      },
    });
    campoPorNombre.set(c.nombre, creado.id);
  }

  const ordenPorEtapa = new Map<string, number>();
  for (const cl of clientes) {
    const etapa = modulo.etapas[cl.etapa];
    if (!etapa) continue;
    const orden = ordenPorEtapa.get(etapa.id) ?? 0;
    ordenPorEtapa.set(etapa.id, orden + 1);
    await prisma.cliente.create({
      data: {
        nombre: cl.nombre,
        etapaId: etapa.id,
        orden,
        fechaLimite: cl.dias === null ? null : enDias(cl.dias),
        valores: {
          create: Object.entries(cl.valores).map(([nombre, valor]) => ({
            campoId: campoPorNombre.get(nombre)!,
            valor,
          })),
        },
      },
    });
  }
  console.log(
    `OK: módulo "${modulo.nombre}" — ${campos.length} campos y ${clientes.length} clientes demo.`
  );
}

// ── Módulo Ventas ──────────────────────────────────────────────────────
// Etapas: 0 Prospecto · 1 Primer contacto · 2 Interesado · 3 Reunión ·
//         4 Propuesta enviada · 5 Negociación · 6 Cliente
const CAMPOS_VENTAS: CampoDemo[] = [
  { nombre: "Contacto", tipo: "TEXTO" },
  { nombre: "Teléfono", tipo: "TEXTO" },
  { nombre: "Correo", tipo: "TEXTO" },
  { nombre: "Valor estimado", tipo: "NUMERO" },
  {
    nombre: "Origen",
    tipo: "SELECCION",
    opciones: ["Referido", "Sitio web", "Llamada en frío", "Redes sociales"],
  },
];

const CLIENTES_VENTAS: ClienteDemo[] = [
  { nombre: "Distribuidora Altamar, S.A.", etapa: 0, dias: 6, valores: { Contacto: "Ricardo Samaniego", Teléfono: "6412-8830", "Valor estimado": "8500", Origen: "Sitio web" } },
  { nombre: "Ferretería El Tornillo, S.A.", etapa: 0, dias: -2, valores: { Contacto: "Aurelio Pinzón", Teléfono: "6209-5511", Origen: "Llamada en frío" } },
  { nombre: "Panadería La Espiga Dorada", etapa: 0, dias: null, valores: { Contacto: "Marta Ledezma", Correo: "info@espigadorada.demo", Origen: "Redes sociales" } },
  { nombre: "Transporte Cordillera, S.A.", etapa: 1, dias: 2, valores: { Contacto: "Jorge Quintero", Teléfono: "6788-1204", "Valor estimado": "15200", Origen: "Referido" } },
  { nombre: "Clínica Dental Sonrisa Plena", etapa: 1, dias: 10, valores: { Contacto: "Dra. Elena Bustamante", Correo: "citas@sonrisaplena.demo", "Valor estimado": "4300", Origen: "Sitio web" } },
  { nombre: "Tecnología Ístmica Corp.", etapa: 2, dias: 3, valores: { Contacto: "Yariela Espino", Teléfono: "6355-9047", "Valor estimado": "27600", Origen: "Referido" } },
  { nombre: "Restaurante Mar y Leña", etapa: 2, dias: -5, valores: { Contacto: "Camilo Herrera", Teléfono: "6114-2278", "Valor estimado": "6900", Origen: "Redes sociales" } },
  { nombre: "Óptica Visión Clara", etapa: 2, dias: 21, valores: { Contacto: "Rosa E. Villarreal", Correo: "gerencia@visionclara.demo", Origen: "Sitio web" } },
  { nombre: "Constructora Vega y Asociados", etapa: 3, dias: 1, valores: { Contacto: "Ing. Bolívar Vega", Teléfono: "6501-7763", "Valor estimado": "48000", Origen: "Referido" } },
  { nombre: "Academia de Idiomas Puente", etapa: 3, dias: 14, valores: { Contacto: "Lissette Moreno", Correo: "direccion@puente.demo", "Valor estimado": "9800", Origen: "Sitio web" } },
  { nombre: "Inmobiliaria Bahía Azul", etapa: 4, dias: -1, valores: { Contacto: "Gustavo Ríos", Teléfono: "6640-3382", "Valor estimado": "35500", Origen: "Referido" } },
  { nombre: "Laboratorio Delta Análisis", etapa: 4, dias: 8, valores: { Contacto: "Dr. Iván Castillero", Correo: "compras@deltalab.demo", "Valor estimado": "18750", Origen: "Llamada en frío" } },
  { nombre: "Supermercados El Ahorro Feliz", etapa: 5, dias: 2, valores: { Contacto: "Nadia Espinosa", Teléfono: "6923-4410", "Valor estimado": "62000", Origen: "Referido" } },
  { nombre: "Agroexportadora Tierra Alta", etapa: 5, dias: 28, valores: { Contacto: "Fermín Aparicio", Correo: "fermin@tierraalta.demo", "Valor estimado": "41300", Origen: "Sitio web" } },
  { nombre: "Hotel Brisas del Golfo", etapa: 6, dias: null, valores: { Contacto: "Karen Domínguez", Teléfono: "6077-6651", "Valor estimado": "23400", Origen: "Referido" } },
  { nombre: "Editorial Faro Iberia", etapa: 6, dias: 45, valores: { Contacto: "Saúl Betancourt", Correo: "saul@faroiberia.demo", "Valor estimado": "12100", Origen: "Redes sociales" } },
];

// ── Módulo Cobros Judiciales ───────────────────────────────────────────
// Etapas: 0 Documentación recibida · 1 Análisis Legal · 2 Preparando demanda ·
//         3 Demanda presentada · 4 Proceso Judicial · 5 Negociación ·
//         6 Acuerdo de Pago · 7 Pagando · 8 Caso Cerrado
const CAMPOS_COBROS: CampoDemo[] = [
  { nombre: "N° de expediente", tipo: "TEXTO" },
  { nombre: "Monto adeudado", tipo: "NUMERO" },
  {
    nombre: "Abogado asignado",
    tipo: "SELECCION",
    opciones: ["Lic. Serrano", "Lic. Batista", "Lic. Cornejo"],
  },
  {
    nombre: "Tipo de deuda",
    tipo: "SELECCION",
    opciones: ["Préstamo personal", "Tarjeta de crédito", "Factura comercial", "Arrendamiento"],
  },
  { nombre: "Última gestión", tipo: "FECHA" },
];

const CLIENTES_COBROS: ClienteDemo[] = [
  { nombre: "Rogelio Ábrego M.", etapa: 0, dias: 3, valores: { "N° de expediente": "EXP-2026-0141", "Monto adeudado": "3250", "Abogado asignado": "Lic. Serrano", "Tipo de deuda": "Préstamo personal" } },
  { nombre: "Comercial Del Río, S.A.", etapa: 0, dias: -4, valores: { "N° de expediente": "EXP-2026-0138", "Monto adeudado": "18400", "Abogado asignado": "Lic. Batista", "Tipo de deuda": "Factura comercial" } },
  { nombre: "Vielka Sandoval C.", etapa: 1, dias: 2, valores: { "N° de expediente": "EXP-2026-0129", "Monto adeudado": "5120", "Abogado asignado": "Lic. Cornejo", "Tipo de deuda": "Tarjeta de crédito" } },
  { nombre: "Talleres Unidos Chiriquí", etapa: 1, dias: 12, valores: { "N° de expediente": "EXP-2026-0126", "Monto adeudado": "9740", "Abogado asignado": "Lic. Serrano", "Tipo de deuda": "Factura comercial" } },
  { nombre: "Edwin Castañeda R.", etapa: 2, dias: -1, valores: { "N° de expediente": "EXP-2026-0117", "Monto adeudado": "7600", "Abogado asignado": "Lic. Batista", "Tipo de deuda": "Préstamo personal" } },
  { nombre: "Arrendamientos Colón Plaza", etapa: 3, dias: 5, valores: { "N° de expediente": "EXP-2026-0102", "Monto adeudado": "22150", "Abogado asignado": "Lic. Cornejo", "Tipo de deuda": "Arrendamiento" } },
  { nombre: "Milagros Pineda A.", etapa: 4, dias: 18, valores: { "N° de expediente": "EXP-2025-0871", "Monto adeudado": "11300", "Abogado asignado": "Lic. Serrano", "Tipo de deuda": "Tarjeta de crédito" } },
  { nombre: "Importadora Meridiano Corp.", etapa: 4, dias: -8, valores: { "N° de expediente": "EXP-2025-0866", "Monto adeudado": "54800", "Abogado asignado": "Lic. Batista", "Tipo de deuda": "Factura comercial" } },
  { nombre: "Bernardo Justiniani L.", etapa: 5, dias: 1, valores: { "N° de expediente": "EXP-2025-0842", "Monto adeudado": "6450", "Abogado asignado": "Lic. Cornejo", "Tipo de deuda": "Préstamo personal" } },
  { nombre: "Panificadora Nuevo Amanecer", etapa: 6, dias: 9, valores: { "N° de expediente": "EXP-2025-0810", "Monto adeudado": "14200", "Abogado asignado": "Lic. Serrano", "Tipo de deuda": "Factura comercial" } },
  { nombre: "Dalys Rodríguez V.", etapa: 7, dias: 25, valores: { "N° de expediente": "EXP-2025-0788", "Monto adeudado": "4980", "Abogado asignado": "Lic. Batista", "Tipo de deuda": "Tarjeta de crédito" } },
  { nombre: "Autopartes La Bujía de Oro", etapa: 7, dias: 40, valores: { "N° de expediente": "EXP-2025-0764", "Monto adeudado": "8330", "Abogado asignado": "Lic. Cornejo", "Tipo de deuda": "Factura comercial" } },
  { nombre: "Esteban Villamonte G.", etapa: 8, dias: null, valores: { "N° de expediente": "EXP-2025-0701", "Monto adeudado": "0", "Abogado asignado": "Lic. Serrano", "Tipo de deuda": "Préstamo personal" } },
];

// A los clientes de Cobros se les llena "Última gestión" con fechas recientes
function conUltimaGestion(clientes: ClienteDemo[]): ClienteDemo[] {
  return clientes.map((c, i) => {
    const fecha = enDias(-((i % 9) + 1)); // entre ayer y hace 9 días
    const iso = fecha.toISOString().slice(0, 10);
    return { ...c, valores: { ...c.valores, "Última gestión": iso } };
  });
}

async function sembrar() {
  await limpiar();
  await sembrarModulo("mod-ventas", CAMPOS_VENTAS, CLIENTES_VENTAS);
  await sembrarModulo("mod-cobros", CAMPOS_COBROS, conUltimaGestion(CLIENTES_COBROS));
}

async function main() {
  if (process.argv.includes("--limpiar")) await limpiar();
  else await sembrar();
  await prisma.$disconnect();
}

main();
