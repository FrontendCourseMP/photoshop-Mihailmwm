import { useMemo, useState } from "react";
import {
  calculateHistogram as buildHistogram,
  createDefaultLevels,
} from "../utils/levels.js";

const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));

const midFromGamma = (black, white, gamma) => {
  // We assume mid marker corresponds to output 0.5 after gamma curve:
  // 0.5 = normalizedMid^(1/gamma) => normalizedMid = 0.5^gamma
  const range = white - black || 1;
  const normalizedMid = Math.pow(0.5, gamma);
  return black + normalizedMid * range;
};

const gammaFromMid = (black, white, midValue) => {
  const range = white - black || 1;
  const normalizedMid = (midValue - black) / range;

  // Avoid log(0)
  const safe = Math.min(0.999999, Math.max(0.000001, normalizedMid));
  // gamma = log(normalizedMid)/log(0.5)
  const gamma = Math.log(safe) / Math.log(0.5);
  return gamma;
};

export default function LevelsDialog({
  open,
  onCancel,
  onApply,
  imageData,
  levels,
  setLevels,
  previewEnabled,
  setPreviewEnabled,
  hasAlpha = false,
}) {
  const [channel, setChannel] = useState("master");
  const [logarithmic, setLogarithmic] = useState(false);
  const allowAlpha = !!hasAlpha;

  const effectiveChannel = allowAlpha
    ? channel
    : channel === "a"
      ? "master"
      : channel;

  const histogram = useMemo(() => {
    if (!imageData) return [];
    return buildHistogram(imageData, effectiveChannel, logarithmic);
  }, [imageData, effectiveChannel, logarithmic]);

  if (!open || !imageData) return null;

  const current =
    effectiveChannel === "master" ? levels.master : levels[effectiveChannel];

  const black = current.black;
  const white = current.white;

  // Enforce strict constraint required by lab:
  // black < mid < white => white - black >= 2
  const safeWhite = Math.max(black + 2, white);
  const safeBlack = Math.min(white - 2, black);

  const midMin = safeBlack + 1;
  const midMax = safeWhite - 1;

  const midValueRaw = midFromGamma(safeBlack, safeWhite, current.gamma);
  const midValue = clampInt(midValueRaw, midMin, midMax);

  const effectiveGamma = gammaFromMid(safeBlack, safeWhite, midValue);

  const setDraftForChannel = (patch) => {
    if (effectiveChannel === "master") {
      setLevels((prev) => ({
        ...prev,
        master: {
          ...prev.master,
          ...patch,
        },
      }));
      return;
    }

    setLevels((prev) => ({
      ...prev,
      [effectiveChannel]: {
        ...prev[effectiveChannel],
        ...patch,
      },
    }));
  };

  const updateBlack = (newBlack) => {
    const nb = clampInt(newBlack, 0, safeWhite - 2);
    const nm = clampInt(midValue, nb + 1, safeWhite - 1);
    const ngamma = gammaFromMid(nb, safeWhite, nm);

    setDraftForChannel({
      black: nb,
      gamma: ngamma,
    });
  };

  const updateWhite = (newWhite) => {
    const nw = clampInt(newWhite, safeBlack + 2, 255);
    const nm = clampInt(midValue, safeBlack + 1, nw - 1);
    const ngamma = gammaFromMid(safeBlack, nw, nm);

    setDraftForChannel({
      white: nw,
      gamma: ngamma,
    });
  };

  const updateMid = (newMid) => {
    const nm = clampInt(newMid, safeBlack + 1, safeWhite - 1);
    const ngamma = gammaFromMid(safeBlack, safeWhite, nm);

    setDraftForChannel({
      gamma: ngamma,
    });
  };

  const resetLevels = () => {
    setLevels(createDefaultLevels());
  };

  const max = Math.max(...histogram, 1);

  const blackSliderMax = Math.max(0, safeWhite - 2);
  const whiteSliderMin = Math.min(255, safeBlack + 2);

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
      aria-label="Диалог уровней"
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 12px 8px",
            borderBottom: "1px solid #333",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: "bold" }}>Уровни</div>

          <button
            onClick={onCancel}
            style={iconButtonStyle}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        <div
            style={{
              padding: 10,
              overflow: "hidden",
              minHeight: 0,
              flex: 1,
            }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            Предпросмотр в реальном времени
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
              // flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ marginBottom: 5 }}>Канал</div>

              <select
                value={effectiveChannel}
                onChange={(e) => setChannel(e.target.value)}
                style={selectStyle}
              >
                <option value="master">Общий</option>
                <option value="r">Красный</option>
                <option value="g">Зелёный</option>
                <option value="b">Синий</option>
                {allowAlpha && <option value="a">Альфа</option>}
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
              Логарифмическая гистограмма
            </label>
          </div>

          {/* Histogram */}
          <div
            style={{
              height: 140,
              background: "#111",
              border: "1px solid #444",
              display: "flex",
              alignItems: "flex-end",
              overflow: "hidden",
              padding: "8px 4px",
              marginBottom: 8,
            }}
          >
            {histogram.map((v, i) => (
              <div
                key={i}
                style={{
                  width: 2,
                  height: `${(v / max) * 100}%`,
                  background:
                    effectiveChannel === "r"
                      ? "#ff5555"
                      : effectiveChannel === "g"
                        ? "#55ff55"
                        : effectiveChannel === "b"
                          ? "#5599ff"
                          : effectiveChannel === "a"
                            ? "#cccccc"
                            : "#ffffff",
                }}
              />
            ))}
          </div>

          {/* Markers axis + 3 visible sliders */}
            <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 8, color: "#ddd", fontSize: 12 }}>
              Входные уровни (0..255): чёрный / гамма (mid) / белый
            </div>

            <div style={{ position: "relative", height: 56, background: "transparent" }}>
              {/* Axis */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 28,
                  height: 2,
                  background: "#444",
                }}
              />

              {/* Tick labels */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 40,
                  fontSize: 11,
                  color: "#888",
                }}
              >
                0
              </div>
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 40,
                  fontSize: 11,
                  color: "#888",
                }}
              >
                255
              </div>

              {/* Marker dots */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: `calc(${(safeBlack / 255) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#000",
                  border: "1px solid #fff",
                  borderRadius: 2,
                }}
                title={`Чёрный: ${safeBlack}`}
              />
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: `calc(${(midValue / 255) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#888",
                  border: "1px solid #fff",
                  borderRadius: 2,
                }}
                title={`Гамма: ${effectiveGamma.toFixed(2)} (mid: ${midValue})`}
              />
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: `calc(${(safeWhite / 255) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#fff",
                  border: "1px solid #000",
                  borderRadius: 2,
                }}
                title={`Белый: ${safeWhite}`}
              />
            </div>

            {/* Visible sliders (3) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 78, color: "#ddd", fontSize: 12 }}>Чёрный</div>
                <input
                  type="range"
                  min={0}
                  max={blackSliderMax}
                  value={safeBlack}
                  step={1}
                  onChange={(e) => updateBlack(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 56, color: "#ddd", fontSize: 12 }}>{safeBlack}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 78, color: "#ddd", fontSize: 12 }}>Полутона</div>
                <input
                  type="range"
                  min={midMin}
                  max={midMax}
                  value={midValue}
                  step={1}
                  onChange={(e) => updateMid(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 56, color: "#ddd", fontSize: 12 }}>{midValue}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 78, color: "#ddd", fontSize: 12 }}>Белый</div>
                <input
                  type="range"
                  min={whiteSliderMin}
                  max={255}
                  value={safeWhite}
                  step={1}
                  onChange={(e) => updateWhite(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 56, color: "#ddd", fontSize: 12 }}>{safeWhite}</div>
              </div>

              <div style={{ color: "#ddd", fontSize: 12, marginTop: 2 }}>
                Гамма: {effectiveGamma.toFixed(2)}
              </div>
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
              Сброс
            </button>

            <button onClick={onCancel} style={buttonStyle}>
              Отмена
            </button>

            <button onClick={onApply} style={buttonStyle}>
              Применить
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
  padding: "6px 10px",
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
