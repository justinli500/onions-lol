const UP = "#2f7e48";
const DOWN = "#c0271f";

/** Tiny trend sparkline. Green when up over the window, red when down. */
export function Sparkline({ data, up, width = 120, height = 36, fluid = false, className }: {
  data: number[];
  up: boolean;
  width?: number;
  height?: number;
  fluid?: boolean;
  className?: string;
}) {
  if (data.length < 2) return <svg width={width} height={height} className={className} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 3;
  const stroke = up ? UP : DOWN;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const fillPts = `${pad},${height} ${pts.join(" ")} ${width - pad},${height}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={fluid ? "100%" : width}
      height={height}
      className={className}
      aria-hidden
    >
      {fluid && (
        <polygon points={fillPts} fill={stroke} fillOpacity={0.08} stroke="none" />
      )}
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={fluid ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
