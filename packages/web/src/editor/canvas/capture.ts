import type Konva from "konva";
import type { BaseElement } from "../../store/editor-store.ts";
import { processImage, type ImageBitmap1bpp, type RawImageData } from "@thermoprint/core";

/**
 * Captures the label paper + elements layer at 1:1 pixel resolution.
 * Temporarily hides selection handles, off-canvas ghost indicators, and the raster preview overlay
 * so they are never captured in printed output, thumbnails, or raster previews.
 */
export function captureLabel(
  stage: Konva.Stage,
  widthPx: number,
  heightPx: number,
): HTMLCanvasElement {
  // The paper+elements layer is the second layer (index 1)
  const layer = stage.getLayers()[1];
  if (!layer) {
    const dummy = document.createElement("canvas");
    dummy.width = widthPx;
    dummy.height = heightPx;
    return dummy;
  }

  const origStageW = stage.width();
  const origStageH = stage.height();
  const origLayerX = layer.x();
  const origLayerY = layer.y();
  const displayScale = layer.scaleX();

  const displayW = widthPx * displayScale;
  const displayH = heightPx * displayScale;

  // Temporarily hide selection handles, off-canvas ghost warnings, and raster preview
  const selOverlay = stage.findOne("#canvas-selection-overlay");
  const ghostOverlay = stage.findOne("#canvas-off-screen-ghosts");
  const rasterOverlay = stage.findOne("#canvas-raster-preview");
  const wasSelVisible = selOverlay?.visible();
  const wasGhostVisible = ghostOverlay?.visible();
  const wasRasterVisible = rasterOverlay?.visible();

  if (selOverlay) selOverlay.visible(false);
  if (ghostOverlay) ghostOverlay.visible(false);
  if (rasterOverlay) rasterOverlay.visible(false);

  // Temporarily resize so toCanvas captures only the label
  stage.width(displayW);
  stage.height(displayH);
  layer.x(0);
  layer.y(0);

  const canvas = stage.toCanvas({ pixelRatio: 1 / displayScale });

  // Restore overlays
  if (selOverlay && wasSelVisible !== undefined) selOverlay.visible(wasSelVisible);
  if (ghostOverlay && wasGhostVisible !== undefined) ghostOverlay.visible(wasGhostVisible);
  if (rasterOverlay && wasRasterVisible !== undefined) rasterOverlay.visible(wasRasterVisible);

  // Restore stage and layer geometry
  stage.width(origStageW);
  stage.height(origStageH);
  layer.x(origLayerX);
  layer.y(origLayerY);
  stage.batchDraw();

  return canvas;
}

export function rotateCanvas90CW(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.height;
  dst.height = src.width;
  const ctx = dst.getContext("2d")!;
  ctx.translate(dst.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return dst;
}

export interface PrintheadBitmapOptions {
  dither?: string;
  threshold?: number;
  rotate90?: boolean;
}

/**
 * Generates the unified 1-bit thermal printhead bitmap for both preview and printing.
 * Non-raster elements with gray fills (rectangles, lines, text) are ALWAYS dithered via
 * Bayer 8x8 ordered halftone, preventing chaotic error diffusion worms.
 * Photographic images are dithered using the user-selected algorithm (Atkinson, Floyd-S, etc.).
 */
export function capturePrintheadBitmap(
  stage: Konva.Stage,
  widthPx: number,
  heightPx: number,
  elements: BaseElement[],
  options: PrintheadBitmapOptions = {},
): ImageBitmap1bpp {
  const { dither = "floyd-steinberg", threshold = 128, rotate90 = false } = options;

  // Identify photographic (raster) images vs vector/icon elements
  const photoElements = elements.filter(
    (el) => el.type === "image" && !el.props.iconName
  );
  const hasPhotos = photoElements.length > 0;

  // Case 1: No photos, or global dither is already Bayer: process entire canvas via Bayer 8x8
  if (!hasPhotos || dither === "bayer") {
    let canvas = captureLabel(stage, widthPx, heightPx);
    if (rotate90) canvas = rotateCanvas90CW(canvas);
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const raw: RawImageData = {
      data: imgData.data,
      width: canvas.width,
      height: canvas.height,
    };
    return processImage(raw, { dither: "bayer", threshold });
  }

  // Case 2: Photo images exist AND dither is Atkinson, Floyd-Steinberg, or Threshold
  // Pass 1: Capture non-photo layer with photo elements hidden -> Bayer 8x8
  const photoNodes = photoElements
    .map((el) => stage.findOne(`#${el.id}`))
    .filter(Boolean) as Konva.Node[];

  photoNodes.forEach((node) => node.visible(false));
  let nonPhotoCanvas = captureLabel(stage, widthPx, heightPx);
  photoNodes.forEach((node) => node.visible(true));

  if (rotate90) nonPhotoCanvas = rotateCanvas90CW(nonPhotoCanvas);
  const npCtx = nonPhotoCanvas.getContext("2d")!;
  const npImgData = npCtx.getImageData(0, 0, nonPhotoCanvas.width, nonPhotoCanvas.height);
  const npRaw: RawImageData = {
    data: npImgData.data,
    width: nonPhotoCanvas.width,
    height: nonPhotoCanvas.height,
  };
  const nonPhotoBitmap = processImage(npRaw, { dither: "bayer", threshold });

  // Pass 2: Capture photo elements only with non-photo elements and paper hidden
  const paperNode = stage.findOne("#canvas-label-paper");
  const wasPaperVisible = paperNode?.visible();
  if (paperNode) paperNode.visible(false);

  const nonPhotoNodes = elements
    .filter((el) => el.type !== "image" || Boolean(el.props.iconName))
    .map((el) => stage.findOne(`#${el.id}`))
    .filter(Boolean) as Konva.Node[];

  nonPhotoNodes.forEach((node) => node.visible(false));
  let photoCanvas = captureLabel(stage, widthPx, heightPx);
  nonPhotoNodes.forEach((node) => node.visible(true));
  if (paperNode && wasPaperVisible !== undefined) paperNode.visible(wasPaperVisible);

  if (rotate90) photoCanvas = rotateCanvas90CW(photoCanvas);
  const pCtx = photoCanvas.getContext("2d")!;
  const pImgData = pCtx.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
  const pRaw: RawImageData = {
    data: pImgData.data,
    width: photoCanvas.width,
    height: photoCanvas.height,
  };
  const photoBitmap = processImage(pRaw, { dither: dither as any, threshold });

  // Composite: where photo has opacity (alpha > 10), use photoBitmap; elsewhere use nonPhotoBitmap (Bayer)
  const finalBitmap: ImageBitmap1bpp = {
    data: new Uint8Array(nonPhotoBitmap.data.length),
    width: nonPhotoBitmap.width,
    height: nonPhotoBitmap.height,
    bytesPerRow: nonPhotoBitmap.bytesPerRow,
  };

  const w = nonPhotoBitmap.width;
  const h = nonPhotoBitmap.height;
  const pData = pImgData.data;

  for (let y = 0; y < h; y++) {
    const rowStart = y * nonPhotoBitmap.bytesPerRow;
    const pxRowStart = y * w * 4;
    for (let x = 0; x < w; x++) {
      const byteIdx = rowStart + (x >> 3);
      const bitIdx = 7 - (x & 7);
      const alpha = pData[pxRowStart + x * 4 + 3];

      const bit =
        alpha > 10
          ? (photoBitmap.data[byteIdx] >> bitIdx) & 1
          : (nonPhotoBitmap.data[byteIdx] >> bitIdx) & 1;

      if (bit) {
        finalBitmap.data[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  return finalBitmap;
}
