import { edgeModes, kernelPresets } from "../utils/kernels";
import { useMemo } from "react";

const clampNumber = (v, min, max) => Math.max(min, Math.min(max, v));

function parseKernelValue(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return clampNumber(n, -999, 999);
}

export default function KernelDialog({
  open,
  onCancel,
  onReset,
  onApply,
  kernelDraft,
  setKernelDraft,
  previewEnabled,
  setPreviewEnabled,
  isProcessing = false,
  progress = 0,
}) {
  const presetsList = useMemo(() => Object.entries(kernelPresets), []);

  const kernel9 = kernelDraft?.kernel9 ?? kernelPresets.identity.kernel;
  const edgeMode = kernelDraft?.edgeMode ?? "copy";
  const channelsMask =
    kernelDraft?.channelsMask ?? { r: true, g: true, b: true, a: false };

  const handlePresetChange = (presetKey) => {
    const preset = kernelPresets[presetKey];
    if (!preset) return;

    setKernelDraft((prev) => ({
      ...prev,
      presetKey,
      kernel9: [...preset.kernel],
    }));
  };

  const handleKernelInput = (idx, raw) => {
    const v = parseKernelValue(raw);
    setKernelDraft((prev) => {
      const nextKernel = [...(prev.kernel9 ?? kernelPresets.identity.kernel)];
      nextKernel[idx] = v;
      return { ...prev, kernel9: nextKernel };
    });
  };

  const toggleChannel = (ch) => {
    setKernelDraft((prev) => ({
      ...prev,
      channelsMask: {
        ...prev.channelsMask,
        [ch]: !prev.channelsMask[ch],
      },
    }));
  };

  const allSelected = !!(
    channelsMask.r && channelsMask.g && channelsMask.b && channelsMask.a
  );

  const toggleAllChannels = () => {
    setKernelDraft((prev) => ({
      ...prev,
      channelsMask: {
        r: !allSelected,
        g: !allSelected,
        b: !allSelected,
        a: !allSelected,
      },
    }));
  };

  if (!open) return null;

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
      aria-label="Диалог фильтрации по ядрам"
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={topBarStyle}>
          <div style={topTitleStyle}>Фильтры (Kernels)</div>

          <button
            onClick={onCancel}
            style={iconButtonStyle}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: 8,
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label style={previewLabelStyle}>
            <input
              type="checkbox"
              checked={previewEnabled}
              disabled={isProcessing}
              onChange={(e) => setPreviewEnabled(e.target.checked)}
            />
            Предпросмотр коррекции
          </label>

          {isProcessing && (
            <div style={{ color: "#ddd", fontSize: 13 }}>
              Выполняется… {Math.round(progress * 100)}%
            </div>
          )}

          {/* Presets & Edge handling - stacked for 360px */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={fieldStyle}>
              Предустановки ядра
              <select
                value={kernelDraft.presetKey ?? "identity"}
                disabled={isProcessing}
                onChange={(e) => handlePresetChange(e.target.value)}
                style={selectStyle}
              >
                {presetsList.map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              Обработка края (edge handling)
              <select
                value={edgeMode}
                disabled={isProcessing}
                onChange={(e) =>
                  setKernelDraft((prev) => ({
                    ...prev,
                    edgeMode: e.target.value,
                  }))
                }
                style={selectStyle}
              >
                <option value="black">{edgeModes.black}</option>
                <option value="white">{edgeModes.white}</option>
                <option value="copy">{edgeModes.copy}</option>
              </select>
            </label>
          </div>

          {/* Channels + Kernel input - stacked */}
          <div
            style={{
              border: "1px solid #444",
            background: "#151515",
            padding: 10,
            borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ color: "#ddd", fontSize: 13 }}>
              Каналы для применения
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={isProcessing}
                  onChange={toggleAllChannels}
                />
                Все каналы
              </label>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { key: "r", label: "R (красный)" },
                { key: "g", label: "G (зелёный)" },
                { key: "b", label: "B (синий)" },
                { key: "a", label: "A (альфа)" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                  <input
                    type="checkbox"
                    checked={!!channelsMask[key]}
                    disabled={isProcessing}
                    onChange={() => toggleChannel(key)}
                  />
                  {label}
                </label>
              ))}
            </div>

            <div style={{ color: "#999", fontSize: 12 }}>
              Ядро применяется к выбранным каналам (остальные копируются без
              изменений).
            </div>
          </div>

          <div
            style={{
              border: "1px solid #444",
            background: "#151515",
            padding: 10,
            borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ color: "#ddd", fontSize: 13, marginBottom: 2 }}>
              Ядро 3×3 (ввод)
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {kernel9.map((v, idx) => (
                <input
                  key={idx}
                  type="number"
                  step={0.1}
                  disabled={isProcessing}
                  value={String(v)}
                  onChange={(e) => handleKernelInput(idx, e.target.value)}
                  style={kernelInputStyle}
                  aria-label={`Kernel ${idx}`}
                />
              ))}
            </div>

            <div style={{ color: "#999", fontSize: 12 }}>
              Значения используются как веса свёртки. Дробные значения
              поддерживаются.
            </div>
          </div>

          {/* Footer buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 4,
            }}
          >
            <button
              onClick={onReset}
              style={buttonStyle}
              disabled={isProcessing}
            >
              Сброс
            </button>

            <button onClick={onCancel} style={buttonStyle} disabled={isProcessing}>
              Отмена
            </button>

            <button onClick={onApply} style={buttonStyle} disabled={isProcessing}>
              Применить
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "10px 12px",
  borderBottom: "1px solid #333",
  flexShrink: 0,
};

const topTitleStyle = {
  fontSize: 16,
  fontWeight: "bold",
};

const iconButtonStyle = {
  background: "#3a3a3a",
  color: "white",
  border: "1px solid #555",
  width: 30,
  height: 30,
  padding: 0,
  borderRadius: 4,
  fontSize: 18,
  lineHeight: "26px",
  cursor: "pointer",
};

const buttonStyle = {
  background: "#3a3a3a",
  color: "white",
  border: "1px solid #555",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 13,
};

const selectStyle = {
  background: "#1e1e1e",
  color: "white",
  border: "1px solid #555",
  padding: 6,
  width: "100%",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  color: "#ddd",
  fontSize: 13,
};

const previewLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  userSelect: "none",
  color: "#ddd",
  fontSize: 13,
};

  const kernelInputStyle = {
    background: "#1e1e1e",
    color: "white",
    border: "1px solid #555",
    padding: "4px 6px",
    width: "100%",
    textAlign: "center",
    fontSize: 12,
  };
