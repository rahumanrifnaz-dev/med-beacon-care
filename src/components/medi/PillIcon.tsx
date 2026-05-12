export function PillIcon({ color = "#a78bfa", shape = "round", size = 44 }: { color?: string; shape?: string; size?: number }) {
  const s = size;
  if (shape === "capsule") {
    return (
      <div style={{ width: s, height: s * 0.55 }} className="relative flex rounded-full overflow-hidden shadow-glow ring-2 ring-white/20">
        <div className="w-1/2 h-full" style={{ background: color }} />
        <div className="w-1/2 h-full" style={{ background: "#ffffff" }} />
      </div>
    );
  }
  if (shape === "oval") {
    return (
      <div
        style={{ width: s, height: s * 0.7, background: color, boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15)" }}
        className="rounded-full shadow-glow ring-2 ring-white/20"
      />
    );
  }
  return (
    <div
      style={{ width: s, height: s, background: color, boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.15)" }}
      className="rounded-full shadow-glow ring-2 ring-white/20"
    />
  );
}
