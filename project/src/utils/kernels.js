export const kernelPresets = {
  identity: {
    label: "Тождественное отображение",
    kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  },
  sharpen: {
    label: "Повышение резкости",
    kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  },
  gaussian3: {
    label: "Фильтр Гаусса (3×3)",
    kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1],
  },
  boxBlur: {
    label: "Прямоугольное размытие (3×3)",
    kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  prewittX: {
    label: "Прюитт: горизонтальные границы",
    kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1],
  },
  prewittY: {
    label: "Прюитт: вертикальные границы",
    kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1],
  },
};

export const edgeModes = {
  black: "Заполнение чёрным",
  white: "Заполнение белым",
  copy: "Копирование края",
};

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function kernelSum(kernel9) {
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(kernel9[i]) || 0;
  return sum;
}

function computeDivisor(kernel9) {
  // Auto-normalization for kernels with meaningful sum (Gaussian/box/sharpen).
  // For Prewitt sums are 0, so we don't divide.
  const sum = kernelSum(kernel9);
  if (Math.abs(sum) < 1e-9) return 1;
  return sum;
}

function getChannelValue(source, x, y, channelIndex, edgeMode, width, height) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    if (edgeMode === "white") return 255;
    // black or fallback
    return 0;
  }
  return source[(y * width + x) * 4 + channelIndex];
}

function getChannelValueCopyEdge(source, x, y, channelIndex, width, height) {
  const cx = x < 0 ? 0 : x >= width ? width - 1 : x;
  const cy = y < 0 ? 0 : y >= height ? height - 1 : y;
  return source[(cy * width + cx) * 4 + channelIndex];
}

function getChannelValueForEdge(source, x, y, channelIndex, edgeMode, width, height) {
  if (edgeMode === "copy") {
    return getChannelValueCopyEdge(source, x, y, channelIndex, width, height);
  }
  return getChannelValue(source, x, y, channelIndex, edgeMode, width, height);
}

export function applyKernelToImageData(imageData, kernel9, channelsMask, edgeMode) {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const dst = out.data;

  const divisor = computeDivisor(kernel9);

  const applyR = !!channelsMask.r;
  const applyG = !!channelsMask.g;
  const applyB = !!channelsMask.b;
  const applyA = !!channelsMask.a;

  const kernel = new Array(9);
  for (let i = 0; i < 9; i++) kernel[i] = Number(kernel9[i]) || 0;

  // kernel coordinates:
  // k0 k1 k2
  // k3 k4 k5
  // k6 k7 k8
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const outBase = (y * width + x) * 4;
      const srcBase = outBase;

      // Default: copy original for channels not applied
      dst[outBase] = data[srcBase];
      dst[outBase + 1] = data[srcBase + 1];
      dst[outBase + 2] = data[srcBase + 2];
      dst[outBase + 3] = data[srcBase + 3];

      // For each channel we compute convolution only if selected.
      // Convolution is per-channel, no cross-mixing.
      if (applyR || applyG || applyB || applyA) {
        // Precompute 9 sample values per channel only when needed.
        // (Given small kernel size, simplest approach is per-channel loops.)
        if (applyR) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 0, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 0, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 0, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 0, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 0, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 0, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 0, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 0, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 0, edgeMode, width, height);

          dst[outBase] = clampInt(sum / divisor, 0, 255);
        }

        if (applyG) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 1, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 1, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 1, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 1, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 1, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 1, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 1, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 1, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 1, edgeMode, width, height);

          dst[outBase + 1] = clampInt(sum / divisor, 0, 255);
        }

        if (applyB) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 2, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 2, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 2, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 2, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 2, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 2, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 2, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 2, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 2, edgeMode, width, height);

          dst[outBase + 2] = clampInt(sum / divisor, 0, 255);
        }

        if (applyA) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 3, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 3, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 3, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 3, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 3, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 3, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 3, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 3, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 3, edgeMode, width, height);

          dst[outBase + 3] = clampInt(sum / divisor, 0, 255);
        }
      }
    }
  }

  return out;
}

export async function applyKernelToImageDataAsync(
  imageData,
  kernel9,
  channelsMask,
  edgeMode,
  {
    rowChunk = 24,
    signal,
    onProgress,
  } = {}
) {
  const { width, height, data } = imageData;
  const out = new ImageData(width, height);
  const dst = out.data;

  const divisor = computeDivisor(kernel9);

  const applyR = !!channelsMask.r;
  const applyG = !!channelsMask.g;
  const applyB = !!channelsMask.b;
  const applyA = !!channelsMask.a;

  const kernel = new Array(9);
  for (let i = 0; i < 9; i++) kernel[i] = Number(kernel9[i]) || 0;

  let canceled = false;
  const checkSignal = () => {
    if (!signal) return false;
    if (signal.aborted) return true;
    return false;
  };

  const maybeYield = async () => {
    // Yield to keep UI responsive.
    await new Promise((r) => setTimeout(r, 0));
  };

  for (let y = 0; y < height; y++) {
    if (checkSignal()) {
      canceled = true;
      break;
    }

    for (let x = 0; x < width; x++) {
      const outBase = (y * width + x) * 4;
      const srcBase = outBase;

      // Copy original channels by default
      dst[outBase] = data[srcBase];
      dst[outBase + 1] = data[srcBase + 1];
      dst[outBase + 2] = data[srcBase + 2];
      dst[outBase + 3] = data[srcBase + 3];

      // Convolution for selected channels
      if (applyR || applyG || applyB || applyA) {
        if (applyR) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 0, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 0, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 0, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 0, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 0, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 0, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 0, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 0, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 0, edgeMode, width, height);

          dst[outBase] = clampInt(sum / divisor, 0, 255);
        }

        if (applyG) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 1, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 1, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 1, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 1, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 1, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 1, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 1, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 1, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 1, edgeMode, width, height);

          dst[outBase + 1] = clampInt(sum / divisor, 0, 255);
        }

        if (applyB) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 2, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 2, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 2, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 2, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 2, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 2, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 2, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 2, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 2, edgeMode, width, height);

          dst[outBase + 2] = clampInt(sum / divisor, 0, 255);
        }

        if (applyA) {
          let sum = 0;
          sum += kernel[0] * getChannelValueForEdge(data, x - 1, y - 1, 3, edgeMode, width, height);
          sum += kernel[1] * getChannelValueForEdge(data, x, y - 1, 3, edgeMode, width, height);
          sum += kernel[2] * getChannelValueForEdge(data, x + 1, y - 1, 3, edgeMode, width, height);
          sum += kernel[3] * getChannelValueForEdge(data, x - 1, y, 3, edgeMode, width, height);
          sum += kernel[4] * getChannelValueForEdge(data, x, y, 3, edgeMode, width, height);
          sum += kernel[5] * getChannelValueForEdge(data, x + 1, y, 3, edgeMode, width, height);
          sum += kernel[6] * getChannelValueForEdge(data, x - 1, y + 1, 3, edgeMode, width, height);
          sum += kernel[7] * getChannelValueForEdge(data, x, y + 1, 3, edgeMode, width, height);
          sum += kernel[8] * getChannelValueForEdge(data, x + 1, y + 1, 3, edgeMode, width, height);

          dst[outBase + 3] = clampInt(sum / divisor, 0, 255);
        }
      }
    }

    if (onProgress) {
      const p = height <= 1 ? 1 : y / (height - 1);
      onProgress(p);
    }

    if ((y + 1) % rowChunk === 0) {
      await maybeYield();
    }
  }

  if (canceled) return null;
  return out;
}

export function createDefaultKernelSettings() {
  return {
    presetKey: "identity",
    kernel9: [...(kernelPresets.identity?.kernel ?? [0, 0, 0, 0, 1, 0, 0, 0, 0])],
    edgeMode: "copy", // black | white | copy
    channelsMask: { r: true, g: true, b: true, a: false },
  };
}

export function isIdentityKernel(kernel9) {
  const k = kernel9 ?? [];
  return (
    k.length === 9 &&
    Number(k[0]) === 0 &&
    Number(k[1]) === 0 &&
    Number(k[2]) === 0 &&
    Number(k[3]) === 0 &&
    Number(k[4]) === 1 &&
    Number(k[5]) === 0 &&
    Number(k[6]) === 0 &&
    Number(k[7]) === 0 &&
    Number(k[8]) === 0
  );
}
