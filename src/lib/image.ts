/** Сжатие изображения в dataURL до допустимых размеров для localStorage/Storage */
export async function compressImage(
  file: File,
  maxSide = 1400,
  quality = 0.72,
  maxBytes = 1_200_000,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Файл не является изображением");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Файл слишком большой (до 20 МБ)");
  }
  const dataUrl = await readAsDataURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Не удалось прочитать изображение"));
    i.src = dataUrl;
  });

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);

  let out = await render(img, w, h, quality);
  // при переполнении localStorage-квоты — прогрессивно сжимаем сильнее
  let q = quality;
  while (out.length > maxBytes * 1.38 && q > 0.32) {
    q -= 0.12;
    out = await render(img, w, h, q);
  }
  if (out.length > maxBytes * 1.38) {
    out = await render(img, Math.round(w * 0.7), Math.round(h * 0.7), 0.4);
  }
  return out;
}

function render(
  img: HTMLImageElement,
  w: number,
  h: number,
  q: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", q);
}

function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Ошибка чтения файла"));
    r.readAsDataURL(file);
  });
}
