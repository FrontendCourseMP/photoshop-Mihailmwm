import { useState } from "react";

export default function TopMenu({
  setTool,
  onOpen,
  onSavePNG,
  onSaveGB7,
}) {
  const [open, setOpen] = useState(null);

  const toggleMenu = (name) => {
    setOpen(open === name ? null : name);
  };

  // ===== ЗАКРЫТЬ МЕНЮ ПОСЛЕ ДЕЙСТВИЯ =====
  const handleAction = (callback) => {
    callback();
    setOpen(null);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "#1e1e1e",
        color: "white",
        padding: "8px 12px",
        borderBottom: "1px solid #333",
        userSelect: "none",
      }}
    >
      {/* ===== FILE ===== */}
      <div style={{ position: "relative", marginRight: 20 }}>
        <button onClick={() => toggleMenu("file")}>
          Файл
        </button>

        {open === "file" && (
          <div style={menuStyle}>
            {/* OPEN */}
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

            {/* SAVE PNG */}
            <button
              style={itemStyle}
              onClick={() =>
                handleAction(onSavePNG)
              }
            >
              Сохранить PNG
            </button>

            {/* SAVE GB7 */}
            <button
              style={itemStyle}
              onClick={() =>
                handleAction(onSaveGB7)
              }
            >
              Сохранить GB7
            </button>
          </div>
        )}
      </div>

      {/* ===== TOOLS ===== */}
      <div style={{ position: "relative" }}>
        <button onClick={() => toggleMenu("tools")}>
          Инструменты
        </button>

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
          </div>
        )}
      </div>
    </div>
  );
}

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