import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;

const pairs = process.argv.slice(2);
if (pairs.length === 0 || pairs.length % 2 !== 0) {
  throw new Error('Usage: node pack-gltf-as-glb.mjs <source.gltf> <target.glb> [...]');
}

for (let index = 0; index < pairs.length; index += 2) {
  await packGltf(pairs[index], pairs[index + 1]);
}

async function packGltf(sourcePath, targetPath) {
  const source = resolve(sourcePath);
  const target = resolve(targetPath);
  const gltf = JSON.parse(await readFile(source, 'utf8'));
  if (!Array.isArray(gltf.buffers) || gltf.buffers.length !== 1) {
    throw new Error(`${sourcePath} must contain exactly one external buffer`);
  }
  const bufferUri = gltf.buffers[0].uri;
  if (typeof bufferUri !== 'string' || bufferUri.startsWith('data:')) {
    throw new Error(`${sourcePath} does not reference an external BIN file`);
  }

  let binary = await readFile(resolve(dirname(source), bufferUri));
  const imageViews = new Map();
  gltf.bufferViews ??= [];
  for (const image of gltf.images ?? []) {
    if (typeof image.uri !== 'string' || image.uri.startsWith('data:')) {
      continue;
    }
    let bufferView = imageViews.get(image.uri);
    if (bufferView === undefined) {
      const imageBytes = await readFile(resolve(dirname(source), image.uri));
      binary = padBuffer(binary, 4, 0);
      bufferView = gltf.bufferViews.length;
      gltf.bufferViews.push({
        buffer: 0,
        byteOffset: binary.length,
        byteLength: imageBytes.length,
      });
      binary = Buffer.concat([binary, imageBytes]);
      imageViews.set(image.uri, bufferView);
    }
    image.bufferView = bufferView;
    image.mimeType ??= mimeTypeFor(image.uri);
    delete image.uri;
  }

  gltf.buffers[0] = { byteLength: binary.length };
  const json = padBuffer(Buffer.from(JSON.stringify(gltf)), 4, 0x20);
  const bin = padBuffer(binary, 4, 0);
  const totalLength = 12 + 8 + json.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(GLB_VERSION, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = chunkHeader(json.length, JSON_CHUNK_TYPE);
  const binHeader = chunkHeader(bin.length, BIN_CHUNK_TYPE);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
}

function chunkHeader(length, type) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(length, 0);
  header.writeUInt32LE(type, 4);
  return header;
}

function padBuffer(buffer, alignment, value) {
  const padding = (alignment - (buffer.length % alignment)) % alignment;
  return padding === 0
    ? buffer
    : Buffer.concat([buffer, Buffer.alloc(padding, value)]);
}

function mimeTypeFor(uri) {
  const extension = extname(uri).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') {
    return 'image/jpeg';
  }
  if (extension === '.webp') {
    return 'image/webp';
  }
  return 'image/png';
}
