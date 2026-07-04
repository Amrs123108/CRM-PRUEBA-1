import {
  obtenerModulos,
  obtenerTablero,
  obtenerConfiguracion,
  obtenerCampos,
} from "@/lib/datos";
import Tablero from "@/components/tablero/Tablero";

export const dynamic = "force-dynamic";

export default async function PaginaPrincipal({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string }>;
}) {
  const { modulo } = await searchParams;
  const [modulos, config] = await Promise.all([
    obtenerModulos(),
    obtenerConfiguracion(),
  ]);

  const moduloActivo = modulos.find((m) => m.id === modulo) ?? modulos[0] ?? null;

  const [etapas, campos] = moduloActivo
    ? await Promise.all([
        obtenerTablero(moduloActivo.id),
        obtenerCampos(moduloActivo.id),
      ])
    : [[], []];

  return (
    <Tablero
      modulos={modulos}
      moduloActivo={moduloActivo}
      etapasIniciales={etapas}
      diasAviso={config.diasAviso}
      campos={campos}
    />
  );
}
