import { forwardRef, useEffect, useRef } from "react";

const CanvasView = forwardRef(({ imageData, onClick }, ref) => {
  const wrapperRef = useRef(null);

  // Update canvas pixels + then center via scroll (for overflow) and margins (for fit).
  useEffect(() => {
    if (!ref.current || !imageData || !wrapperRef.current) return;

    const canvas = ref.current;
    const wrapper = wrapperRef.current;

    const ctx = canvas.getContext("2d");
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    ctx.putImageData(imageData, 0, 0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const wrapperW = wrapper.clientWidth;
        const wrapperH = wrapper.clientHeight;

        const canvasW = canvas.width;
        const canvasH = canvas.height;

        // If the image fits inside the wrapper, center it with margins.
        // If it overflows, margins must be 0 so scrollWidth matches the true content size.
        const overflowX = canvasW - wrapperW;
        const overflowY = canvasH - wrapperH;

        const marginLeft = overflowX > 0 ? 0 : Math.round((-overflowX) / 2);
        const marginTop = overflowY > 0 ? 0 : Math.round((-overflowY) / 2);

        canvas.style.marginLeft = `${marginLeft}px`;
        canvas.style.marginTop = `${marginTop}px`;

        // Then center via scroll for overflow cases.
        const maxLeft = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        const maxTop = Math.max(0, wrapper.scrollHeight - wrapper.clientHeight);

        wrapper.scrollLeft = Math.round(maxLeft / 2);
        wrapper.scrollTop = Math.round(maxTop / 2);
      });
    });
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
          marginLeft: 0,
          marginTop: 0,
        }}
      />
    </div>
  );
});

export default CanvasView;
