import { applyChannels } from "../utils/color";

// ===== ОТДЕЛЬНЫЙ КОМПОНЕНТ ВНЕ RENDER =====
function ChannelItem({ label, active, mask, imageData, onToggle }) {
  const preview = imageData ? applyChannels(imageData, mask) : null;

return (
  <div
    onClick={() => onToggle(label)}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
      cursor: "pointer",
      border: active ? "2px solid #00aaff" : "1px solid #333",
      padding: 6,
      background: "#1e1e1e",
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

    <div style={{ color: "white", fontSize: 14 }}>
      {label.toUpperCase()}
    </div>
  </div>
);
}

export default function ChannelsPanel({ channels, setChannels, imageData }) {
  const toggle = (key) => {
    setChannels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div style={{ padding: 10 }}>
      <h3>Каналы</h3>

      <ChannelItem
        label="r"
        active={channels.r}
        imageData={imageData}
        mask={{ r: true, g: false, b: false, a: false }}
        onToggle={toggle}
      />

      <ChannelItem
        label="g"
        active={channels.g}
        imageData={imageData}
        mask={{ r: false, g: true, b: false, a: false }}
        onToggle={toggle}
      />

      <ChannelItem
        label="b"
        active={channels.b}
        imageData={imageData}
        mask={{ r: false, g: false, b: true, a: false }}
        onToggle={toggle}
      />

      <ChannelItem
        label="a"
        active={channels.a}
        imageData={imageData}
        mask={{ r: false, g: false, b: false, a: true }}
        onToggle={toggle}
      />
    </div>
  );
}