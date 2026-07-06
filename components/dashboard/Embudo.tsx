import type { EtapaDashboard } from "@/lib/datos";

// Cono de ancho fijo: el ancho de arriba a abajo es solo estético (silueta
// de embudo); lo que representa el dato real es el ALTO de cada franja,
// proporcional a la cantidad de clientes de esa etapa.
const ANCHO_SUP = 260;
const ANCHO_INF = 18;
const CX = ANCHO_SUP / 2;
const MARGEN_SUP = 10;
const ALTO_MINIMO_FRANJA = 26;
const ANCHO_ETIQUETAS = 190;

function mitadAncho(y: number, altoTotal: number) {
  const t = Math.min(Math.max(y / altoTotal, 0), 1);
  return ANCHO_SUP / 2 - ((ANCHO_SUP - ANCHO_INF) / 2) * t;
}

export default function Embudo({ etapas }: { etapas: EtapaDashboard[] }) {
  const total = etapas.reduce((a, e) => a + e.clientes, 0);

  if (etapas.length === 0) {
    return (
      <p className="flex flex-1 items-center justify-center text-sm text-zinc-400">
        Sin etapas todavía.
      </p>
    );
  }

  const altoTotal = Math.max(300, etapas.length * 42);
  const altoDisponible = altoTotal - ALTO_MINIMO_FRANJA * etapas.length;

  let acumulado = 0;
  const bandas = etapas.map((etapa, i) => {
    const proporcion = total > 0 ? etapa.clientes / total : 1 / etapas.length;
    const alto = ALTO_MINIMO_FRANJA + proporcion * altoDisponible;
    const yDesde = acumulado;
    const yHasta = acumulado + alto;
    acumulado = yHasta;
    const anterior = etapas[i - 1];
    const conversion =
      anterior && anterior.clientes > 0
        ? Math.round((etapa.clientes / anterior.clientes) * 100)
        : null;
    return { etapa, yDesde, yHasta, conversion };
  });

  const anchoSvg = ANCHO_SUP + ANCHO_ETIQUETAS;
  const altoSvg = altoTotal + MARGEN_SUP * 2;

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-2 text-xs text-zinc-400">
        Cantidad de clientes:{" "}
        <span className="font-semibold text-zinc-600">{total}</span>
      </p>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${anchoSvg} ${altoSvg}`}
          className="h-full w-full max-w-[440px]"
        >
          {bandas.map(({ etapa, yDesde, yHasta, conversion }) => {
            const y0 = yDesde + MARGEN_SUP;
            const y1 = yHasta + MARGEN_SUP;
            const yMedio = (y0 + y1) / 2;
            const hw0 = mitadAncho(yDesde, altoTotal);
            const hw1 = mitadAncho(yHasta, altoTotal);
            const hwMedio = mitadAncho((yDesde + yHasta) / 2, altoTotal);
            const puntos = `${CX - hw0},${y0} ${CX + hw0},${y0} ${CX + hw1},${y1} ${CX - hw1},${y1}`;

            return (
              <g key={etapa.id}>
                <polygon
                  points={puntos}
                  fill={etapa.color}
                  stroke="white"
                  strokeWidth={2}
                />
                <line
                  x1={CX + hwMedio}
                  y1={yMedio}
                  x2={ANCHO_SUP + 16}
                  y2={yMedio}
                  stroke={etapa.color}
                  strokeWidth={1.5}
                />
                <text
                  x={ANCHO_SUP + 22}
                  y={yMedio - 3}
                  fontSize="12.5"
                  fontWeight={600}
                  fill="#3f3f46"
                >
                  {etapa.nombre} : {etapa.clientes}
                </text>
                {conversion !== null && (
                  <text
                    x={ANCHO_SUP + 22}
                    y={yMedio + 12}
                    fontSize="10.5"
                    fill="#a1a1aa"
                  >
                    {conversion}% avanzó
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
