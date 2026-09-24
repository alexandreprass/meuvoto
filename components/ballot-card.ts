export type BallotCardItem = {
  name: string;
  number: string;
  office: string;
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
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
  const rowHeight = 196;
  const top = 350;
  const height = top + items.length * rowHeight + 72;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#f3f7f1");
  background.addColorStop(1, "#e5eee6");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0e5b43";
  ctx.fillRect(0, 0, 18, height);

  ctx.fillStyle = "#0e5b43";
  ctx.font = "700 26px Segoe UI, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("MEUVOTO.ORG", 72, 82);
  ctx.fillStyle = "#15251e";
  ctx.font = "700 58px Segoe UI, Arial, sans-serif";
  ctx.fillText("Minhas escolhas", 72, 160);
  ctx.font = "400 28px Segoe UI, Arial, sans-serif";
  ctx.fillStyle = "#5d6d64";
  ctx.fillText("Candidatos para as eleições de 2026", 72, 208);
  ctx.fillStyle = "#b5c9bd";
  roundedRect(ctx, 72, 246, 936, 2, 1);
  ctx.fill();

  const images = await Promise.all(items.map((item) => loadImage(item.photoUrl).catch(() => null)));
  items.forEach((item, index) => {
    const rowY = top + index * rowHeight;
    ctx.save();
    ctx.shadowColor = "rgba(20, 45, 32, 0.08)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    roundedRect(ctx, 72, rowY, 936, 166, 24);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#e9f3ed";
    ctx.beginPath();
    ctx.arc(164, rowY + 83, 58, 0, Math.PI * 2);
    ctx.fill();
    const image = images[index];
    if (image) coverCircle(ctx, image, 106, rowY + 25, 116);

    ctx.textAlign = "left";
    ctx.fillStyle = "#398064";
    ctx.font = "700 20px Segoe UI, Arial, sans-serif";
    ctx.fillText(item.office.toLocaleUpperCase("pt-BR"), 248, rowY + 54);
    ctx.fillStyle = "#15251e";
    ctx.font = "700 36px Segoe UI, Arial, sans-serif";
    const name = item.name.length > 31 ? `${item.name.slice(0, 29)}…` : item.name;
    ctx.fillText(name, 248, rowY + 101);
    ctx.fillStyle = "#5d6d64";
    ctx.font = "500 25px Segoe UI, Arial, sans-serif";
    ctx.fillText(`Número ${item.number}`, 248, rowY + 137);

    ctx.textAlign = "right";
    ctx.fillStyle = "#d9e9df";
    ctx.font = "700 44px Segoe UI, Arial, sans-serif";
    ctx.fillText(String(index + 1).padStart(2, "0"), 970, rowY + 96);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#708278";
  ctx.font = "500 20px Segoe UI, Arial, sans-serif";
  ctx.fillText("Conheça, compare e escolha com informação.", 72, height - 30);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("imagem");
  return blob;
}
