import { getPartyLogoPath } from "@/lib/party-brand";
import { assetUrl } from "@/lib/asset-url";

export type BallotCardItem = {
  name: string;
  number: string;
  party: string;
  office: string;
  photoUrl: string;
  fallbackPhotoUrl?: string;
};

async function loadImage(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) {
        if (response.status < 500 && response.status !== 429) throw new Error("foto");
        throw new Error("foto temporariamente indisponível");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      try {
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("foto"));
          image.src = objectUrl;
        });
        return image;
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
      }
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError ?? new Error("foto");
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
  ctx.save();
  ctx.strokeStyle = "rgba(14, 91, 67, 0.08)";
  ctx.lineWidth = 5;
  for (let ring = 0; ring < 5; ring += 1) {
    ctx.beginPath();
    ctx.arc(width - 15, 80, 110 + ring * 58, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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

  const images: Array<HTMLImageElement | null> = [];
  for (const item of items) {
    let image: HTMLImageElement | null = null;
    try {
      image = await loadImage(item.photoUrl);
    } catch {
      if (item.fallbackPhotoUrl) image = await loadImage(item.fallbackPhotoUrl).catch(() => null);
    }
    images.push(image);
  }
  const partyLogos = await Promise.all(items.map((item) => loadImage(new URL(assetUrl(getPartyLogoPath(item.party)), window.location.origin).toString()).catch(() => null)));
  items.forEach((item, index) => {
    const rowY = top + index * rowHeight;
    ctx.save();
    ctx.shadowColor = "rgba(20, 45, 32, 0.08)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    roundedRect(ctx, 72, rowY, 936, 166, 24);
    ctx.fillStyle = "#fcfefc";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#cbded1";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "#d6e8dc";
    ctx.lineWidth = 3;
    for (const radius of [68, 75]) {
      ctx.beginPath();
      ctx.arc(164, rowY + 83, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
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
    ctx.fillStyle = "#0e5b43";
    ctx.font = "800 42px Segoe UI, Arial, sans-serif";
    ctx.fillText(item.number, 248, rowY + 151);

    const partyLogo = partyLogos[index];
    if (partyLogo) {
      const scale = Math.min(76 / partyLogo.naturalWidth, 76 / partyLogo.naturalHeight);
      const logoWidth = partyLogo.naturalWidth * scale;
      const logoHeight = partyLogo.naturalHeight * scale;
      ctx.drawImage(partyLogo, 912 - logoWidth / 2, rowY + 83 - logoHeight / 2, logoWidth, logoHeight);
    } else {
      ctx.fillStyle = "#f3f7f1";
      roundedRect(ctx, 870, rowY + 56, 84, 54, 12);
      ctx.fill();
      ctx.strokeStyle = "#cbded1";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#52665a";
      ctx.textAlign = "center";
      ctx.font = "700 19px Segoe UI, Arial, sans-serif";
      ctx.fillText(item.party.toLocaleUpperCase("pt-BR"), 912, rowY + 89, 76);
    }
    ctx.textAlign = "right";
    ctx.fillStyle = "#708278";
    ctx.font = "700 18px Segoe UI, Arial, sans-serif";
    ctx.fillText(String(index + 1).padStart(2, "0"), 972, rowY + 31);
  });

  [...images, ...partyLogos].forEach((image) => {
    if (image) URL.revokeObjectURL(image.src);
  });

  ctx.textAlign = "left";
  ctx.fillStyle = "#708278";
  ctx.font = "500 20px Segoe UI, Arial, sans-serif";
  ctx.fillText("Conheça, compare e escolha com informação.", 72, height - 30);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("imagem");
  return blob;
}
