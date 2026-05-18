import { useRef, useState, useMemo } from "react";

import TopMenu from "./components/TopMenu";
import CanvasView from "./components/CanvasView";
import ChannelsPanel from "./components/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo";

import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { applyChannels, rgbToLab } from "./utils/color";

export default function App() {
  const canvasRef = useRef(null);

  const [tool, setTool] = useState("move");

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

  const hasImage = originalImage !== null;

  // ================= DERIVED IMAGE =================
  const imageData = useMemo(() => {
    if (!originalImage) return null;
    return applyChannels(originalImage, channels);
  }, [originalImage, channels]);

  // ================= UPLOAD =================
  const handleUpload = async (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    // PNG / JPG
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

    // GB7
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

  // ================= EXPORT PNG =================
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const a = document.createElement("a");

    a.download = "image.png";
    a.href = canvas.toDataURL();

    a.click();
  };

  // ================= EXPORT GB7 =================
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

    const x = Math.floor(
      (e.clientX - rect.left) * (canvas.width / rect.width)
    );

    const y = Math.floor(
      (e.clientY - rect.top) * (canvas.height / rect.height)
    );

    const ctx = canvas.getContext("2d");

    const p = ctx.getImageData(x, y, 1, 1).data;

    const rgb = {
      r: p[0],
      g: p[1],
      b: p[2],
    };

    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);

    setPickedPixel({
      x,
      y,
      ...rgb,
      lab,
    });
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",

        display: "flex",
        flexDirection: "column",

        background: "#1e1e1e",
      }}
    >
      {/* ================= TOP MENU ================= */}
      <div
        style={{
          flexShrink: 0,
        }}
      >
        <TopMenu
          setTool={setTool}
          onOpen={handleUpload}
          onSavePNG={handleDownloadPNG}
          onSaveGB7={handleDownloadGB7}
          disabled={!hasImage}
        />
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div
        style={{
          flex: 1,
          display: "flex",

          overflow: "hidden",

          minHeight: 0,
          minWidth: 0,
        }}
      >
        {/* ================= CHANNELS ================= */}
        {hasImage && (
          <div
            style={{
              width: 180,
              flexShrink: 0,

              overflowY: "auto",
              overflowX: "hidden",

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

        {/* ================= CANVAS AREA ================= */}
        <div
          style={{
            flex: 1,

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            overflow: "hidden",

            minWidth: 0,
            minHeight: 0,

            padding: 10,
            boxSizing: "border-box",

            background: "#2d2d2d",
          }}
        >
          {hasImage ? (
            <div
              style={{
                maxWidth: "100%",
                maxHeight: "100%",

                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                overflow: "hidden",
              }}
            >
              <CanvasView
                ref={canvasRef}
                imageData={imageData}
                onClick={handleCanvasClick}
              />
            </div>
          ) : (
            <div
              style={{
                color: "#888",
                fontSize: 18,
              }}
            >
              Открой изображение
            </div>
          )}
        </div>
      </div>

      {/* ================= STATUS BAR ================= */}
      {hasImage && (
        <div
          style={{
            flexShrink: 0,
          }}
        >
          <EyedropperInfo
            pixel={pickedPixel}
            info={info}
          />
        </div>
      )}
    </div>
  );
}