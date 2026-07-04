"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import {
  TIPOS_CAMPO,
  MAX_FILAS_IMPORTACION as MAX_FILAS,
  type TipoCampo,
} from "@/lib/tipos";

export type AnalisisExcel =
  | {
      ok: true;
      columnas: string[];
      filas: string[][]; // valores como texto; fechas normalizadas a YYYY-MM-DD
      total: number;
    }
  | { ok: false; error: string };

function celdaATexto(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) {
    const m = String(valor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(valor.getUTCDate()).padStart(2, "0");
    return `${valor.getUTCFullYear()}-${m}-${d}`;
  }
  if (typeof valor === "object") {
    // richText, hipervínculos, fórmulas…
    if ("richText" in valor)
      return valor.richText.map((t) => t.text).join("");
    if ("text" in valor && typeof valor.text === "string") return valor.text;
    if ("result" in valor) return celdaATexto(valor.result as ExcelJS.CellValue);
    return "";
  }
  return String(valor);
}

export async function analizarExcel(formData: FormData): Promise<AnalisisExcel> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File))
    return { ok: false, error: "No se recibió el archivo" };
  if (!archivo.name.toLowerCase().endsWith(".xlsx"))
    return { ok: false, error: "El archivo debe ser .xlsx (Excel)" };

  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(await archivo.arrayBuffer());
  } catch {
    return { ok: false, error: "No se pudo leer el archivo. ¿Es un Excel válido?" };
  }

  const hoja = libro.worksheets[0];
  if (!hoja) return { ok: false, error: "El Excel no tiene hojas" };

  const filas: string[][] = [];
  let columnas: string[] = [];
  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    const valores: string[] = [];
    fila.eachCell({ includeEmpty: true }, (celda, col) => {
      valores[col - 1] = celdaATexto(celda.value).trim();
    });
    if (numero === 1) columnas = valores;
    else filas.push(valores);
  });

  if (columnas.length === 0)
    return { ok: false, error: "La primera fila debe tener los encabezados de columna" };
  if (filas.length === 0)
    return { ok: false, error: "El Excel no tiene filas de datos (además del encabezado)" };
  if (filas.length > MAX_FILAS)
    return {
      ok: false,
      error: `El archivo tiene ${filas.length} filas; el máximo por importación es ${MAX_FILAS}`,
    };

  // Rellena encabezados vacíos y normaliza largo de filas
  columnas = columnas.map((c, i) => c || `Columna ${i + 1}`);
  const ancho = columnas.length;
  const filasNormalizadas = filas.map((f) => {
    const fila = f.slice(0, ancho);
    while (fila.length < ancho) fila.push("");
    return fila.map((v) => v ?? "");
  });

  return { ok: true, columnas, filas: filasNormalizadas, total: filasNormalizadas.length };
}

// Destino de cada columna del Excel
export type DestinoColumna =
  | { tipo: "ignorar" }
  | { tipo: "nombre" }
  | { tipo: "fechaLimite" }
  | { tipo: "campo"; campoId: string }
  | { tipo: "nuevo-campo"; nombre: string; tipoCampo: TipoCampo };

export type ResultadoImportacion =
  | { ok: true; creados: number; advertencias: string[] }
  | { ok: false; error: string };

// Acepta YYYY-MM-DD (normalizado) o DD/MM/YYYY
function parsearFechaImportada(texto: string): Date | null {
  if (!texto) return null;
  let a = 0, m = 0, d = 0;
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const latino = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (iso) [a, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (latino) [d, m, a] = [Number(latino[1]), Number(latino[2]), Number(latino[3])];
  else return null;
  const fecha = new Date(a, m - 1, d);
  return isNaN(fecha.getTime()) ? null : fecha;
}

export async function importarClientes(datos: {
  etapaId: string;
  destinos: DestinoColumna[];
  filas: string[][];
}): Promise<ResultadoImportacion> {
  const { etapaId, destinos, filas } = datos;

  if (filas.length === 0) return { ok: false, error: "No hay filas que importar" };
  if (filas.length > MAX_FILAS)
    return { ok: false, error: `Máximo ${MAX_FILAS} filas por importación` };

  const indiceNombre = destinos.findIndex((d) => d.tipo === "nombre");
  if (indiceNombre === -1)
    return { ok: false, error: "Debes asignar una columna al Nombre del cliente" };
  if (destinos.filter((d) => d.tipo === "nombre").length > 1)
    return { ok: false, error: "Solo una columna puede ser el Nombre" };
  if (destinos.filter((d) => d.tipo === "fechaLimite").length > 1)
    return { ok: false, error: "Solo una columna puede ser la Fecha límite" };

  const etapa = await prisma.etapa.findUnique({ where: { id: etapaId } });
  if (!etapa) return { ok: false, error: "La etapa destino no existe" };

  for (const destino of destinos) {
    if (
      destino.tipo === "nuevo-campo" &&
      (!destino.nombre.trim() || !TIPOS_CAMPO.includes(destino.tipoCampo))
    )
      return { ok: false, error: "Hay un campo nuevo con nombre o tipo inválido" };
  }

  // 1. Crea los campos nuevos dentro del módulo de la etapa destino
  const maxOrden = await prisma.definicionCampo.aggregate({
    where: { moduloId: etapa.moduloId },
    _max: { orden: true },
  });
  let ordenSiguiente = (maxOrden._max.orden ?? -1) + 1;
  const campoPorColumna = new Map<number, string>();

  for (let i = 0; i < destinos.length; i++) {
    const destino = destinos[i];
    if (destino.tipo === "campo") {
      const existe = await prisma.definicionCampo.findUnique({
        where: { id: destino.campoId },
      });
      if (!existe) return { ok: false, error: "Un campo asignado ya no existe" };
      if (existe.moduloId !== etapa.moduloId)
        return { ok: false, error: "Un campo asignado pertenece a otro módulo" };
      campoPorColumna.set(i, destino.campoId);
    } else if (destino.tipo === "nuevo-campo") {
      const creado = await prisma.definicionCampo.create({
        data: {
          nombre: destino.nombre.trim().slice(0, 60),
          tipo: destino.tipoCampo,
          orden: ordenSiguiente++,
          moduloId: etapa.moduloId,
        },
      });
      campoPorColumna.set(i, creado.id);
    }
  }

  // 2. Crea los clientes
  const indiceFecha = destinos.findIndex((d) => d.tipo === "fechaLimite");
  const maxOrdenCliente = await prisma.cliente.aggregate({
    where: { etapaId },
    _max: { orden: true },
  });
  let ordenCliente = (maxOrdenCliente._max.orden ?? -1) + 1;

  const advertencias: string[] = [];
  let creados = 0;

  for (let f = 0; f < filas.length; f++) {
    const fila = filas[f];
    const nombre = (fila[indiceNombre] ?? "").trim();
    if (!nombre) {
      advertencias.push(`Fila ${f + 2}: sin nombre, se omitió`);
      continue;
    }

    let fechaLimite: Date | null = null;
    if (indiceFecha !== -1) {
      const textoFecha = (fila[indiceFecha] ?? "").trim();
      if (textoFecha) {
        fechaLimite = parsearFechaImportada(textoFecha);
        if (!fechaLimite)
          advertencias.push(
            `Fila ${f + 2}: fecha "${textoFecha}" no reconocida (usa AAAA-MM-DD o DD/MM/AAAA), quedó sin fecha`
          );
      }
    }

    const valores: { campoId: string; valor: string }[] = [];
    for (const [columna, campoId] of campoPorColumna) {
      const valor = (fila[columna] ?? "").trim();
      if (valor) valores.push({ campoId, valor });
    }

    await prisma.cliente.create({
      data: {
        nombre: nombre.slice(0, 120),
        fechaLimite,
        etapaId,
        orden: ordenCliente++,
        valores: { create: valores },
      },
    });
    creados++;
  }

  revalidatePath("/");
  return { ok: true, creados, advertencias };
}
