import { obtenerTablero, obtenerConfiguracion, obtenerCampos } from "@/lib/datos";
import Tablero from "@/components/tablero/Tablero";

export const dynamic = "force-dynamic";

export default async function PaginaPrincipal() {
  const [etapas, config, campos] = await Promise.all([
    obtenerTablero(),
    obtenerConfiguracion(),
    obtenerCampos(),
  ]);

  return (
    <Tablero
      etapasIniciales={etapas}
      diasAviso={config.diasAviso}
      campos={campos}
    />
  );
}
