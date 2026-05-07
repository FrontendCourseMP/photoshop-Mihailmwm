import { forwardRef, useEffect } from "react";

function drawCheckerboard(ctx, width, height, size = 12) {
  const light = "#ffffff";
  const dark = "#bdbdbd";

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle =
        ((x / size + y / size) % 2 === 0) ? light : dark;

      ctx.fillRect(x, y, size, size);
    }
  }
}

const CanvasView = forwardRef(({ imageData, onClick }, ref) => {
  useEffect(() => {
    if (!ref.current || !imageData) return;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // 1. фон
    drawCheckerboard(ctx, canvas.width, canvas.height);

    // 2. рисуем с учетом alpha)
    const img = ctx.createImageData(imageData.width, imageData.height);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }

    ctx.putImageData(img, 0, 0);
  }, [imageData]);

  return (
    <canvas
      ref={ref}
      onClick={onClick}
      style={{
        border: "1px solid black",
        maxWidth: "100%",
        cursor: "crosshair",
      }}
    />
  );
});

export default CanvasView;