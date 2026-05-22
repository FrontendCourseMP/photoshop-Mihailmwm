export function applyChannels(imageData, channels, channelsMode = "rgba") {
  const out = new ImageData(imageData.width, imageData.height);

  const showR = !!channels.r;
  const showG = !!channels.g;
  const showB = !!channels.b;
  const showA = !!channels.a;

  const grayOn = showR || showG || showB;

  const alphaLayerOnly = showA && !showR && !showG && !showB;

  // GB7: a is a binary/bw mask layer; RGB is grayscale.
  if (channelsMode === "gb7") {
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r0 = imageData.data[i];
      const g0 = imageData.data[i + 1];
      const b0 = imageData.data[i + 2];
      const a0 = imageData.data[i + 3]; // mask intensity (0 or 255)

      // gray value from RGB after per-channel masking
      const r = showR ? r0 : 0;
      const g = showG ? g0 : 0;
      const b = showB ? b0 : 0;

      // since GB7 is grayscale, use any non-zero component as grayIntensity
      // (in practice r=g=b after RGB masking, but keep robust).
      const grayIntensity =
        showR ? r : showG ? g : showB ? b : 0;

      if (!grayOn && !showA) {
        out.data[i] = 0;
        out.data[i + 1] = 0;
        out.data[i + 2] = 0;
        out.data[i + 3] = 255;
        continue;
      }

      if (grayOn && !showA) {
        out.data[i] = grayIntensity;
        out.data[i + 1] = grayIntensity;
        out.data[i + 2] = grayIntensity;
        out.data[i + 3] = 255;
        continue;
      }

      if (!grayOn && showA) {
        // mask layer only
        out.data[i] = a0;
        out.data[i + 1] = a0;
        out.data[i + 2] = a0;
        out.data[i + 3] = 255;
        continue;
      }

      // both gray + mask => overlay both in RGB (opaque)
      const overlay = Math.round(grayIntensity * 0.5 + a0 * 0.5);
      out.data[i] = overlay;
      out.data[i + 1] = overlay;
      out.data[i + 2] = overlay;
      out.data[i + 3] = 255;
    }

    return out;
  }

  // Default RGBA/PNG/JPG semantics:
  // - channels.a=false => ignore alpha, keep chosen RGB masks, output opaque.
  // - channels.a=true:
  //    - if only alpha channel selected => show alpha as grayscale opaque.
  //    - else => preserve normal RGBA (alpha applied), plus RGB masking.
  for (let i = 0; i < imageData.data.length; i += 4) {
    let r = imageData.data[i];
    let g = imageData.data[i + 1];
    let b = imageData.data[i + 2];
    const a = imageData.data[i + 3];

    // RGB CHANNELS
    if (!showR) r = 0;
    if (!showG) g = 0;
    if (!showB) b = 0;

    // ALPHA CHANNEL
    if (!showA) {
      // Opaque mode: ignore alpha from source, but keep RGB channel masks.
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = 255;
      continue;
    }

    if (alphaLayerOnly) {
      // Render alpha as a visible grayscale layer (opaque).
      out.data[i] = a;
      out.data[i + 1] = a;
      out.data[i + 2] = a;
      out.data[i + 3] = 255;
      continue;
    }

    // normal RGBA (alpha preserved)
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

  const fx = x > 0.008856 ? Math.cbrt(x) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? Math.cbrt(z) : 7.787 * z + 16 / 116;

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}
