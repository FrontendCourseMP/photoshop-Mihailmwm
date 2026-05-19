export function computeHistogram(imageData, channel = "luma") {
  const hist = new Array(256).fill(0);

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let v;

    if (channel === "r") v = data[i];
    else if (channel === "g") v = data[i + 1];
    else if (channel === "b") v = data[i + 2];
    else if (channel === "a") v = data[i + 3];
    else {
      v = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }

    hist[Math.floor(v)]++;
  }

  return hist;
}