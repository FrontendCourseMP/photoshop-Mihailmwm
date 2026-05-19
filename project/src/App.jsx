import { useMemo, useRef, useState } from "react";

import TopMenu from "./components/TopMenu";
import CanvasView from "./components/CanvasView";
import ChannelsPanel from "./components/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo";
import LevelsDialog from "./components/LevelsDialog";

import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { applyChannels, rgbToLab } from "./utils/color";
import { applyLevels, createDefaultLevels } from "./utils/levels";

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

  // Committed levels are the version already applied to the image.
  const [levels, setLevels] = useState(() => createDefaultLevels());

  // Draft levels are edited inside the dialog before Apply.
  const [levelsDraft, setLevelsDraft] = useState(() => createDefaultLevels());
  const [levelsPreviewEnabled, setLevelsPreviewEnabled] = useState(true);

  const hasImage = originalImage !== null;

  // The canvas renders the draft while the dialog is open and preview is enabled.
  const imageData = useMemo(() => {
    if (!originalImage) return null;

    const activeLevels =
      levelsOpen && levelsPreviewEnabled ? levelsDraft : levels;

    const leveled = applyLevels(originalImage, activeLevels);
    return applyChannels(leveled, channels);
  }, [
    originalImage,
    channels,
    levels,
    levelsDraft,
    levelsOpen,
    levelsPreviewEnabled,
  ]);

  // Open Levels with a fresh draft copy of the current committed state.
  const handleOpenLevels = () => {
    setLevelsDraft(levels);
    setLevelsPreviewEnabled(true);
    setLevelsOpen(true);
  };

  // Cancel discards draft changes and returns to the committed result.
  const handleCancelLevels = () => {
    setLevelsDraft(levels);
    setLevelsPreviewEnabled(true);
    setLevelsOpen(false);
  };

  // Apply commits the draft changes to the real image pipeline.
  const handleApplyLevels = () => {
    setLevels(levelsDraft);
    setLevelsOpen(false);
  };

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
        setLevels(createDefaultLevels());
        setLevelsDraft(createDefaultLevels());
        setLevelsPreviewEnabled(true);
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
      setLevels(createDefaultLevels());
      setLevelsDraft(createDefaultLevels());
      setLevelsPreviewEnabled(true);
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
      {/* Top bar keeps file and tool actions reachable at all times. */}
      <TopMenu
        setTool={setTool}
        onOpen={handleUpload}
        onSavePNG={handleDownloadPNG}
        onSaveGB7={handleDownloadGB7}
        onOpenLevels={handleOpenLevels}
      />

      {/* Main workspace: channels on the left, canvas in the center, Levels on the right. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
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
            <div style={{ color: "#888" }}>Открой изображение</div>
          )}
        </div>

        {hasImage && levelsOpen && (
          <div
            style={{
              width: 360,
              flexShrink: 0,
              borderLeft: "1px solid #333",
              background: "#1f1f1f",
              overflow: "hidden",
            }}
          >
            <LevelsDialog
              open={levelsOpen}
              imageData={originalImage}
              levels={levelsDraft}
              setLevels={setLevelsDraft}
              previewEnabled={levelsPreviewEnabled}
              setPreviewEnabled={setLevelsPreviewEnabled}
              onCancel={handleCancelLevels}
              onApply={handleApplyLevels}
            />
          </div>
        )}
      </div>

      {/* Bottom info bar shows image size and picked pixel data. */}
      {hasImage && (
        <div style={{ flexShrink: 0 }}>
          <EyedropperInfo pixel={pickedPixel} info={info} />
        </div>
      )}
    </div>
  );
}
