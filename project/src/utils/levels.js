export function buildLevelsLUT(black, white, gamma = 1) {
  const lut = new Array(256);

  const range = white - black || 1;

  for (let i = 0; i < 256; i++) {
    let normalized = (i - black) / range;

    // clamp
    normalized = Math.min(1, Math.max(0, normalized));

    // gamma correction
    normalized = Math.pow(normalized, 1 / gamma);

    lut[i] = Math.round(normalized * 255);
  }

  return lut;
}

export function applyLevels(imageData, settings = {}) {
  const result = new ImageData(imageData.width, imageData.height);

  const src = imageData.data;
  const dst = result.data;

  const get = (ch) => ({
    black: settings[ch]?.black ?? 0,
    white: settings[ch]?.white ?? 255,
    gamma: settings[ch]?.gamma ?? 1,
  });

  const luts = {
    master: buildLevelsLUT(
      get("master").black,
      get("master").white,
      get("master").gamma
    ),
    r: buildLevelsLUT(
      get("r").black,
      get("r").white,
      get("r").gamma
    ),
    g: buildLevelsLUT(
      get("g").black,
      get("g").white,
      get("g").gamma
    ),
    b: buildLevelsLUT(
      get("b").black,
      get("b").white,
      get("b").gamma
    ),
    a: buildLevelsLUT(
      get("a").black,
      get("a").white,
      get("a").gamma
    ),
  };

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const a = src[i + 3];

    const mr = luts.master[r];
    const mg = luts.master[g];
    const mb = luts.master[b];

    dst[i] = luts.r[mr];
    dst[i + 1] = luts.g[mg];
    dst[i + 2] = luts.b[mb];
    dst[i + 3] = luts.a[a];
  }

  return result;
}

export function calculateHistogram(imageData, channel = "master", log = false) {
  const hist = new Array(256).fill(0);

  if (!imageData) return hist;

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let value;

    switch (channel) {
      case "r":
        value = data[i];
        break;
      case "g":
        value = data[i + 1];
        break;
      case "b":
        value = data[i + 2];
        break;
      case "a":
        value = data[i + 3];
        break;
      default:
        value = Math.round(
          0.299 * data[i] +
          0.587 * data[i + 1] +
          0.114 * data[i + 2]
        );
    }

    hist[value]++;
  }

  if (log) {
    for (let i = 0; i < 256; i++) {
      hist[i] = Math.log(1 + hist[i]);
    }
  }

  return hist;
}

