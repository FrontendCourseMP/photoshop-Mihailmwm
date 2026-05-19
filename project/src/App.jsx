import { useRef, useState, useMemo } from "react";

import TopMenu from "./components/TopMenu";
import CanvasView from "./components/CanvasView";
import ChannelsPanel from "./components/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo";
import LevelsDialog from "./components/LevelsDialog";

import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { applyChannels, rgbToLab } from "./utils/color";
import { applyLevels } from "./utils/levels";

export default function App() {
  const canvasRef = useRef(null);

  const [tool, setTool] = useState("move");

  const [levelsOpen, setLevelsOpen] = useState(false);

  const [originalImage, setOriginalImage] = useState(null);

  const [channels, setChannels] = useState({
    r: true,
    g: true,
    b: true,
    a: true,
  });

  const [info, setInfo] = useState({
    width: 0,
    height: 0,
    depth: 0,
  });

  const [pickedPixel, setPickedPixel] = useState(null);

  const defaultLevels = {
    master: { black: 0, white: 255, gamma: 1 },
    r: { black: 0, white: 255, gamma: 1 },
    g: { black: 0, white: 255, gamma: 1 },
    b: { black: 0, white: 255, gamma: 1 },
    a: { black: 0, white: 255, gamma: 1 },
  };

  const [levels, setLevels] = useState(defaultLevels);

  const hasImage = originalImage !== null;

  // ================= IMAGE PIPELINE =================
  const imageData = useMemo(() => {
    if (!originalImage) return null;

    const leveled = applyLevels(originalImage, levels);
    return applyChannels(leveled, channels);
  }, [originalImage, channels, levels]);

  // ================= UPLOAD =================
  const handleUpload = async (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    if (["png", "jpg", "jpeg"].includes(ext)) {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, img.width, img.height);

        setOriginalImage(data);
        setInfo({
          width: img.width,
          height: img.height,
          depth: 24,
        });
      };
    }

    if (ext === "gb7") {
      const buffer = await file.arrayBuffer();
      const result = decodeGB7(buffer);

      setOriginalImage(result.imageData);
      setInfo({
        width: result.width,
        height: result.height,
        depth: 7,
      });
    }
  };

  // ================= EXPORT =================
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const a = document.createElement("a");
    a.download = "image.png";
    a.href = canvas.toDataURL();
    a.click();
  };

  const handleDownloadGB7 = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = encodeGB7(canvas);

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "image.gb7";
    a.click();
  };

  // ================= EYEDROPPER =================
  const handleCanvasClick = (e) => {
    if (tool !== "eyedropper") return;
    if (!canvasRef.current || !hasImage) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    const ctx = canvas.getContext("2d");
    const p = ctx.getImageData(x, y, 1, 1).data;

    const rgb = { r: p[0], g: p[1], b: p[2] };
    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);

    setPickedPixel({ x, y, ...rgb, lab });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#1e1e1e",
        overflow: "hidden",
      }}
    >
      {/* TOP MENU */}
      <TopMenu
        setTool={setTool}
        onOpen={handleUpload}
        onSavePNG={handleDownloadPNG}
        onSaveGB7={handleDownloadGB7}
        onOpenLevels={() => setLevelsOpen(true)}
      />

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* CHANNELS */}
        {hasImage && (
          <div
            style={{
              width: 180,
              flexShrink: 0,
              overflow: "hidden",
              borderRight: "1px solid #333",
              background: "#252526",
            }}
          >
            <ChannelsPanel
              channels={channels}
              setChannels={setChannels}
              imageData={originalImage}
            />
          </div>
        )}

        {/* CANVAS */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "#2d2d2d",
          }}
        >
          {hasImage ? (
            <CanvasView
              ref={canvasRef}
              imageData={imageData}
              onClick={handleCanvasClick}
            />
          ) : (
            <div style={{ color: "#888" }}>
              Открой изображение
            </div>
          )}
        </div>

        {/* LEVELS SIDEBAR (ВАЖНО: СПРАВА) */}
        {hasImage && levelsOpen && (
          <div
            style={{
              width: 320,
              flexShrink: 0,
              borderLeft: "1px solid #333",
              background: "#1f1f1f",
              overflowY: "auto",
            }}
          >
            <LevelsDialog
              open={levelsOpen} 
              imageData={originalImage}
              levels={levels}
              setLevels={setLevels}
              onClose={() => setLevelsOpen(false)}
            />
            
          </div>
        )}
      </div>

      {/* STATUS BAR */}
      {hasImage && (
        <div style={{ flexShrink: 0 }}>
          <EyedropperInfo pixel={pickedPixel} info={info} />
        </div>
      )}
    </div>
  );
}