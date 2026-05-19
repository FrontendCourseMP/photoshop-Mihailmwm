import { useMemo, useState } from "react";
import {
  MAX_SCALE_PERCENT,
  MIN_SCALE_PERCENT,
  interpolationMethods,
} from "../utils/scale.js";

// ====== VALIDATION HELPERS ======
function clampInt(value, min, max) {
  const v = Math.round(Number(value));
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function formatPixels(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} MP`;
  return `${(value / 1_000).toFixed(1)} KP`;
}

function computeTargetFromPercent({
  sourceWidth,
  sourceHeight,
  keepProportions,
  widthPercent,
  heightPercent,
}) {
  const wPercent = clampInt(widthPercent, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT);

  if (keepProportions) {
    const targetWidth = Math.max(1, Math.round((sourceWidth * wPercent) / 100));
    const targetHeight = Math.max(1, Math.round((sourceHeight * wPercent) / 100));
    return { targetWidth, targetHeight };
  }

  const hPercent = clampInt(heightPercent, MIN_SCALE_PERCENT, MAX_SCALE_PERCENT);

  const targetWidth = Math.max(1, Math.round((sourceWidth * wPercent) / 100));
  const targetHeight = Math.max(1, Math.round((sourceHeight * hPercent) / 100));

  return { targetWidth, targetHeight };
}

function computeTargetFromPixels({
  sourceWidth,
  sourceHeight,
  keepProportions,
  widthPx,
  heightPx,
}) {
  const MAX_SIDE = 20000;

  const w = clampInt(widthPx, 1, MAX_SIDE);
  const sW = Math.max(1, sourceWidth);
  const sH = Math.max(1, sourceHeight);

  if (keepProportions) {
    let targetWidth = w;
    let targetHeight = Math.max(1, Math.round((w * sH) / sW));

    // Hard clamp both sides; keep proportions by re-scaling with a ratio.
    if (targetWidth > MAX_SIDE || targetHeight > MAX_SIDE) {
      const ratio = Math.min(MAX_SIDE / targetWidth, MAX_SIDE / targetHeight);
      targetWidth = Math.max(1, Math.round(targetWidth * ratio));
      targetHeight = Math.max(1, Math.round(targetHeight * ratio));
    }

    return { targetWidth, targetHeight };
  }

  const h = clampInt(heightPx, 1, MAX_SIDE);
  return { targetWidth: w, targetHeight: h };
}

// ====== DIALOG ======
export default function ScaleDialog({
  open,
  onCancel,
  onApply,
  sourceWidth,
  sourceHeight,
  initialUnit = "percent", // "percent" | "pixels"
  initialScalePercent = 100,
  initialInterpolation = "bilinear",
}) {
  const [unit, setUnit] = useState(initialUnit);
  const [keepProportions, setKeepProportions] = useState(true);
  const [interpolation, setInterpolation] = useState(initialInterpolation);

  // UI inputs: when unit=percent -> percent values; when unit=pixels -> pixel values.
  const [widthValue, setWidthValue] = useState(initialScalePercent);
  const [heightValue, setHeightValue] = useState(initialScalePercent);

  const safeSourceWidth = Math.max(1, Number(sourceWidth) || 1);
  const safeSourceHeight = Math.max(1, Number(sourceHeight) || 1);

  const target = useMemo(() => {
    if (unit === "percent") {
      return computeTargetFromPercent({
        sourceWidth: safeSourceWidth,
        sourceHeight: safeSourceHeight,
        keepProportions,
        widthPercent: widthValue,
        heightPercent: heightValue,
      });
    }

    return computeTargetFromPixels({
      sourceWidth: safeSourceWidth,
      sourceHeight: safeSourceHeight,
      keepProportions,
      widthPx: widthValue,
      heightPx: heightValue,
    });
  }, [
    unit,
    keepProportions,
    widthValue,
    heightValue,
    safeSourceWidth,
    safeSourceHeight,
  ]);

  const selectedMethod =
    interpolationMethods[interpolation] ??
    interpolationMethods.bilinear;

  const pixelsBefore = safeSourceWidth * safeSourceHeight;
  const pixelsAfter = Math.max(1, target.targetWidth * target.targetHeight);

  if (!open) return null;

  return (
    <dialog
      open
      style={{
        width: 520,
        maxWidth: "92vw",
        border: "none",
        padding: 0,
        background: "#1f1f1f",
        color: "white",
        borderRadius: 10,
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.55)",
      }}
      aria-label="Масштабирование изображения"
    >
      <div style={styles.dialogPad}>
        <div style={styles.header}>
          <div style={styles.title}>Масштабирование</div>
          <button
            onClick={onCancel}
            style={styles.closeBtn}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {/* pixels before/after */}
        <div style={styles.row}>
          <div style={styles.block}>
            <div style={styles.smallLabel}>Пикселей до</div>
            <div>{formatPixels(pixelsBefore)}</div>
          </div>

          <div style={styles.block}>
            <div style={styles.smallLabel}>Пикселей после</div>
            <div>{formatPixels(pixelsAfter)}</div>
          </div>
        </div>

        {/* mode + interpolation */}
        <div style={{ ...styles.row, marginTop: 16 }}>
          <label style={styles.field}>
            Единицы изменения
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={styles.select}
            >
              <option value="percent">Проценты (%)</option>
              <option value="pixels">Пиксели (px)</option>
            </select>
          </label>

          <label style={styles.field}>
            Интерполяция
            <select
              value={interpolation}
              onChange={(e) => setInterpolation(e.target.value)}
              style={styles.select}
              title={selectedMethod?.description}
            >
              {Object.entries(interpolationMethods).map(([key, method]) => (
                <option key={key} value={key}>
                  {method.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* width/height inputs */}
        <div style={{ marginTop: 14 }}>
          <div style={styles.row}>
            <label style={styles.field}>
              Ширина {unit === "percent" ? "(%)" : "(px)"}
              <input
                type="number"
                value={widthValue}
                min={unit === "percent" ? MIN_SCALE_PERCENT : 1}
                max={unit === "percent" ? MAX_SCALE_PERCENT : 20000}
                onChange={(e) => setWidthValue(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={{ ...styles.field, minWidth: 0 }}>
              Высота {unit === "percent" ? "(%)" : "(px)"}
              <input
                type="number"
                value={heightValue}
                min={unit === "percent" ? MIN_SCALE_PERCENT : 1}
                max={unit === "percent" ? MAX_SCALE_PERCENT : 20000}
                onChange={(e) => setHeightValue(e.target.value)}
                style={styles.input}
              />
            </label>
          </div>
        </div>

        {/* proportions checkbox */}
        <label style={styles.linkedRow}>
          <input
            type="checkbox"
            checked={keepProportions}
            onChange={(e) => setKeepProportions(e.target.checked)}
          />
          Сохранять пропорции
        </label>

        {/* tooltip text */}
        <div style={styles.tooltip}>
          <b>Алгоритм:</b> {selectedMethod?.label}. {selectedMethod?.description}
        </div>

        {/* actions */}
        <div style={styles.footer}>
          <button onClick={onCancel} style={styles.btn}>
            Отмена
          </button>

          <button
            onClick={() =>
              onApply({
                targetWidth: target.targetWidth,
                targetHeight: target.targetHeight,
                interpolation,
              })
            }
            style={styles.btn}
          >
            Применить
          </button>
        </div>
      </div>
    </dialog>
  );
}

const styles = {
  dialogPad: {
    padding: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeBtn: {
    background: "#3a3a3a",
    color: "white",
    border: "1px solid #555",
    width: 32,
    height: 32,
    padding: 0,
    borderRadius: 4,
    fontSize: 20,
    lineHeight: "28px",
    cursor: "pointer",
  },
  row: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  block: {
    minWidth: 200,
  },
  smallLabel: {
    fontSize: 12,
    color: "#bbb",
    marginBottom: 6,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
  },
  select: {
    background: "#1e1e1e",
    color: "white",
    border: "1px solid #555",
    padding: 6,
    minWidth: 220,
  },
  input: {
    background: "#1e1e1e",
    color: "white",
    border: "1px solid #555",
    padding: "6px 8px",
    width: 190,
  },
  linkedRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    userSelect: "none",
    fontSize: 14,
  },
  tooltip: {
    marginTop: 12,
    fontSize: 12,
    color: "#bbb",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  btn: {
    background: "#3a3a3a",
    color: "white",
    border: "1px solid #555",
    padding: "8px 14px",
    cursor: "pointer",
  },
};
