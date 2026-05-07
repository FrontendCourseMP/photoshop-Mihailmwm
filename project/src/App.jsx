import { useRef, useState } from "react";

import Toolbar from "./components/Toolbar";
import CanvasView from "./components/CanvasView";
import StatusBar from "./components/StatusBar";

import { decodeGB7, encodeGB7 } from "./utils/gb7";

export default function App() {
  const canvasRef = useRef(null);

  const [imageData, setImageData] = useState(null);

  const [info, setInfo] = useState({
    width: 0,
    height: 0,
    depth: 0,
  });

  // ===================== UPLOAD =====================

  const handleUpload = async (e) => {
    const file = e.target.files[0];

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

        const data = ctx.getImageData(
          0,
          0,
          img.width,
          img.height
        );

        setImageData(data);

        setInfo({
          width: img.width,
          height: img.height,
          depth: 24,
        });
      };
    }

    // GB7
    else if (ext === "gb7") {
      const buffer = await file.arrayBuffer();

      const result = decodeGB7(buffer);

      setImageData(result.imageData);

      setInfo({
        width: result.width,
        height: result.height,
        depth: 7,
      });
    }

    else {
      alert("Unsupported format");
    }
  };

  // ===================== DOWNLOAD PNG =====================

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const link = document.createElement("a");

    link.download = "image.png";

    link.href = canvas.toDataURL();

    link.click();
  };

  // ===================== DOWNLOAD GB7 =====================

  const handleDownloadGB7 = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const blob = encodeGB7(canvas);

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "image.gb7";

    link.click();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Photoshop (GB7)</h1>

      <Toolbar
        onUpload={handleUpload}
        onDownloadPNG={handleDownloadPNG}
        onDownloadGB7={handleDownloadGB7}
      />

      <CanvasView
        ref={canvasRef}
        imageData={imageData}
      />

      <StatusBar info={info} />
    </div>
  );
}