import { removeBackground } from "@imgly/background-removal-node";
import { writeFile } from "fs/promises";
import path from "path";

const inputPath = path.resolve("public/person-original.png");
const outputPath = path.resolve("public/person.png");

const blob = await removeBackground(`file://${inputPath}`);
const buffer = Buffer.from(await blob.arrayBuffer());
await writeFile(outputPath, buffer);

console.log(`Wrote ${outputPath}`);
