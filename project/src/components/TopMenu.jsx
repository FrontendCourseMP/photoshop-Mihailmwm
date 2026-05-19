import { useState } from "react";

export default function TopMenu({
  setTool,
  onOpen,
  onSavePNG,
  onSaveGB7,
  onOpenLevels, //  ДОБАВИЛИ
}) {
  const [open, setOpen] = useState(null);

  const toggleMenu = (name) => {
    setOpen(open === name ? null : name);
  };

  const handleAction = (callback) => {
    callback();
    setOpen(null);
  };

  return (
    <div style={styles.bar}>
      {/* FILE */}
      <div style={{ position: "relative", marginRight: 20 }}>
        <button onClick={() => toggleMenu("file")}>Файл</button>

        {open === "file" && (
          <div style={menuStyle}>
            <label style={itemStyle}>
              Открыть
              <input
                type="file"
                hidden
                onChange={(e) => {
                  onOpen(e.target.files[0]);
                  setOpen(null);
                }}
              />
            </label>

            <button style={itemStyle} onClick={() => handleAction(onSavePNG)}>
              Сохранить PNG
            </button>

            <button style={itemStyle} onClick={() => handleAction(onSaveGB7)}>
              Сохранить GB7
            </button>
          </div>
        )}
      </div>

      {/* TOOLS */}
      <div style={{ position: "relative" }}>
        <button onClick={() => toggleMenu("tools")}>Инструменты</button>

        {open === "tools" && (
          <div style={menuStyle}>
            <button
              style={itemStyle}
              onClick={() => {
                setTool("move");
                setOpen(null);
              }}
            >
              Move
            </button>

            <button
              style={itemStyle}
              onClick={() => {
                setTool("eyedropper");
                setOpen(null);
              }}
            >
              Пипетка
            </button>

            {/*  FIX */}
<button
  style={itemStyle}
  onClick={() => {
    onOpenLevels();
    setOpen(null);
  }}
>
  Levels
</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  bar: {
    display: "flex",
    alignItems: "center",
    background: "#1e1e1e",
    color: "white",
    padding: "8px 12px",
    borderBottom: "1px solid #333",
    userSelect: "none",
  },
};

const menuStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  background: "#2b2b2b",
  border: "1px solid #444",
  minWidth: 180,
  zIndex: 999,
  display: "flex",
  flexDirection: "column",
};

const itemStyle = {
  background: "none",
  border: "none",
  color: "white",
  textAlign: "left",
  padding: "10px",
  cursor: "pointer",
};