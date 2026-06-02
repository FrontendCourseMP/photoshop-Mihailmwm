import { useMemo, useState } from "react";
import {
  calculateHistogram as buildHistogram,
  createDefaultLevels,
} from "../utils/levels.js";

const clampInt = (v, min, max) => Math.max(min, Math.min(max, Math.round(v)));

const GAMMA_MIN = 0.1;
const GAMMA_MAX = 9.9;
const clampGamma = (g) => Math.max(GAMMA_MIN, Math.min(GAMMA_MAX, g));

const midFromGamma = (black, white, gamma) => {
  // Mid marker corresponds to output 0.5 after the gamma curve.
  const range = white - black || 1;
  const normalizedMid = Math.pow(0.5, gamma);
  return black + normalizedMid * range;
};

const gammaFromMid = (black, white, midValue) => {
  const range = white - black || 1;
  const normalizedMid = (midValue - black) / range;
  const safe = Math.min(0.999999, Math.max(0.000001, normalizedMid));
  return Math.log(safe) / Math.log(0.5);
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
  channelsMode = "rgba", // "rgba" | "gb7"
}) {
  const [channel, setChannel] = useState("master");
  const [logarithmic, setLogarithmic] = useState(false);

  const allowAlpha = !!hasAlpha;
  const effectiveChannel = allowAlpha
    ? channel
    : channel === "a"
      ? "master"
      : channel;

  const uiMax = channelsMode === "gb7" ? 127 : 255;

  // Levels settings are stored/processed in actual 0..255 space.
  const toActual = (vUi) => Math.round((vUi / uiMax) * 255);
  const fromActual = (vActual) => Math.round((vActual / 255) * uiMax);

  const histogram = useMemo(() => {
    if (!imageData) return [];
    return buildHistogram(imageData, effectiveChannel, logarithmic);
  }, [imageData, effectiveChannel, logarithmic]);

  if (!open || !imageData) return null;

  const current =
    effectiveChannel === "master" ? levels.master : levels[effectiveChannel];

  const blackActual = current.black;
  const whiteActual = current.white;

  // Enforce strict constraint: black < mid < white and (white - black) >= 2
  const safeWhiteActual = Math.max(blackActual + 2, whiteActual);
  const safeBlackActual = Math.min(whiteActual - 2, blackActual);

  const midMinActual = safeBlackActual + 1;
  const midMaxActual = safeWhiteActual - 1;

  const midActual = clampInt(
    midFromGamma(safeBlackActual, safeWhiteActual, current.gamma),
    midMinActual,
    midMaxActual
  );

  const effectiveGamma = clampGamma(
    gammaFromMid(safeBlackActual, safeWhiteActual, midActual)
  );

  let blackUi = clampInt(fromActual(safeBlackActual), 0, uiMax);
  let whiteUi = clampInt(fromActual(safeWhiteActual), 0, uiMax);

  // Post-fix UI constraints to avoid browser range thumb glitches caused by rounding.
  // Requirement: black < mid < white, and for stable gamma controls we need at least gap=2.
  if (whiteUi < blackUi + 2) {
    whiteUi = Math.min(uiMax, blackUi + 2);
  }

  const midUiMin = blackUi + 1;
  const midUiMax = whiteUi - 1;

  const midUi = clampInt(fromActual(midActual), midUiMin, midUiMax);

  const setDraftForChannel = (patchActual) => {
    const target = effectiveChannel === "master" ? "master" : effectiveChannel;
    setLevels((prev) => ({
      ...prev,
      [target]: {
        ...prev[target],
        ...patchActual,
      },
    }));
  };

  const updateBlack = (newBlackUi) => {
    const nbActual = toActual(newBlackUi);
    const nb = clampInt(nbActual, 0, safeWhiteActual - 2);

    const nm = clampInt(midActual, nb + 1, safeWhiteActual - 1);
    const ngamma = gammaFromMid(nb, safeWhiteActual, nm);

    setDraftForChannel({ black: nb, gamma: ngamma });
  };

  const updateWhite = (newWhiteUi) => {
    const nwActualCandidate = toActual(newWhiteUi);
    const nw = clampInt(nwActualCandidate, safeBlackActual + 2, 255);

    const nm = clampInt(midActual, safeBlackActual + 1, nw - 1);
    const ngamma = gammaFromMid(safeBlackActual, nw, nm);

    setDraftForChannel({ white: nw, gamma: ngamma });
  };

  const clampGammaToToneMidLimits = (g) => {
    // midActual must stay within [midMinActual..midMaxActual]
    const gForMidMin = gammaFromMid(
      safeBlackActual,
      safeWhiteActual,
      midMinActual
    );
    const gForMidMax = gammaFromMid(
      safeBlackActual,
      safeWhiteActual,
      midMaxActual
    );

    const gammaLow = Math.min(gForMidMin, gForMidMax);
    const gammaHigh = Math.max(gForMidMin, gForMidMax);

    const gClamped = clampGamma(g);
    return Math.max(gammaLow, Math.min(gammaHigh, gClamped));
  };

  const updateMid = (newMidUi) => {
    const nmActualCandidate = toActual(newMidUi);
    const nm = clampInt(nmActualCandidate, safeBlackActual + 1, safeWhiteActual - 1);

    const ngamma = gammaFromMid(safeBlackActual, safeWhiteActual, nm);
    setDraftForChannel({ gamma: clampGammaToToneMidLimits(ngamma) });
  };

  const resetLevels = () => setLevels(createDefaultLevels());

  const max = Math.max(...histogram, 1);

  // Constraints in UI domain (0..uiMax)
  const blackSliderMax = Math.max(0, whiteUi - 1);
  const whiteSliderMin = Math.min(uiMax, blackUi + 1);
  const midSliderMin = Math.max(0, blackUi + 1);
  const midSliderMax = Math.min(uiMax, whiteUi - 1);

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

          <button onClick={onCancel} style={iconButtonStyle} aria-label="Закрыть">
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
              flexWrap: "wrap",
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

          {/* Input Levels markers directly under histogram axis */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ marginBottom: 8, color: "#ddd", fontSize: 12 }}>
              Input Levels ({channelsMode === "gb7" ? "0..127" : "0..255"}): чёрный / гамма (mid) / белый
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
                {uiMax}
              </div>

              {/* Marker dots */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: `calc(${(blackUi / uiMax) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#000",
                  border: "1px solid #fff",
                  borderRadius: 2,
                }}
                title={`Чёрный: ${blackUi}`}
              />
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: `calc(${(midUi / uiMax) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#888",
                  border: "1px solid #fff",
                  borderRadius: 2,
                }}
                title={`Гамма: ${effectiveGamma.toFixed(2)} (mid: ${midUi})`}
              />
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: `calc(${(whiteUi / uiMax) * 100}% - 6px)`,
                  width: 12,
                  height: 12,
                  background: "#fff",
                  border: "1px solid #000",
                  borderRadius: 2,
                }}
                title={`Белый: ${whiteUi}`}
              />
            </div>

            {/* Visible sliders (3) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 78, color: "#ddd", fontSize: 12 }}>Черная точка</div>
                <input
                  type="range"
                  min={0}
                  max={blackSliderMax}
                  value={clampInt(blackUi, 0, blackSliderMax)}
                  step={1}
                  onChange={(e) => updateBlack(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 56, color: "#ddd", fontSize: 12 }}>{blackUi}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 78, color: "#ddd", fontSize: 12 }}>Полутона</div>
                <input
                  type="range"
                  min={midSliderMin}
                  max={midSliderMax}
                  value={midUi}
                  step={1}
                  onChange={(e) => updateMid(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 56, color: "#ddd", fontSize: 12 }}>{midUi}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 78, color: "#ddd", fontSize: 12 }}>Белый</div>
                <input
                  type="range"
                  min={whiteSliderMin}
                  max={uiMax}
                  value={whiteUi}
                  step={1}
                  onChange={(e) => updateWhite(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <div style={{ width: 56, color: "#ddd", fontSize: 12 }}>{whiteUi}</div>
              </div>

              <div style={{ color: "#ddd", fontSize: 12, marginTop: 2 }}>
                Гамма: {effectiveGamma.toFixed(2)} (0.1..9.9, где 1.0 — линейное отображение)
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
