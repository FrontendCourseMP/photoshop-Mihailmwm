export default function ChannelsPanel({ channels, setChannels }) {
  const toggle = (key) => {
    setChannels((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div style={{ marginBottom: 15 }}>
      <h3>Channels</h3>

      {["r", "g", "b", "a"].map((c) => (
        <label
          key={c}
          style={{
            display: "flex",
            gap: 8,
            cursor: "pointer",
            marginBottom: 5,
          }}
        >
          <input
            type="checkbox"
            checked={channels[c]}
            onChange={() => toggle(c)}
          />
          {c.toUpperCase()}
        </label>
      ))}
    </div>
  );
}