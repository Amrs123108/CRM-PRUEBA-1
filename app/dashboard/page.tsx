import {
  obtenerModulos,
  obtenerConfiguracion,
  obtenerDashboard,
} from "@/lib/datos";
import Dashboard from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function PaginaDashboard({
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
  const datos = moduloActivo
    ? await obtenerDashboard(moduloActivo.id, config.diasAviso)
    : null;

  return (
    <Dashboard modulos={modulos} moduloActivo={moduloActivo} datos={datos} />
  );
}
