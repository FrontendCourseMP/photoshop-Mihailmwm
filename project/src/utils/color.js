export function applyChannels(imageData, channels) {
  const out = new ImageData(imageData.width, imageData.height);

  for (let i = 0; i < imageData.data.length; i += 4) {
    let r = imageData.data[i];
    let g = imageData.data[i + 1];
    let b = imageData.data[i + 2];
    let a = imageData.data[i + 3];

    // ================= RGB CHANNELS =================
    if (!channels.r) r = 0;
    if (!channels.g) g = 0;
    if (!channels.b) b = 0;

    // ================= ALPHA LOGIC =================
    if (!channels.a) {
      //  MASK MODE (grayscale alpha preview)
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      out.data[i] = gray;
      out.data[i + 1] = gray;
      out.data[i + 2] = gray;
      out.data[i + 3] = 255;
      continue;
    }

    // normal RGBA
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    out.data[i + 3] = a;
  }

  return out;
}

export function rgbToLab(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  const fx = x > 0.008856 ? Math.cbrt(x) : (7.787 * x + 16 / 116);
  const fy = y > 0.008856 ? Math.cbrt(y) : (7.787 * y + 16 / 116);
  const fz = z > 0.008856 ? Math.cbrt(z) : (7.787 * z + 16 / 116);

  return {
    L: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}