import type {
  Etapa,
  Cliente,
  ValorCampo,
  DefinicionCampo,
  Adjunto,
} from "@/app/generated/prisma/client";

export type ValorConCampo = ValorCampo & { campo: DefinicionCampo };

export type ClienteCompleto = Cliente & {
  valores: ValorConCampo[];
  adjuntos: Adjunto[];
};

export type EtapaConClientes = Etapa & { clientes: ClienteCompleto[] };

export type { Etapa, Cliente, DefinicionCampo, Adjunto };

export const TIPOS_CAMPO = ["TEXTO", "NUMERO", "FECHA", "SELECCION"] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

export const ETIQUETA_TIPO_CAMPO: Record<TipoCampo, string> = {
  TEXTO: "Texto",
  NUMERO: "Número",
  FECHA: "Fecha",
  SELECCION: "Selección",
};

export const MAX_FILAS_IMPORTACION = 500;

// Paleta para etapas (acento indigo + tonos sobrios, estilo Linear)
export const COLORES_ETAPA = [
  "#6366f1", // indigo
  "#0ea5e9", // azul cielo
  "#10b981", // esmeralda
  "#f59e0b", // ámbar
  "#ef4444", // rojo
  "#8b5cf6", // violeta
  "#ec4899", // rosa
  "#64748b", // gris pizarra
] as const;
