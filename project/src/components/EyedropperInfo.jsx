export default function EyedropperInfo({ pixel }) {
  if (!pixel) {
    return (
      <div style={{ padding: 10 }}>
        No pixel selected
      </div>
    );
  }

  const { x, y, r, g, b, lab } = pixel;

  return (
    <div style={{
      padding: 10,
      border: "1px solid #ccc",
      marginTop: 10,
      fontFamily: "monospace"
    }}>
      <div><b>Coordinates:</b> ({x}, {y})</div>

      <div>
        <b>RGB:</b> {r}, {g}, {b}
      </div>

      <div>
        <b>LAB:</b>{" "}
        L: {lab?.L?.toFixed(2)},{" "}
        a: {lab?.a?.toFixed(2)},{" "}
        b: {lab?.b?.toFixed(2)}
      </div>
    </div>
  );
}