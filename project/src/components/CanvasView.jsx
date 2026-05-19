import { forwardRef, useEffect, useRef } from "react";

const CanvasView = forwardRef(({ imageData, onClick }, ref) => {
  const wrapperRef = useRef(null);

  // Center image via scroll after any imageData/layout change.
  useEffect(() => {
    if (!wrapperRef.current || !ref.current || !imageData) return;

    const wrapper = wrapperRef.current;

    // Wait 2 frames: first paint sets canvas size, second frame ensures layout is stable.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const maxLeft = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        const maxTop = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);

        wrapper.scrollLeft = Math.round(maxLeft / 2);
        wrapper.scrollTop = Math.round(maxTop / 2);
      });
    });
  }, [imageData, ref]);

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
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,

        // Force real scroll container.
        overflowX: "auto",
        overflowY: "auto",

        background: "#222",
      }}
      onClick={onClick}
    >
      <canvas
        ref={ref}
        style={{
          width: "auto",
          height: "auto",
          flexShrink: 0,
          imageRendering: "pixelated",
          border: "1px solid #444",
          display: "block",
        }}
      />
    </div>
  );
});

export default CanvasView;
