import { useRef, useState, useMemo } from "react";

import Toolbar from "./components/Toolbar";
import CanvasView from "./components/CanvasView";
import StatusBar from "./components/StatusBar";
import ChannelsPanel from "./components/ChannelsPanel";
import EyedropperInfo from "./components/EyedropperInfo";

import { decodeGB7, encodeGB7 } from "./utils/gb7";
import { rgbToLab, applyChannels } from "./utils/color";

export default function App() {
  const canvasRef = useRef(null);

  // ================= TOOL =================
  const [tool, setTool] = useState("move");

  // ================= IMAGE =================
  const [originalImage, setOriginalImage] = useState(null);

  // ================= CHANNELS =================
  const [channels, setChannels] = useState({
    r: true,
    g: true,
    b: true,
    a: true,
  });

  // стабилизация зависимостей
  const channelsKey = `${channels.r}${channels.g}${channels.b}${channels.a}`;

  // ================= INFO =================
  const [info, setInfo] = useState({
    width: 0,
    height: 0,
    depth: 0,
  });

  // ================= EYEDROPPER =================
  const [pickedPixel, setPickedPixel] = useState(null);

  // ================= IMAGE PROCESSING =================
  const imageData = useMemo(() => {
    if (!originalImage) return null;
    return applyChannels(originalImage, channels);
  }, [originalImage, channelsKey]);

  // ================= UPLOAD =================
  const handleUpload = async (e) => {
    const file = e.target.files[0];
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

  // ================= PNG EXPORT =================
  const handleDownloadPNG = () => {
    if (!imageData) return;

    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");

    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;

    ctx.putImageData(imageData, 0, 0);

    const link = document.createElement("a");
    link.download = "image.png";
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  };

  // ================= GB7 EXPORT =================
  const handleDownloadGB7 = () => {
    if (!imageData) return;

    const tempCanvas = document.createElement("canvas");
    const ctx = tempCanvas.getContext("2d");

    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;

    ctx.putImageData(imageData, 0, 0);

    const blob = encodeGB7(tempCanvas);

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "image.gb7";
    link.click();
  };

  // ================= EYEDROPPER =================
  const handleCanvasClick = (e) => {
    if (tool !== "eyedropper") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext("2d");
    const pixel = ctx.getImageData(x, y, 1, 1).data;

    const rgb = {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
    };

    const lab = rgbToLab(rgb.r, rgb.g, rgb.b);

    setPickedPixel({ x, y, ...rgb, lab });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Photoshop (GB7)</h1>

      <Toolbar
        onUpload={handleUpload}
        onDownloadPNG={handleDownloadPNG}
        onDownloadGB7={handleDownloadGB7}
        setTool={setTool}
        tool={tool}
      />

      <ChannelsPanel
        channels={channels}
        setChannels={setChannels}
      />

      <CanvasView
        ref={canvasRef}
        imageData={imageData}
        onClick={handleCanvasClick}
      />

      <StatusBar info={info} />

      <EyedropperInfo pixel={pickedPixel} />
    </div>
  );
}