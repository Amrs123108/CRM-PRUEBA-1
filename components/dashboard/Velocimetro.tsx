const RADIO = 80;
const CX = 100;
const CY = 100;
const LARGO = Math.PI * RADIO;
const RUTA = `M ${CX - RADIO} ${CY} A ${RADIO} ${RADIO} 0 0 1 ${CX + RADIO} ${CY}`;

export default function Velocimetro({
  titulo,
  logrado,
  meta,
  formato,
  color = "#7c3aed",
}: {
  titulo: string;
  logrado: number;
  meta: number;
  formato: (n: number) => string;
  color?: string;
}) {
  const pct = meta > 0 ? Math.min(logrado / meta, 1) : 0;
  const offset = LARGO * (1 - pct);

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="relative w-full max-w-[220px]">
        <svg viewBox="0 0 200 110" className="w-full">
          <path
            d={RUTA}
            fill="none"
            stroke="#f4f4f5"
            strokeWidth={16}
            strokeLinecap="round"
          />
          <path
            d={RUTA}
            fill="none"
            stroke={color}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={`${LARGO} ${LARGO}`}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <p className="text-2xl font-bold tabular-nums text-zinc-900">
            {meta > 0 ? `${Math.round(pct * 100)}%` : "—"}
          </p>
        </div>
      </div>
      <p className="-mt-1 text-xs text-zinc-500">
        {formato(logrado)}
        {meta > 0 ? ` de ${formato(meta)}` : " · sin meta definida"}
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {titulo}
      </p>
    </div>
  );
}
