// ===== SCALE LIMITS =====
// Keep the zoom range inside the laboratory requirement.
export const MIN_SCALE_PERCENT = 12;
export const MAX_SCALE_PERCENT = 300;

// ===== INTERPOLATION REGISTRY =====
// The registry is intentionally extensible so future interpolation methods
// can be added without changing the UI contract.
export const interpolationMethods = {
  nearest: {
    label: "Nearest neighbor",
    description:
      "Fastest method. Keeps hard edges and pixel art crisp, but can look blocky.",
    resize: resizeNearestNeighbor,
  },
  bilinear: {
    label: "Bilinear",
    description:
      "Default method. Produces smoother results by blending four neighbors.",
    resize: resizeBilinear,
  },
};

// ===== SCALE HELPERS =====
// Clamp zoom values to the allowed interval.
export function clampScalePercent(value) {
  return Math.max(MIN_SCALE_PERCENT, Math.min(MAX_SCALE_PERCENT, value));
}

// Compute a fit-to-screen zoom that keeps at least 50 px of outer padding.
export function calculateFitScalePercent(
  imageWidth,
  imageHeight,
  viewportWidth,
  viewportHeight,
  layout = {}
) {
  const leftPanelWidth = layout.leftPanelWidth ?? 0;
  const rightPanelWidth = layout.rightPanelWidth ?? 0;
  const topBarHeight = layout.topBarHeight ?? 0;
  const bottomBarHeight = layout.bottomBarHeight ?? 0;
  const margin = layout.margin ?? 50;

  const availableWidth = Math.max(
    1,
    viewportWidth - leftPanelWidth - rightPanelWidth - margin * 2
  );
  const availableHeight = Math.max(
    1,
    viewportHeight - topBarHeight - bottomBarHeight - margin * 2
  );

  const percent = Math.min(
    (availableWidth / imageWidth) * 100,
    (availableHeight / imageHeight) * 100
  );

  return clampScalePercent(percent);
}

// ===== IMAGE RESIZE API =====
// Resize using the requested interpolation method. Returns a new ImageData.
// Hard safety limits to avoid invalid ImageData/typed-array sizes
// when UI passes extreme values.
const MAX_TARGET_SIDE = 20000;
const MAX_TARGET_PIXELS = 50_000_000; // ~200MB RGBA, still large but safer than crashing

function clampTargetDimensions(targetWidth, targetHeight) {
  let w = Math.max(1, Math.round(Number(targetWidth) || 1));
  let h = Math.max(1, Math.round(Number(targetHeight) || 1));

  w = Math.min(w, MAX_TARGET_SIDE);
  h = Math.min(h, MAX_TARGET_SIDE);

  // Clamp by total pixel count while preserving aspect ratio.
  let pixels = w * h;
  if (pixels > MAX_TARGET_PIXELS) {
    const ratio = Math.sqrt(MAX_TARGET_PIXELS / pixels);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }

  return { w, h };
}

export function resizeImageData(imageData, targetWidth, targetHeight, method = "bilinear") {
  const algorithm = interpolationMethods[method]?.resize
    ? interpolationMethods[method]
    : interpolationMethods.bilinear;

  const { w, h } = clampTargetDimensions(targetWidth, targetHeight);
  return algorithm.resize(imageData, w, h);
}

// Convenience wrapper for scale-based resizing.
export function scaleImageData(imageData, scalePercent, method = "bilinear") {
  const safeScale = clampScalePercent(scalePercent) / 100;
  const targetWidth = Math.max(1, Math.round(imageData.width * safeScale));
  const targetHeight = Math.max(1, Math.round(imageData.height * safeScale));

  return resizeImageData(imageData, targetWidth, targetHeight, method);
}

// ===== NEAREST NEIGHBOR =====
// Direct pixel lookup, useful for sharp pixel-art style scaling.
// Optimized nearest-neighbor: precompute source indices per row/col.
function resizeNearestNeighbor(imageData, targetWidth, targetHeight) {
  const src = imageData.data;
  const srcWidth = imageData.width;
  const srcHeight = imageData.height;

  const dst = new ImageData(targetWidth, targetHeight);
  const dstData = dst.data;

  const xRatio = srcWidth / targetWidth;
  const yRatio = srcHeight / targetHeight;

  const xSrc = new Int32Array(targetWidth);
  for (let x = 0; x < targetWidth; x++) {
    xSrc[x] = Math.min(srcWidth - 1, Math.floor(x * xRatio));
  }

  const ySrc = new Int32Array(targetHeight);
  for (let y = 0; y < targetHeight; y++) {
    ySrc[y] = Math.min(srcHeight - 1, Math.floor(y * yRatio));
  }

  for (let y = 0; y < targetHeight; y++) {
    const srcY = ySrc[y];
    const rowDstBase = y * targetWidth * 4;
    const rowSrcBase = srcY * srcWidth * 4;

    for (let x = 0; x < targetWidth; x++) {
      const srcX = xSrc[x];
      const srcIndex = rowSrcBase + srcX * 4;
      const dstIndex = rowDstBase + x * 4;

      dstData[dstIndex] = src[srcIndex];
      dstData[dstIndex + 1] = src[srcIndex + 1];
      dstData[dstIndex + 2] = src[srcIndex + 2];
      dstData[dstIndex + 3] = src[srcIndex + 3];
    }
  }

  return dst;
}

// ===== BILINEAR =====
// Blend the four surrounding pixels for smoother interpolation.
// Optimized bilinear: precompute x/y mappings & weights.
function resizeBilinear(imageData, targetWidth, targetHeight) {
  const src = imageData.data;
  const srcWidth = imageData.width;
  const srcHeight = imageData.height;

  const dst = new ImageData(targetWidth, targetHeight);
  const dstData = dst.data;

  const xRatio = srcWidth / targetWidth;
  const yRatio = srcHeight / targetHeight;

  // x mapping
  const x0Arr = new Int32Array(targetWidth);
  const x1Arr = new Int32Array(targetWidth);
  const xWArr = new Float32Array(targetWidth);

  for (let x = 0; x < targetWidth; x++) {
    const srcX = (x + 0.5) * xRatio - 0.5;
    const x0 = clampIndex(Math.floor(srcX), srcWidth);
    const x1 = clampIndex(x0 + 1, srcWidth);
    const xWeight = srcX - Math.floor(srcX);

    x0Arr[x] = x0;
    x1Arr[x] = x1;
    xWArr[x] = xWeight;
  }

  // y mapping
  const y0Arr = new Int32Array(targetHeight);
  const y1Arr = new Int32Array(targetHeight);
  const yWArr = new Float32Array(targetHeight);

  for (let y = 0; y < targetHeight; y++) {
    const srcY = (y + 0.5) * yRatio - 0.5;
    const y0 = clampIndex(Math.floor(srcY), srcHeight);
    const y1 = clampIndex(y0 + 1, srcHeight);
    const yWeight = srcY - Math.floor(srcY);

    y0Arr[y] = y0;
    y1Arr[y] = y1;
    yWArr[y] = yWeight;
  }

  for (let y = 0; y < targetHeight; y++) {
    const y0 = y0Arr[y];
    const y1 = y1Arr[y];
    const yWeight = yWArr[y];

    const rowDstBase = y * targetWidth * 4;
    const topRowBase = y0 * srcWidth * 4;
    const botRowBase = y1 * srcWidth * 4;

    const invY = 1 - yWeight;

    for (let x = 0; x < targetWidth; x++) {
      const x0 = x0Arr[x];
      const x1 = x1Arr[x];
      const xWeight = xWArr[x];

      const invX = 1 - xWeight;

      const topLeft = topRowBase + x0 * 4;
      const topRight = topRowBase + x1 * 4;
      const bottomLeft = botRowBase + x0 * 4;
      const bottomRight = botRowBase + x1 * 4;

      const dstIndex = rowDstBase + x * 4;

      for (let channel = 0; channel < 4; channel++) {
        const top =
          src[topLeft + channel] * invX +
          src[topRight + channel] * xWeight;

        const bottom =
          src[bottomLeft + channel] * invX +
          src[bottomRight + channel] * xWeight;

        dstData[dstIndex + channel] = Math.round(top * invY + bottom * yWeight);
      }
    }
  }

  return dst;
}

// ===== INTERNAL HELPERS =====
// kept for bilinear/nearest index clamping
function clampIndex(value, max) {
  return Math.max(0, Math.min(value, max - 1));
}
