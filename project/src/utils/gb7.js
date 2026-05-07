export function decodeGB7(buffer) {
  const view = new DataView(buffer);

  if (
    view.getUint8(0) !== 0x47 ||
    view.getUint8(1) !== 0x42 ||
    view.getUint8(2) !== 0x37
  ) {
    throw new Error("Invalid GB7 file");
  }

  const width = view.getUint16(6);
  const height = view.getUint16(8);

  const hasMask = view.getUint8(5) & 1;

  const imageData = new ImageData(width, height);

  let offset = 12;

  for (let i = 0; i < width * height; i++) {
    const byte = view.getUint8(offset++);

    const gray = byte & 0x7f;
    const mask = byte >> 7;

    const value = Math.floor((gray / 127) * 255);

    const idx = i * 4;

    imageData.data[idx] = value;
    imageData.data[idx + 1] = value;
    imageData.data[idx + 2] = value;

    imageData.data[idx + 3] = hasMask
      ? mask
        ? 255
        : 0
      : 255;
  }

  return { imageData, width, height };
}

export function encodeGB7(canvas) {
  const ctx = canvas.getContext("2d");

  const { width, height } = canvas;

  const imageData = ctx.getImageData(0, 0, width, height);

  const buffer = new ArrayBuffer(12 + width * height);

  const view = new DataView(buffer);

  // signature
  view.setUint8(0, 0x47);
  view.setUint8(1, 0x42);
  view.setUint8(2, 0x37);
  view.setUint8(3, 0x1d);

  view.setUint8(4, 0x01);
  view.setUint8(5, 0x00);

  view.setUint16(6, width);
  view.setUint16(8, height);
  view.setUint16(10, 0);

  let offset = 12;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;

    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];

    const gray = Math.floor(((r + g + b) / 3 / 255) * 127);

    view.setUint8(offset++, gray);
  }

  return new Blob([buffer], {
    type: "application/octet-stream",
  });
}