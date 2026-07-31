import { cp, mkdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";

const root = process.cwd();
const source = resolve(root, "public");
const target = resolve(root, "dist");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const rawAssetSegment = `${sep}assets${sep}raw`;
await cp(source, target, {
  recursive: true,
  filter: (sourcePath) => !sourcePath.includes(rawAssetSegment),
});

console.log("Built BLACKWING // AFTERBURN to dist/");
