// convert-icons.js
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

async function convert() {
  try {
    console.log("🚀 Iniciando conversão de ícones SVG para PNG...");

    const faviconSvgPath = path.join(publicDir, "favicon.svg");
    const faviconUnreadSvgPath = path.join(publicDir, "favicon-unread.svg");

    // 1. Gera favicon.png padrão (512x512) para favicon e manifestos
    await sharp(faviconSvgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, "icon-192.png"));
    
    await sharp(faviconSvgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, "icon-512.png"));

    // 2. Gera ícone de não lidas em PNG
    await sharp(faviconUnreadSvgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, "icon-unread-192.png"));

    await sharp(faviconUnreadSvgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, "icon-unread-512.png"));

    console.log("✅ Todos os ícones PNG (192px e 512px) foram gerados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao converter ícones:", error);
  }
}

convert();
