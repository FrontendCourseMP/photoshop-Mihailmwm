export default function EyedropperInfo({ pixel }) {
  const style = {
    padding: "6px 12px",
    fontFamily: "monospace",
    display: "flex",
    gap: 16,
    alignItems: "center",
    whiteSpace: "nowrap",
    borderTop: "1px solid #333",
    // background: "#111",
    color: "#ddd",
    fontSize: 12,
    minHeight: 32, //  фиксируем высоту, чтобы не прыгало
  };

  if (!pixel) {
    return (
      <div style={style}>
        <span>No pixel selected</span>
      </div>
    );
  }

  const { x, y, r, g, b, lab } = pixel;

  return (
    <div style={style}>
      <span>XY: {x}, {y}</span>

      <span>RGB: {r}, {g}, {b}</span>

      <span>
        LAB: L {lab?.L?.toFixed(1)} a {lab?.a?.toFixed(1)} b {lab?.b?.toFixed(1)}
      </span>
    </div>
  );
}