import { useMemo, useRef, useState } from "react";

import TopMenu from "./components/TopMenu";
import CanvasView from "./components/CanvasView";
import ChannelsPanel from "./components/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo";
import LevelsDialog from "./components/LevelsDialog";
import ScaleDialog from "./components/ScaleDialog";

import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { applyChannels, rgbToLab } from "./utils/color";
import { applyLevels, createDefaultLevels } from "./utils/levels";
import { resizeImageData, scaleImageData } from "./utils/scale";

const LEFT_PANEL_WIDTH = 180;
const RIGHT_PANEL_WIDTH = 360;

export default function App() {
  const canvasRef = useRef(null);

  const [tool, setTool] = useState("move");

  const [levelsOpen, setLevelsOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);

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

  // Levels pipeline state (applied/committed + draft/preview)
  const [levels, setLevels] = useState(() => createDefaultLevels());
  const [levelsDraft, setLevelsDraft] = useState(() => createDefaultLevels());
  const [levelsPreviewEnabled, setLevelsPreviewEnabled] = useState(true);

  // View zoom (12..300) affects canvas rendering only (scaled-by-view-zoom).
  // Must start at 100% when image opens and must not auto-fit.
  const [viewScalePercent, setViewScalePercent] = useState(100);

  const hasImage = originalImage !== null;

  // Canvas image is: original -> levels -> channels -> scaled-by-view-zoom (with interpolation).
  const imageData = useMemo(() => {
    if (!originalImage) return null;

    const activeLevels =
      levelsOpen && levelsPreviewEnabled ? levelsDraft : levels;

    const leveled = applyLevels(originalImage, activeLevels);
    const colored = applyChannels(leveled, channels);

    return scaleImageData(colored, viewScalePercent, "bilinear");
  }, [
    originalImage,
    channels,
    levels,
    levelsDraft,
    levelsOpen,
    levelsPreviewEnabled,
    viewScalePercent,
  ]);

  const handleOpenLevels = () => {
    setLevelsDraft(levels);
    setLevelsPreviewEnabled(true);
    setLevelsOpen(true);
  };

  const handleCancelLevels = () => {
    setLevelsDraft(levels);
    setLevelsPreviewEnabled(true);
    setLevelsOpen(false);
  };

  const handleApplyLevels = () => {
    setLevels(levelsDraft);
    setLevelsOpen(false);
  };

  const handleOpenScale = () => setScaleOpen(true);
  const handleCancelScale = () => setScaleOpen(false);

  // Scale tool: actually resizes the source image (originalImage).
  // After resize we keep current viewScalePercent (no auto-fit).
  const handleApplyScale = ({
    targetWidth,
    targetHeight,
    interpolation,
  }) => {
    if (!originalImage) return;

    const resized = resizeImageData(
      originalImage,
      targetWidth,
      targetHeight,
      interpolation
    );

    setOriginalImage(resized);
    setInfo((prev) => ({
      ...prev,
      width: targetWidth,
      height: targetHeight,
    }));

    // Reset levels draft to keep state consistent with new source.
    setLevels(createDefaultLevels());
    setLevelsDraft(createDefaultLevels());
    setLevelsPreviewEnabled(true);

    setLevelsOpen(false);
    setScaleOpen(false);
    setPickedPixel(null);
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

        setPickedPixel(null);

        // Requirement: start at 100% (no fit-to-screen).
        setViewScalePercent(100);
        setLevelsOpen(false);
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

      setPickedPixel(null);

      // Requirement: start at 100% (no fit-to-screen).
      setViewScalePercent(100);
      setLevelsOpen(false);
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

    // Map click inside displayed (scaled) canvas -> canvas pixel coords.
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
      <TopMenu
        setTool={setTool}
        onOpen={handleUpload}
        onSavePNG={handleDownloadPNG}
        onSaveGB7={handleDownloadGB7}
        onOpenLevels={handleOpenLevels}
        onOpenScale={handleOpenScale}
      />

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
              width: LEFT_PANEL_WIDTH,
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
            alignItems: "stretch",
            justifyContent: "flex-start",
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

          {hasImage && levelsOpen && (
            <div
              style={{
                width: RIGHT_PANEL_WIDTH,
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

          {hasImage && scaleOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
                padding: 20,
              }}
            >
              <ScaleDialog
                open={scaleOpen}
                sourceWidth={info.width}
                sourceHeight={info.height}
                initialScalePercent={viewScalePercent}
                initialUnit="percent"
                initialInterpolation="bilinear"
                onCancel={handleCancelScale}
                onApply={handleApplyScale}
              />
            </div>
          )}
        </div>
      </div>

      {hasImage && (
        <div style={{ flexShrink: 0 }}>
          <EyedropperInfo
            pixel={pickedPixel}
            info={info}
            scalePercent={viewScalePercent}
            onScaleChange={(p) => {
              setViewScalePercent(p);
            }}
          />
        </div>
      )}
    </div>
  );
}
