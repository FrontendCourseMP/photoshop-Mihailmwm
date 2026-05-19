import { useMemo, useState } from "react";
import {
  calculateHistogram as buildHistogram,
  clampLinkedRange,
  createDefaultLevels,
} from "../utils/levels.js";

export default function LevelsDialog({
  open,
  onCancel,
  onApply,
  imageData,
  levels,
  setLevels,
  previewEnabled,
  setPreviewEnabled,
}) {
  // Local histogram controls do not belong to the image model.
  const [channel, setChannel] = useState("master");
  const [logarithmic, setLogarithmic] = useState(false);


  // Histogram is based only on the source image and the selected channel.
  const histogram = useMemo(() => {
    if (!imageData) return [];

    return buildHistogram(imageData, channel, logarithmic);
  }, [imageData, channel, logarithmic]);

  if (!open || !imageData) return null;

  const current = channel === "master" ? levels.master : levels[channel];
  const max = Math.max(...histogram, 1);

  // Update the active curve in the draft state.
  const update = (key, value) => {
    if (channel === "master") {
      setLevels((prev) => ({
        ...prev,
        master: clampLinkedRange(prev.master, key, value),
      }));

      return;
    }

    setLevels((prev) => ({
      ...prev,
      [channel]: clampLinkedRange(prev[channel], key, value),
    }));
  };

  // Reset keeps the dialog open, but returns all curves to the default state.
  const resetLevels = () => {
    setLevels(createDefaultLevels());
  };

  return (
    <dialog
      open
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        margin: 0,
        border: "none",
        padding: 0,
        background: "#1f1f1f",
        color: "white",
        boxShadow: "none",
        zIndex: 1,
      }}
      aria-label="Levels dialog"
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {/* Header keeps the tool reachable without covering the canvas. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 14px 12px",
            borderBottom: "1px solid #333",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: "bold" }}>Levels</div>

          <button onClick={onCancel} style={iconButtonStyle} aria-label="Close Levels">
            ×
          </button>
        </div>

        <div
          style={{
            padding: 14,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {/* Preview switch mirrors the laboratory requirement exactly. */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            Live preview
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ marginBottom: 5 }}>Channel</div>

              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                style={selectStyle}
              >
                <option value="master">Master</option>
                <option value="r">Red</option>
                <option value="g">Green</option>
                <option value="b">Blue</option>
                <option value="a">Alpha</option>
              </select>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 22,
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={logarithmic}
                onChange={(e) => setLogarithmic(e.target.checked)}
              />
              Log histogram
            </label>
          </div>

          <div
            style={{
              height: 220,
              background: "#111",
              border: "1px solid #444",
              display: "flex",
              alignItems: "flex-end",
              overflow: "hidden",
              padding: "10px 5px",
              marginBottom: 18,
            }}
          >
            {histogram.map((v, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: `${(v / max) * 100}%`,
                  background:
                    channel === "r"
                      ? "#ff5555"
                      : channel === "g"
                        ? "#55ff55"
                        : channel === "b"
                          ? "#5599ff"
                          : channel === "a"
                            ? "#cccccc"
                            : "#ffffff",
                }}
              />
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabelStyle}>Black</div>

            <div style={controlRowStyle}>
              <input
                type="range"
                min={0}
                max={current.white - 1}
                value={current.black}
                onChange={(e) => update("black", Number(e.target.value))}
                style={{ flex: 1 }}
              />

              <input
                type="number"
                min={0}
                max={current.white - 1}
                value={current.black}
                onChange={(e) => update("black", Number(e.target.value))}
                style={numberInputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={fieldLabelStyle}>White</div>

            <div style={controlRowStyle}>
              <input
                type="range"
                min={current.black + 1}
                max={255}
                value={current.white}
                onChange={(e) => update("white", Number(e.target.value))}
                style={{ flex: 1 }}
              />

              <input
                type="number"
                min={current.black + 1}
                max={255}
                value={current.white}
                onChange={(e) => update("white", Number(e.target.value))}
                style={numberInputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={fieldLabelStyle}>
              Gamma: {current.gamma.toFixed(2)}
            </div>

            <div style={controlRowStyle}>
              <input
                type="range"
                min={0.1}
                max={9.9}
                step={0.1}
                value={current.gamma}
                onChange={(e) => update("gamma", Number(e.target.value))}
                style={{ flex: 1 }}
              />

              <input
                type="number"
                min={0.1}
                max={9.9}
                step={0.1}
                value={current.gamma}
                onChange={(e) => update("gamma", Number(e.target.value))}
                style={numberInputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button onClick={resetLevels} style={buttonStyle}>
              Reset
            </button>

            <button
              onClick={() => onCancel()}
              style={buttonStyle}
            >
              Cancel
            </button>

            <button
              onClick={() => onApply()}
              style={buttonStyle}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

const buttonStyle = {
  background: "#3a3a3a",
  color: "white",
  border: "1px solid #555",
  padding: "8px 14px",
  cursor: "pointer",
};

const iconButtonStyle = {
  ...buttonStyle,
  width: 32,
  height: 32,
  padding: 0,
  borderRadius: 4,
  fontSize: 20,
  lineHeight: "28px",
};

const selectStyle = {
  background: "#1e1e1e",
  color: "white",
  border: "1px solid #555",
  padding: 5,
};

const fieldLabelStyle = {
  marginBottom: 5,
};

const controlRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const numberInputStyle = {
  width: 72,
  background: "#1e1e1e",
  color: "white",
  border: "1px solid #555",
  padding: "6px 8px",
};
