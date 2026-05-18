import { forwardRef, useEffect, useRef } from "react";

const CanvasView = forwardRef(({ imageData, onClick }, ref) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!ref.current || !imageData) return;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    canvas.width = imageData.width;
    canvas.height = imageData.height;

    ctx.putImageData(imageData, 0, 0);
  }, [imageData, ref]);

  return (
    <div
      ref={wrapperRef}
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "auto",
        background: "#222",
      }}
    >
      <canvas
        ref={ref}
        style={{
          maxWidth: "100%",
          height: "auto",
          imageRendering: "pixelated",
          border: "1px solid #444",
        }}
      />
    </div>
  );
});

export default CanvasView;