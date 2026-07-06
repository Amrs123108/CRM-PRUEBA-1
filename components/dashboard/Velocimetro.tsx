const CX = 120;
const CY = 128;
const R_EXT = 92;
const R_INT = 70;
const ANGULO_INICIO = 165; // grados; 0=derecha, 90=abajo, 180=izquierda, 270=arriba
const BARRIDO = 210;

// Zonas fijas del velocímetro, como proporción [0,1] de la meta
const ZONAS: { desde: number; hasta: number; color: string }[] = [
  { desde: 0, hasta: 0.4, color: "#f87171" }, // rojo
  { desde: 0.4, hasta: 0.65, color: "#fbbf24" }, // ámbar
  { desde: 0.65, hasta: 1, color: "#6ee7b7" }, // verde
];

function punto(radio: number, anguloGrados: number) {
  const rad = (anguloGrados * Math.PI) / 180;
  return { x: CX + radio * Math.cos(rad), y: CY + radio * Math.sin(rad) };
}

function anguloDePct(pct: number) {
  return ANGULO_INICIO + pct * BARRIDO;
}

function rutaZona(desdePct: number, hastaPct: number) {
  const a0 = anguloDePct(desdePct);
  const a1 = anguloDePct(hastaPct);
  const pExtIni = punto(R_EXT, a0);
  const pExtFin = punto(R_EXT, a1);
  const pIntFin = punto(R_INT, a1);
  const pIntIni = punto(R_INT, a0);
  const arcoGrande = hastaPct - desdePct > 0.5 ? 1 : 0;
  return `M ${pExtIni.x} ${pExtIni.y} A ${R_EXT} ${R_EXT} 0 ${arcoGrande} 1 ${pExtFin.x} ${pExtFin.y} L ${pIntFin.x} ${pIntFin.y} A ${R_INT} ${R_INT} 0 ${arcoGrande} 0 ${pIntIni.x} ${pIntIni.y} Z`;
}

export default function Velocimetro({
  titulo,
  logrado,
  meta,
  formato,
}: {
  titulo: string;
  logrado: number;
  meta: number;
  formato: (n: number) => string;
}) {
  const pct = meta > 0 ? Math.min(Math.max(logrado / meta, 0), 1) : 0;
  const anguloAguja = anguloDePct(pct);
  const puntaAguja = punto(R_INT - 6, anguloAguja);
  const anguloPerp = ((anguloAguja + 90) * Math.PI) / 180;
  const anchoBase = 6;
  const base1 = {
    x: CX + anchoBase * Math.cos(anguloPerp),
    y: CY + anchoBase * Math.sin(anguloPerp),
  };
  const base2 = {
    x: CX - anchoBase * Math.cos(anguloPerp),
    y: CY - anchoBase * Math.sin(anguloPerp),
  };

  const pInicio = punto(R_EXT + 16, ANGULO_INICIO);
  const pFin = punto(R_EXT + 16, ANGULO_INICIO + BARRIDO);
  const pValor = punto(R_EXT + 16, anguloAguja);
  const anclaValor =
    anguloAguja < 265 ? "end" : anguloAguja > 275 ? "start" : "middle";

  const restante = meta - logrado;

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <svg viewBox="0 0 240 175" className="w-full max-w-[230px]">
        {meta > 0 ? (
          <>
            {ZONAS.map((z) => (
              <path
                key={z.color}
                d={rutaZona(z.desde, z.hasta)}
                fill={z.color}
                stroke="white"
                strokeWidth={2.5}
              />
            ))}
            <text
              x={pInicio.x}
              y={pInicio.y + 16}
              fontSize="12"
              fill="#71717a"
              textAnchor="middle"
            >
              0
            </text>
            <text
              x={pFin.x}
              y={pFin.y + 16}
              fontSize="12"
              fill="#3730a3"
              fontWeight={600}
              textAnchor="middle"
            >
              Objetivo: {formato(meta)}
            </text>
            <text
              x={pValor.x}
              y={pValor.y - 6}
              fontSize="13"
              fontWeight={700}
              fill="#3f3f46"
              textAnchor={anclaValor}
            >
              {formato(logrado)}
            </text>
            <polygon
              points={`${base1.x},${base1.y} ${puntaAguja.x},${puntaAguja.y} ${base2.x},${base2.y}`}
              fill="#3f3f46"
            />
            <circle cx={CX} cy={CY} r={9} fill="#3f3f46" />
          </>
        ) : (
          <>
            <path d={rutaZona(0, 1)} fill="#f4f4f5" stroke="white" strokeWidth={2.5} />
            <text
              x={CX}
              y={CY - 10}
              fontSize="13"
              fill="#a1a1aa"
              textAnchor="middle"
            >
              Sin meta definida
            </text>
          </>
        )}
      </svg>
      <p className="-mt-2 text-xs text-zinc-500">
        {meta > 0
          ? restante > 0
            ? `Restante : ${formato(restante)}`
            : "Meta alcanzada"
          : `Logrado: ${formato(logrado)}`}
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {titulo}
      </p>
    </div>
  );
}
