// Sirve los adjuntos guardados en ./uploads (solo dev local).
// En producción (E5) los adjuntos viven en Vercel Blob con URL propia.
import { readFile } from "fs/promises";
import { rutaSegura } from "@/lib/almacenamiento";

const TIPO_POR_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(
  _solicitud: Request,
  contexto: { params: Promise<{ clienteId: string; nombre: string }> }
) {
  const { clienteId, nombre } = await contexto.params;

  const ruta = rutaSegura(clienteId, nombre);
  if (!ruta) return new Response("Ruta inválida", { status: 400 });

  const extension = nombre.slice(nombre.lastIndexOf("."));
  const tipo = TIPO_POR_EXTENSION[extension] ?? "application/octet-stream";

  try {
    const contenido = await readFile(ruta);
    return new Response(new Uint8Array(contenido), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Archivo no encontrado", { status: 404 });
  }
}
