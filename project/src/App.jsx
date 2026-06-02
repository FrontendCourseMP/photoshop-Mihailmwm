import { useEffect, useMemo, useRef, useState } from "react";

import TopMenu from "./components/TopMenu";
import CanvasView from "./components/CanvasView";
import ChannelsPanel from "./components/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo";
import LevelsDialog from "./components/LevelsDialog";
import ScaleDialog from "./components/ScaleDialog";
import KernelDialog from "./components/KernelDialog";

import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { applyChannels, rgbToLab } from "./utils/color";
import { applyLevels, createDefaultLevels } from "./utils/levels";
import {
  calculateFitScalePercent,
  resizeImageData,
  scaleImageData,
} from "./utils/scale";
import {
  applyKernelToImageDataAsync,
  createDefaultKernelSettings,
  isIdentityKernel,
} from "./utils/kernels";

const LEFT_PANEL_WIDTH = 180;
const RIGHT_PANEL_WIDTH = 360;
const TOP_MENU_HEIGHT = 48;
const VIEW_MARGIN = 50;

const clampDisplayScalePercent = (p) =>
  Math.max(12, Math.min(300, Math.round(Number(p) || 100)));

export default function App() {
  const canvasRef = useRef(null);

  const [tool, setTool] = useState("move");

  const [levelsOpen, setLevelsOpen] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);
  const [kernelsOpen, setKernelsOpen] = useState(false);

  const [originalImage, setOriginalImage] = useState(null);

  const [channelsMode, setChannelsMode] = useState("rgba"); // "rgba" | "gb7"
  const [hasAlpha, setHasAlpha] = useState(false);

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

  /**
   * Zoom model:
   * - actualViewScalePercent is used to resize the canvas content
   * - displayedScalePercent is what user sees in dropdown/select
   *
   * Requirement: on open the image should be fully visible (fit-to-viewport),
   * but the scale UI should show 100%.
   */
  const [fitScalePercent, setFitScalePercent] = useState(100);
  const [viewScaleFactor, setViewScaleFactor] = useState(1); // 1 => 100%

  const displayedScalePercent = clampDisplayScalePercent(viewScaleFactor * 100);
  const actualViewScalePercent = Math.max(1, fitScalePercent * viewScaleFactor);

  // Kernels pipeline state (draft/preview + async processing)
  const [kernelsDraft, setKernelsDraft] = useState(() =>
    createDefaultKernelSettings()
  );
  const [kernelsPreviewEnabled, setKernelsPreviewEnabled] = useState(true);
  const [kernelsProcessing, setKernelsProcessing] = useState(false);
  const [kernelsProgress, setKernelsProgress] = useState(0);
  const [kernelsProcessedImage, setKernelsProcessedImage] = useState(null);
  const kernelsAbortRef = useRef(null);

  const hasImage = originalImage !== null;

  const computeFitZoom = (imageWidth, imageHeight) => {
    if (typeof window === "undefined") return 100;

    return calculateFitScalePercent(
      imageWidth,
      imageHeight,
      window.innerWidth,
      window.innerHeight,
      {
        leftPanelWidth: LEFT_PANEL_WIDTH,
        rightPanelWidth: 0,
        topBarHeight: TOP_MENU_HEIGHT,
        bottomBarHeight: 0,
        margin: VIEW_MARGIN,
      }
    );
  };

  // Apply Levels first (fast enough) and feed into kernels.
  const activeLevels = levelsOpen && levelsPreviewEnabled ? levelsDraft : levels;

  const leveledImageData = useMemo(() => {
    if (!originalImage) return null;
    return applyLevels(originalImage, activeLevels);
  }, [originalImage, activeLevels]);

  // Run kernels async preview when dialog open + preview enabled.
  useEffect(() => {
    if (!hasImage || !kernelsOpen || !kernelsPreviewEnabled) {
      if (kernelsAbortRef.current) kernelsAbortRef.current.abort();
      return;
    }

    if (!leveledImageData) return;

    const kernel9 = kernelsDraft?.kernel9;
    const edgeMode = kernelsDraft?.edgeMode ?? "copy";
    const channelsMask = kernelsDraft?.channelsMask ?? { r: true, g: true, b: true, a: false };

    // Cancel previous run.
    if (kernelsAbortRef.current) kernelsAbortRef.current.abort();

    // Identity kernel: no need to process.
    if (isIdentityKernel(kernel9)) {
      // Avoid synchronous setState() inside effect body (eslint/react rule).
      setTimeout(() => {
        setKernelsProcessedImage(leveledImageData);
        setKernelsProcessing(false);
        setKernelsProgress(1);
      }, 0);
      return;
    }

    const controller = new AbortController();
    kernelsAbortRef.current = controller;

    // Avoid calling setState() synchronously within an effect body.
    setTimeout(() => {
      setKernelsProcessing(true);
      setKernelsProgress(0);
    }, 0);

    (async () => {
      try {
        const result = await applyKernelToImageDataAsync(leveledImageData, kernel9, channelsMask, edgeMode, {
          rowChunk: 12,
          signal: controller.signal,
          onProgress: (p) => setKernelsProgress(p),
        });

        if (controller.signal.aborted) return;

        // If canceled returned null, fall back to leveled.
        setKernelsProcessedImage(result ?? leveledImageData);
      } finally {
        if (!controller.signal.aborted) {
          setKernelsProcessing(false);
          setKernelsProgress(1);
        }
      }
    })();
  }, [
    hasImage,
    kernelsOpen,
    kernelsPreviewEnabled,
    leveledImageData,
    kernelsDraft?.edgeMode,
    kernelsDraft?.presetKey,
    kernelsDraft?.kernel9?.join(","),
    kernelsDraft?.channelsMask?.r,
    kernelsDraft?.channelsMask?.g,
    kernelsDraft?.channelsMask?.b,
    kernelsDraft?.channelsMask?.a,
  ]);

  const imageData = useMemo(() => {
    if (!originalImage) return null;

    const base =
      kernelsOpen && kernelsPreviewEnabled
        ? kernelsProcessedImage ?? leveledImageData
        : leveledImageData;

    const colored = applyChannels(base, channels, channelsMode);

    return scaleImageData(colored, actualViewScalePercent, "bilinear");
  }, [
    originalImage,
    channels,
    channelsMode,
    leveledImageData,
    kernelsOpen,
    kernelsPreviewEnabled,
    kernelsProcessedImage,
    actualViewScalePercent,
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

    setLevels(createDefaultLevels());
    setLevelsDraft(createDefaultLevels());
    setLevelsPreviewEnabled(true);

    setLevelsOpen(false);
    setScaleOpen(false);
    setPickedPixel(null);

    const nextFit = computeFitZoom(targetWidth, targetHeight);
    setFitScalePercent(nextFit);
  };

  const handleOpenKernels = () => {
    setKernelsDraft(createDefaultKernelSettings());
    setKernelsPreviewEnabled(true);
    setKernelsProcessedImage(null);
    setKernelsProcessing(false);
    setKernelsProgress(0);
    setKernelsOpen(true);
  };

  const handleCancelKernels = () => {
    if (kernelsAbortRef.current) kernelsAbortRef.current.abort();
    setKernelsOpen(false);
    setKernelsProcessedImage(null);
    setKernelsProcessing(false);
    setKernelsProgress(0);
  };

  const handleApplyKernels = async () => {
    if (!originalImage) return;
    if (kernelsProcessing) return;

    // If preview didn't run yet, compute synchronously-ish from leveled.
    const base = leveledImageData;
    if (!base) return;

    const kernel9 = kernelsDraft?.kernel9;
    const edgeMode = kernelsDraft?.edgeMode ?? "copy";
    const channelsMask =
      kernelsDraft?.channelsMask ?? { r: true, g: true, b: true, a: false };

    const next =
      kernelsProcessedImage ??
      (isIdentityKernel(kernel9) ? base : await applyKernelToImageDataAsync(base, kernel9, channelsMask, edgeMode));

    if (!next) return;

    setOriginalImage(next);
    setInfo((prev) => ({
      ...prev,
      width: next.width,
      height: next.height,
    }));

    // Reset Levels state so lab workflow stays consistent.
    setLevels(createDefaultLevels());
    setLevelsDraft(createDefaultLevels());
    setLevelsPreviewEnabled(true);

    setLevelsOpen(false);
    setKernelsOpen(false);
    setScaleOpen(false);
    setPickedPixel(null);
  };

  // ================= UPLOAD =================
  const handleUpload = async (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    if (["png", "jpg", "jpeg"].includes(ext)) {
      const nextChannelsMode = "rgba";
      const nextHasAlpha = ext === "png";

      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height);

        const nextFit = computeFitZoom(img.width, img.height);

        setChannelsMode(nextChannelsMode);
        setHasAlpha(nextHasAlpha);
        setChannels({
          r: true,
          g: true,
          b: true,
          a: nextHasAlpha,
        });

        setOriginalImage(data);
        setInfo({
          width: img.width,
          height: img.height,
          depth: ext === "png" ? 32 : 24,
        });

        setLevels(createDefaultLevels());
        setLevelsDraft(createDefaultLevels());
        setLevelsPreviewEnabled(true);

        setPickedPixel(null);

        setFitScalePercent(nextFit);
        setViewScaleFactor(1);

        setLevelsOpen(false);
        setScaleOpen(false);
        setKernelsOpen(false);
      };
    }

    if (ext === "gb7") {
      const buffer = await file.arrayBuffer();
      const result = decodeGB7(buffer);

      const nextFit = computeFitZoom(result.width, result.height);

      setChannelsMode("gb7");
      setHasAlpha(result.hasMask);
      setChannels({
        r: true,
        g: true,
        b: true,
        a: result.hasMask,
      });

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

      setFitScalePercent(nextFit);
      setViewScaleFactor(1);

      setLevelsOpen(false);
      setScaleOpen(false);
      setKernelsOpen(false);
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

  const handleDownloadJPG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const a = document.createElement("a");
    a.download = "image.jpg";
    a.href = canvas.toDataURL("image/jpeg", 0.95);
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
      <TopMenu
        setTool={setTool}
        onOpen={handleUpload}
        onSavePNG={handleDownloadPNG}
        onSaveGB7={handleDownloadGB7}
        onSaveJPG={handleDownloadJPG}
        onOpenLevels={handleOpenLevels}
        onOpenScale={handleOpenScale}
        onOpenKernels={handleOpenKernels}
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
              hasAlpha={hasAlpha}
              channelsMode={channelsMode}
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
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888",
              }}
            >
              Открой изображение
            </div>
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
        </div>
      </div>

      {hasImage && (
        <div style={{ flexShrink: 0 }}>
          <EyedropperInfo
            pixel={pickedPixel}
            info={info}
            scalePercent={displayedScalePercent}
            onScaleChange={(p) => {
              const next = clampDisplayScalePercent(p);
              setViewScaleFactor(next / 100);
            }}
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
            initialScalePercent={displayedScalePercent}
            initialUnit="percent"
            initialInterpolation="bilinear"
            onCancel={handleCancelScale}
            onApply={handleApplyScale}
          />
        </div>
      )}

      {hasImage && kernelsOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "transparent",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-end",
            zIndex: 10000,
            padding: 0,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: RIGHT_PANEL_WIDTH,
              flexShrink: 0,
              background: "#1f1f1f",
              borderLeft: "1px solid #333",
              overflow: "hidden",
              pointerEvents: "auto",
            }}
          >
            <KernelDialog
              open={kernelsOpen}
              onCancel={handleCancelKernels}
              onReset={() => setKernelsDraft(createDefaultKernelSettings())}
              onApply={handleApplyKernels}
              kernelDraft={kernelsDraft}
              setKernelDraft={setKernelsDraft}
              previewEnabled={kernelsPreviewEnabled}
              setPreviewEnabled={setKernelsPreviewEnabled}
              isProcessing={kernelsProcessing}
              progress={kernelsProgress}
            />
          </div>
        </div>
      )}
    </div>
  );
}
