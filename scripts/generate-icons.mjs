import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const jobs = [
  { src: "icon-source.svg", out: "icon-192.png", size: 192 },
  { src: "icon-source.svg", out: "icon-512.png", size: 512 },
  { src: "icon-source-maskable.svg", out: "icon-maskable-512.png", size: 512 },
];

for (const job of jobs) {
  await sharp(path.join(__dirname, job.src))
    .resize(job.size, job.size)
    .png()
    .toFile(path.join(outDir, job.out));
  console.log("Généré:", job.out);
}
