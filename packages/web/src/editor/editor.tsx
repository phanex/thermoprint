import { useRef, useCallback, useEffect } from "react";
import type Konva from "konva";
import { TopChrome } from "./top-chrome/top-chrome.tsx";
import { Canvas } from "./canvas/canvas.tsx";
import { Inspector } from "./inspector/inspector.tsx";
import { StatusBar } from "./status-bar.tsx";
import { Dock } from "./dock/dock.tsx";
import { PrintProgressToast } from "./print-progress-toast.tsx";
import { Palette } from "./palette/palette.tsx";
import { useKeyboardShortcuts, setPrintFn } from "../lib/keyboard.ts";
import { useEditorV2Store, registerThumbnailGetter } from "../store/editor-store.ts";
import { usePrinterStore } from "../store/printer-store.ts";
import { getPrinter, useWebBluetooth } from "../hooks/use-web-bluetooth.ts";
import { type RawImageData, extractPlaceholders } from "@thermoprint/core";
import { fitBatchElements } from "../label/dynamic-label.ts";
import { checkPrinterCompatibility } from "../label/label-sizes.ts";
import { type BatchItem } from "./top-chrome/print-button.tsx";
import { loadCsvFile } from "../lib/csv-loader.ts";

function captureLabel(
  stage: Konva.Stage,
  widthPx: number,
  heightPx: number,
): HTMLCanvasElement {
  // The paper+elements layer is the second layer (index 1)
  const layer = stage.getLayers()[1];
  const origStageW = stage.width();
  const origStageH = stage.height();
  const origLayerX = layer.x();
  const origLayerY = layer.y();
  const displayScale = layer.scaleX();

  const displayW = widthPx * displayScale;
  const displayH = heightPx * displayScale;

  // Temporarily resize so toCanvas captures only the label
  stage.width(displayW);
  stage.height(displayH);
  layer.x(0);
  layer.y(0);

  const canvas = stage.toCanvas({ pixelRatio: 1 / displayScale });

  // Restore
  stage.width(origStageW);
  stage.height(origStageH);
  layer.x(origLayerX);
  layer.y(origLayerY);
  stage.batchDraw();

  return canvas;
}

function rotateCanvas90CW(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.height;
  dst.height = src.width;
  const ctx = dst.getContext("2d")!;
  ctx.translate(dst.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return dst;
}

export function captureThumbnail(
  stage: Konva.Stage,
  widthPx: number,
  heightPx: number,
): string {
  try {
    const raw = captureLabel(stage, widthPx, heightPx);
    const maxW = 320;
    const maxH = 160;
    const scale = Math.min(1, maxW / raw.width, maxH / raw.height);
    if (scale < 1) {
      const thumb = document.createElement("canvas");
      thumb.width = Math.max(1, Math.round(raw.width * scale));
      thumb.height = Math.max(1, Math.round(raw.height * scale));
      const ctx = thumb.getContext("2d")!;
      ctx.drawImage(raw, 0, 0, thumb.width, thumb.height);
      return thumb.toDataURL("image/png");
    }
    return raw.toDataURL("image/png");
  } catch {
    return "";
  }
}

export function Editor() {
  const stageRef = useRef<Konva.Stage>(null);

  useKeyboardShortcuts();

  // Register thumbnail generator for library saves
  useEffect(() => {
    registerThumbnailGetter(() => {
      const stage = stageRef.current;
      if (!stage) return undefined;
      const { label } = useEditorV2Store.getState();
      const widthPx = label.widthPx || 320;
      const heightPx = label.heightPx || 96;
      return captureThumbnail(stage, widthPx, heightPx);
    });
    return () => {
      registerThumbnailGetter(null);
    };
  }, []);

  // Warn on close with unsaved changes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (useEditorV2Store.getState().currentLabelDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const { connect } = useWebBluetooth();

  const printBatch = useCallback(async (items: BatchItem[]): Promise<boolean> => {
    let printer = getPrinter();

    // Silent background reconnect if GATT dropped but we still have a peripheral
    if (!printer) {
      const peripheral = usePrinterStore.getState().peripheral;
      if (peripheral) {
        try {
          await connect(peripheral);
          printer = getPrinter();
        } catch (err) {
          console.error("Silent reconnect failed:", err);
          return false;
        }
      }
    }

    const stage = stageRef.current;
    if (!printer || !stage) return false;

    const total = items.length;
    const { label: baseLabel, printSettings, paperType, elements: originalElements } = useEditorV2Store.getState();

    // Validate that required CSV fields exist and are loaded before sending to printer
    const allCsv = new Set<string>();
    for (const el of originalElements) {
      if (el.type === "text" && typeof el.props.text === "string") {
        extractPlaceholders(el.props.text).fields.forEach((f) => allCsv.add(f));
      }
      if ((el.type === "barcode" || el.type === "qrcode") && typeof el.props.content === "string") {
        extractPlaceholders(el.props.content).fields.forEach((f) => allCsv.add(f));
      }
    }

    if (allCsv.size > 0) {
      const csvData = useEditorV2Store.getState().csvData;
      if (!csvData || csvData.length === 0) {
        alert("This template requires a CSV file. Please import CSV data to print.");
        return false;
      }
      const headers = new Set(Object.keys(csvData[0] || {}));
      const missing = Array.from(allCsv).filter((f) => !headers.has(f));
      if (missing.length > 0) {
        alert(`Missing required CSV column(s): ${missing.join(", ")}`);
        return false;
      }
    }

    const currentModel = usePrinterStore.getState().modelId ?? null;
    const compat = checkPrinterCompatibility(currentModel, baseLabel, paperType);
    if (!compat.compatible) {
      const ok = confirm(`Warning: ${compat.reason}\n\nDo you want to send this batch anyway?`);
      if (!ok) return false;
    }

    useEditorV2Store.getState().clearSelection();
    const duration = Math.min(15000, 1500 + total * 450);
    useEditorV2Store.getState().startPrint(total, duration);

    const temporal = (useEditorV2Store as any).temporal;
    temporal?.getState()?.pause();

    try {
      for (let i = 0; i < total; i++) {
        const item = items[i];
        const fitted = fitBatchElements(originalElements, baseLabel, {
          index: item.index,
          csvRow: item.csvRow,
        });

        if (fitted.shouldStop) {
          console.warn(`Batch print stopped early at item ${i + 1} due to counter stop condition.`);
          break;
        }

        useEditorV2Store.setState({
          elements: fitted.elements,
          label: fitted.label,
        });

        // Wait 1 animation frame for Konva to draw
        await new Promise((r) => requestAnimationFrame(r));

        const raw = captureLabel(stage, fitted.label.widthPx, fitted.label.heightPx);
        const activeTapeWidth = fitted.label.tapeWidthMm ?? (fitted.label.heightMm <= fitted.label.widthMm ? fitted.label.heightMm : fitted.label.widthMm);
        const needsRotation = Math.abs(fitted.label.heightMm - activeTapeWidth) < 0.1 && Math.abs(fitted.label.widthMm - activeTapeWidth) >= 0.1;
        const canvas = needsRotation ? rotateCanvas90CW(raw) : raw;
        const ctx = canvas.getContext("2d")!;
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const imageData: RawImageData = { data: imgData.data, width: canvas.width, height: canvas.height };

        useEditorV2Store.setState({
          printProgress: { bytesSent: i + 1, totalBytes: total },
        });

        await printer.print(imageData, {
          density: printSettings.density,
          paperType,
          copies: 1,
          dither: printSettings.ditherMode as any,
          threshold: printSettings.threshold,
        });

        if (i < total - 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      setTimeout(() => useEditorV2Store.getState().endPrint(), 400);
      return true;
    } catch (err) {
      console.error("Batch print failed:", err);
      useEditorV2Store.getState().endPrint();
      return false;
    } finally {
      useEditorV2Store.setState({
        elements: originalElements,
        label: baseLabel,
      });
      temporal?.getState()?.resume();
    }
  }, [connect]);

  const print = useCallback(async (copies: number): Promise<boolean> => {
    const currentElements = useEditorV2Store.getState().elements;
    const allCounters = new Set<string>();
    const allCsv = new Set<string>();

    for (const el of currentElements) {
      if (el.type === "text" && typeof el.props.text === "string") {
        const p = extractPlaceholders(el.props.text);
        p.counters.forEach((c) => allCounters.add(c));
        p.fields.forEach((f) => allCsv.add(f));
      }
      if ((el.type === "barcode" || el.type === "qrcode") && typeof el.props.content === "string") {
        const p = extractPlaceholders(el.props.content);
        p.counters.forEach((c) => allCounters.add(c));
        p.fields.forEach((f) => allCsv.add(f));
      }
    }

    if (allCsv.size > 0) {
      const csvData = useEditorV2Store.getState().csvData;
      if (!csvData || csvData.length === 0) {
        alert("This template requires a CSV file. Please import CSV data to print.");
        return false;
      }
      const headers = new Set(Object.keys(csvData[0] || {}));
      const missing = Array.from(allCsv).filter((f) => !headers.has(f));
      if (missing.length > 0) {
        alert(`Missing required CSV column(s): ${missing.join(", ")}`);
        return false;
      }
      return printBatch(csvData.map((row, idx) => ({ index: idx, csvRow: row, rowNumber: idx + 1 })));
    }

    if (allCounters.size > 0) {
      return printBatch(Array.from({ length: copies }, (_, i) => ({ index: i, csvRow: {} })));
    }

    let printer = getPrinter();

    // Silent background reconnect if GATT dropped but we still have a peripheral
    if (!printer) {
      const peripheral = usePrinterStore.getState().peripheral;
      if (peripheral) {
        try {
          await connect(peripheral);
          printer = getPrinter();
        } catch (err) {
          console.error("Silent reconnect failed:", err);
          return false;
        }
      }
    }

    const stage = stageRef.current;
    if (!printer || !stage) return false;

    const { label, printSettings, paperType, elements } = useEditorV2Store.getState();

    // Re-evaluate live date tokens right before capture to guarantee exact timestamp at print
    if (elements.some(e => e.type === "text" && ((e.props.text as string)?.includes("[[") || e.props.datePreset))) {
      useEditorV2Store.setState({
        elements: elements.map(e => (e.type === "text" && ((e.props.text as string)?.includes("[[") || e.props.datePreset))
          ? { ...e, props: { ...e.props, _ts: Date.now() } }
          : e
        ),
      });
      await new Promise(r => setTimeout(r, 20));
    }

    // Deselect to avoid selection handles in the capture
    useEditorV2Store.getState().clearSelection();

    // Wait a frame for Konva to re-render without selection handles
    await new Promise((r) => requestAnimationFrame(r));

    // Capture the label region at 1:1 pixel resolution
    const raw = captureLabel(stage, label.widthPx, label.heightPx);

    // Determine whether 90° CW rotation is needed
    const activeTapeWidth = label.tapeWidthMm ?? (label.heightMm <= label.widthMm ? label.heightMm : label.widthMm);
    const needsRotation = Math.abs(label.heightMm - activeTapeWidth) < 0.1 && Math.abs(label.widthMm - activeTapeWidth) >= 0.1;
    const canvas = needsRotation ? rotateCanvas90CW(raw) : raw;
    const rotatedW = canvas.width;
    const rotatedH = canvas.height;

    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, rotatedW, rotatedH);
    const imageData: RawImageData = { data: imgData.data, width: rotatedW, height: rotatedH };

    // Listen for real progress events from the printer
    const offProgress = (p: { bytesSent: number; totalBytes: number }) => {
      useEditorV2Store.setState({ printProgress: p });
    };
    printer.on("progress", offProgress);

    try {
      await printer.print(imageData, {
        density: printSettings.density,
        paperType,
        copies,
        dither: printSettings.ditherMode as "floyd-steinberg" | "threshold" | "none",
        threshold: printSettings.threshold,
      });
    } finally {
      printer.off("progress", offProgress);
    }

    return true;
  }, [connect, printBatch]);

  // Register print fn for keyboard shortcut
  useEffect(() => {
    setPrintFn(print);
    return () => setPrintFn(null);
  }, [print]);

  // Global drag-and-drop for CSV/TSV data files
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) {
        e.preventDefault();
      }
    };
    const onDrop = async (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv") || name.endsWith(".tsv")) {
        e.preventDefault();
        const res = await loadCsvFile(file);
        if (!res.success) {
          alert(res.error || "Failed to load CSV");
        }
      }
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-ink-950 text-ink-100">
      <TopChrome onPrint={print} onPrintBatch={printBatch} />
      <div className="relative flex-1 min-h-0 flex flex-col">
        <Canvas ref={stageRef} />
        <Inspector />
        <Dock />
        <PrintProgressToast />
        <StatusBar />
      </div>
      <Palette />
    </div>
  );
}
