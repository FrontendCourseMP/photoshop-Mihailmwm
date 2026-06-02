// Декодирование GB7 файла в ImageData
export function decodeGB7(buffer) {
  // Создаем DataView для чтения бинарных данных
  const view = new DataView(buffer);

  // Проверяем сигнатуру файла "GB7"
  if (
    view.getUint8(0) !== 0x47 ||
    view.getUint8(1) !== 0x42 ||
    view.getUint8(2) !== 0x37
  ) {
    throw new Error("Invalid GB7 file");
  }

  // Читаем размеры изображения
  const width = view.getUint16(6);
  const height = view.getUint16(8);
  // Проверяем наличие маски прозрачности
  // Первый бит байта флагов
  const hasMask = (view.getUint8(5) & 1) !== 0;
  // Создаем объект ImageData для результата
  const imageData = new ImageData(width, height);
  // Начало пиксельных данных после заголовка
  let offset = 12;
  // Проходим по всем пикселям
  for (let i = 0; i < width * height; i++) {
    // Читаем байт пикселя
    const byte = view.getUint8(offset++);
    // Нижние 7 бит — оттенок серого
    const gray = byte & 0x7f;
    // Старший бит — маска прозрачности
    const mask = byte >> 7;
    // Преобразуем диапазон 0-127 в 0-255
    const value = Math.floor((gray / 127) * 255);
    // Индекс RGBA массива
    const idx = i * 4;
    // Записываем grayscale в RGB
    imageData.data[idx] = value; //R
    imageData.data[idx + 1] = value;//G
    imageData.data[idx + 2] = value;//B
    // Устанавливаем альфа-канал
    imageData.data[idx + 3] = hasMask
      ? mask
        ? 255 // непрозрачный
        : 0 // прозрачный
      : 255; // если маски нет — всегда непрозрачный
  }
  // Возвращаем результат
  return { imageData, width, height, hasMask };
}
// Кодирование canvas в формат GB7
export function encodeGB7(canvas) {
  // Получаем 2D контекст canvas
  const ctx = canvas.getContext("2d");

  const { width, height } = canvas;
  // Получаем пиксельные данные изображения
  const imageData = ctx.getImageData(0, 0, width, height);
  // Создаем буфер:
  // 12 байт заголовка + по 1 байту на пиксель
  const buffer = new ArrayBuffer(12 + width * height);
  // DataView для записи бинарных данных
  const view = new DataView(buffer);

  // Сигнатура "GB7"
  view.setUint8(0, 0x47);
  view.setUint8(1, 0x42);
  view.setUint8(2, 0x37);
  // Версия / служебный байт
  view.setUint8(3, 0x1d);
  // Неизвестное поле / версия формата
  view.setUint8(4, 0x01);
  // Флаги (маска отключена)
  view.setUint8(5, 0x00);
  // Размеры изображени
  view.setUint16(6, width);
  view.setUint16(8, height);
  // Зарезервированное поле
  view.setUint16(10, 0);
  // Смещение к пиксельным данным
  let offset = 12;
  // Кодируем каждый пиксель
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    // RGB компоненты
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    // Переводим RGB в grayscale
    // Среднее значение RGB -> диапазон 0-127
    const gray = Math.floor(((r + g + b) / 3 / 255) * 127);
    // Записываем байт пикселя
    // Пока без поддержки alpha/mask
    view.setUint8(offset++, gray);
  }
  // Возвращаем Blob для скачивания/сохранения
  return new Blob([buffer], {
    type: "application/octet-stream",
  });
}
