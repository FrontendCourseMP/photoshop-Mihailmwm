import { applyChannels } from "../utils/color";

// ===== ОТДЕЛЬНЫЙ КОМПОНЕНТ =====
function ChannelItem({ label, active, imageData, mask, onToggle, channelsMode }) {
  const preview = imageData ? applyChannels(imageData, mask, channelsMode) : null;

  return (
    <div
      onClick={() => onToggle()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
        cursor: "pointer",
        border: active ? "2px solid #00aaff" : "1px solid #333",
        padding: 6,
        background: "#1e1e1e",
        userSelect: "none",
      }}
    >
      {preview && (
        <canvas
          ref={(el) => {
            if (!el) return;
            const ctx = el.getContext("2d");
            el.width = preview.width;
            el.height = preview.height;
            ctx.putImageData(preview, 0, 0);
            el.style.width = "60px";
            el.style.height = "60px";
            el.style.imageRendering = "pixelated";
            el.style.border = "1px solid #555";
          }}
        />
      )}

      <div style={{ color: "white", fontSize: 14 }}>{label.toUpperCase()}</div>
    </div>
  );
}

export default function ChannelsPanel({
  channels,
  setChannels,
  imageData,
  hasAlpha,
  channelsMode = "rgba", // "rgba" | "gb7"
}) {
  const toggleGray = () => {
    setChannels((prev) => {
      const next = !(prev.r || prev.g || prev.b);
      return { ...prev, r: next, g: next, b: next };
    });
  };

  const toggleMask = () => {
    setChannels((prev) => ({ ...prev, a: !prev.a }));
  };

  const toggleChannelKey = (key) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // GB7: show 2 layers only (Gray + Mask)
  if (channelsMode === "gb7") {
    return (
      <div style={{ padding: 10 }}>
        <h3>Слои (GB7)</h3>

        <ChannelItem
          label="gray"
          active={channels.r || channels.g || channels.b}
          imageData={imageData}
          channelsMode={channelsMode}
          mask={{ r: true, g: true, b: true, a: false }}
          onToggle={toggleGray}
        />

        <ChannelItem
          label="mask"
          active={channels.a}
          imageData={imageData}
          channelsMode={channelsMode}
          mask={{ r: false, g: false, b: false, a: true }}
          onToggle={toggleMask}
        />
      </div>
    );
  }

  // RGBA: classic RGB + optional alpha
  return (
    <div style={{ padding: 10 }}>
      <h3>Каналы</h3>

      <ChannelItem
        label="r"
        active={channels.r}
        imageData={imageData}
        mask={{ r: true, g: false, b: false, a: false }}
        channelsMode={channelsMode}
        onToggle={() => toggleChannelKey("r")}
      />

      <ChannelItem
        label="g"
        active={channels.g}
        imageData={imageData}
        mask={{ r: false, g: true, b: false, a: false }}
        channelsMode={channelsMode}
        onToggle={() => toggleChannelKey("g")}
      />

      <ChannelItem
        label="b"
        active={channels.b}
        imageData={imageData}
        mask={{ r: false, g: false, b: true, a: false }}
        channelsMode={channelsMode}
        onToggle={() => toggleChannelKey("b")}
      />

      {hasAlpha && (
        <ChannelItem
          label="a"
          active={channels.a}
          imageData={imageData}
          mask={{ r: false, g: false, b: false, a: true }}
          channelsMode={channelsMode}
          onToggle={() => toggleChannelKey("a")}
        />
      )}
    </div>
  );
}
