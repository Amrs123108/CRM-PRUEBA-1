// Almacenamiento de adjuntos.
// Producción (Vercel): Vercel Blob (detectado por BLOB_READ_WRITE_TOKEN).
// Dev local sin token: escribe en ./uploads y sirve vía /api/archivos.
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";

export const TAMANO_MAXIMO = 8 * 1024 * 1024; // 8 MB

export const TIPOS_PERMITIDOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

export function esImagen(tipoMime: string): boolean {
  return tipoMime.startsWith("image/");
}

const DIR_UPLOADS = path.join(process.cwd(), "uploads");

function usarBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// Nombre físico seguro: uuid + extensión validada (nunca el nombre original)
export async function guardarArchivo(
  clienteId: string,
  archivo: File
): Promise<{ url: string; nombreArchivo: string }> {
  const extension = TIPOS_PERMITIDOS[archivo.type];
  if (!extension) throw new Error("Tipo de archivo no permitido");
  if (archivo.size > TAMANO_MAXIMO) throw new Error("El archivo supera 8 MB");

  const nombreArchivo = `${crypto.randomUUID()}${extension}`;

  if (usarBlob()) {
    const blob = await put(`adjuntos/${clienteId}/${nombreArchivo}`, archivo, {
      access: "public",
      contentType: archivo.type,
    });
    return { url: blob.url, nombreArchivo };
  }

  const dir = path.join(DIR_UPLOADS, clienteId);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await archivo.arrayBuffer());
  await writeFile(path.join(dir, nombreArchivo), buffer);
  return { url: `/api/archivos/${clienteId}/${nombreArchivo}`, nombreArchivo };
}

export async function eliminarArchivo(url: string): Promise<void> {
  // URL absoluta → Vercel Blob
  if (url.startsWith("http")) {
    if (usarBlob()) {
      try {
        await del(url);
      } catch {
        // si el blob ya no existe, no es un error fatal
      }
    }
    return;
  }

  // URL local: /api/archivos/{clienteId}/{nombreArchivo}
  const partes = url.split("/").filter(Boolean);
  const clienteId = partes[2];
  const nombreArchivo = partes[3];
  if (!clienteId || !nombreArchivo) return;
  const ruta = rutaSegura(clienteId, nombreArchivo);
  if (!ruta) return;
  try {
    await unlink(ruta);
  } catch {
    // si el archivo físico ya no existe, no es un error fatal
  }
}

// Evita path traversal: solo permite segmentos alfanuméricos con guiones/punto
export function rutaSegura(
  clienteId: string,
  nombreArchivo: string
): string | null {
  if (!/^[a-zA-Z0-9-]+$/.test(clienteId)) return null;
  if (!/^[a-zA-Z0-9-]+\.[a-z0-9]+$/.test(nombreArchivo)) return null;
  return path.join(DIR_UPLOADS, clienteId, nombreArchivo);
}
