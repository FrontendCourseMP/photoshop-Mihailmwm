import { useMemo, useState } from "react";
import { calculateHistogram as buildHistogram } from "../utils/levels.js";

export default function LevelsDialog({
  open,
  onClose,
  imageData,
  levels,
  setLevels,
}) {
  const [channel, setChannel] = useState("master");
  const [logarithmic, setLogarithmic] = useState(false);

  // ===== HISTOGRAM =====
  const histogram = useMemo(() => {
    if (!imageData) return [];

    return buildHistogram(
      imageData,
      channel,
      logarithmic
    );
  }, [imageData, channel, logarithmic]);

  // ===== SAFE RETURN =====
  if (!open || !imageData) return null;

  const current =
    channel === "master"
      ? levels.r
      : levels[channel];

  const max = Math.max(...histogram, 1);

  // ===== UPDATE LEVELS =====
  const update = (key, value) => {
    if (channel === "master") {
      setLevels((prev) => ({
        ...prev,

        r: {
          ...prev.r,
          [key]: value,
        },

        g: {
          ...prev.g,
          [key]: value,
        },

        b: {
          ...prev.b,
          [key]: value,
        },
      }));

      return;
    }

    setLevels((prev) => ({
      ...prev,

      [channel]: {
        ...prev[channel],
        [key]: value,
      },
    }));
  };

  // ===== RESET =====
  const resetLevels = () => {
    setLevels({
      r: {
        black: 0,
        white: 255,
        gamma: 1,
      },

      g: {
        black: 0,
        white: 255,
        gamma: 1,
      },

      b: {
        black: 0,
        white: 255,
        gamma: 1,
      },

      a: {
        black: 0,
        white: 255,
        gamma: 1,
      },
    });
  };

  return (
    <dialog
      open
      style={{
        width: 760,
        maxWidth: "90vw",

        background: "#2b2b2b",
        color: "white",

        border: "1px solid #555",
        borderRadius: 8,

        padding: 20,

        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",

        zIndex: 9999,
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        style={{
          fontSize: 22,
          marginBottom: 20,
          fontWeight: "bold",
        }}
      >
        Levels
      </div>

      {/* ===== CONTROLS ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* CHANNEL */}
        <div>
          <div style={{ marginBottom: 5 }}>
            Channel
          </div>

          <select
            value={channel}
            onChange={(e) =>
              setChannel(e.target.value)
            }
            style={{
              background: "#1e1e1e",
              color: "white",
              border: "1px solid #555",
              padding: 5,
            }}
          >
            <option value="master">
              Master
            </option>

            <option value="r">
              Red
            </option>

            <option value="g">
              Green
            </option>

            <option value="b">
              Blue
            </option>

            <option value="a">
              Alpha
            </option>
          </select>
        </div>

        {/* LOG */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 22,
          }}
        >
          <input
            type="checkbox"
            checked={logarithmic}
            onChange={(e) =>
              setLogarithmic(
                e.target.checked
              )
            }
          />

          Log histogram
        </label>
      </div>

      {/* ===== HISTOGRAM ===== */}
      <div
        style={{
          height: 220,

          background: "#111",

          border: "1px solid #444",

          display: "flex",
          alignItems: "flex-end",

          overflow: "hidden",

          padding: "10px 5px",

          marginBottom: 20,
        }}
      >
        {histogram.map((v, i) => (
          <div
            key={i}
            style={{
              width: 2,

              height: `${
                (v / max) * 100
              }%`,

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

      {/* ===== BLACK ===== */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            marginBottom: 5,
          }}
        >
          Black: {current.black}
        </div>

        <input
          type="range"
          min={0}
          max={254}
          value={current.black}
          onChange={(e) =>
            update(
              "black",
              Number(e.target.value)
            )
          }
          style={{ width: "100%" }}
        />
      </div>

      {/* ===== WHITE ===== */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            marginBottom: 5,
          }}
        >
          White: {current.white}
        </div>

        <input
          type="range"
          min={1}
          max={255}
          value={current.white}
          onChange={(e) =>
            update(
              "white",
              Number(e.target.value)
            )
          }
          style={{ width: "100%" }}
        />
      </div>

      {/* ===== GAMMA ===== */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            marginBottom: 5,
          }}
        >
          Gamma:{" "}
          {current.gamma.toFixed(2)}
        </div>

        <input
          type="range"
          min={0.1}
          max={9.9}
          step={0.1}
          value={current.gamma}
          onChange={(e) =>
            update(
              "gamma",
              Number(e.target.value)
            )
          }
          style={{ width: "100%" }}
        />
      </div>

      {/* ===== BUTTONS ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
        }}
      >
        <button
          onClick={resetLevels}
          style={buttonStyle}
        >
          Reset
        </button>

        <button
          onClick={onClose}
          style={buttonStyle}
        >
          Apply
        </button>
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