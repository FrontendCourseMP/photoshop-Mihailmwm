import { forwardRef, useEffect } from "react";

const CanvasView = forwardRef(({ imageData }, ref) => {
  useEffect(() => {
    if (!imageData || !ref?.current) return;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    ctx.putImageData(imageData, 0, 0);
  }, [imageData, ref]);

  return (
    <canvas
      ref={ref}
      style={{ border: "1px solid black", maxWidth: "100%" }}
    />
  );
});

export default CanvasView;