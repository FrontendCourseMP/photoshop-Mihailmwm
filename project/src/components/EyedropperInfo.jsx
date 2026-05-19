const scaleOptions = [12, 25, 50, 75, 100, 125, 150, 200, 300];

export default function EyedropperInfo({
  pixel,
  info,
  scalePercent,
  onScaleChange,
}) {
  const style = {
    padding: "6px 12px",
    fontFamily: "monospace",
    display: "flex",
    gap: 16,
    alignItems: "center",
    whiteSpace: "nowrap",
    borderTop: "1px solid #333",
    color: "#ddd",
    fontSize: 12,
    minHeight: 32,
    flexWrap: "wrap",
  };

  const sizeText =
    info?.width && info?.height ? `${info.width} × ${info.height}` : null;

  const controlStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  const selectStyle = {
    background: "#1e1e1e",
    color: "white",
    border: "1px solid #555",
    padding: "4px 6px",
  };

  if (!pixel) {
    return (
      <div style={style}>
        {sizeText && <span>Изображение: {sizeText}</span>}

        {typeof scalePercent === "number" && (
          <label style={controlStyle}>
            Масштаб
            <select
              value={scalePercent}
              onChange={(e) => onScaleChange?.(Number(e.target.value))}
              style={selectStyle}
            >
              {scaleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}%
                </option>
              ))}
            </select>
          </label>
        )}

        <span>Пиксель не выбран</span>
      </div>
    );
  }

  const { x, y, r, g, b, lab } = pixel;

  return (
    <div style={style}>
      {sizeText && <span>Изображение: {sizeText}</span>}

      {typeof scalePercent === "number" && (
        <label style={controlStyle}>
          Масштаб
          <select
            value={scalePercent}
            onChange={(e) => onScaleChange?.(Number(e.target.value))}
            style={selectStyle}
          >
            {scaleOptions.map((option) => (
              <option key={option} value={option}>
                {option}%
              </option>
            ))}
          </select>
        </label>
      )}

      <span>
        XY: {x}, {y}
      </span>

      <span>
        RGB: {r}, {g}, {b}
      </span>

      <span>
        LAB: L {lab?.L?.toFixed(1)} a {lab?.a?.toFixed(1)} b {lab?.b?.toFixed(1)}
      </span>
    </div>
  );
}
