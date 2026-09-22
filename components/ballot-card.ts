export type BallotCardItem = {
  name: string;
  number: string;
  photoUrl: string;
};

async function loadImage(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("foto");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("foto"));
      image.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function coverCircle(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, size: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (size - drawnWidth) / 2, y + (size - drawnHeight) / 2, drawnWidth, drawnHeight);
  ctx.restore();
}

export async function renderBallotCard(items: BallotCardItem[]) {
  const width = 1080;
  const rowHeight = 210;
  const height = 280 + items.length * rowHeight + 72;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "700 54px Segoe UI, Arial, sans-serif";
  ctx.fillText("MEUS CANDIDATOS", width / 2, 110);
  ctx.fillText("PARA ELEIÇÃO DE 2026", width / 2, 180);

  const images = await Promise.all(items.map((item) => loadImage(item.photoUrl).catch(() => null)));
  items.forEach((item, index) => {
    const top = 250 + index * rowHeight;
    const image = images[index];
    ctx.fillStyle = "#f4f4f5";
    ctx.beginPath();
    ctx.arc(156, top + 80, 72, 0, Math.PI * 2);
    ctx.fill();
    if (image) coverCircle(ctx, image, 84, top + 8, 144);

    ctx.fillStyle = "#111111";
    ctx.textAlign = "left";
    ctx.font = "700 48px Segoe UI, Arial, sans-serif";
    ctx.fillText(item.name, 270, top + 78);
    ctx.font = "600 36px Segoe UI, Arial, sans-serif";
    ctx.fillStyle = "#525252";
    ctx.fillText(item.number, 270, top + 128);
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("imagem");
  return blob;
}
