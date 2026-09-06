import type { LucideIcon } from "lucide-react";
import {
  Type,
  QrCode,
  Barcode,
  Square,
  Minus,
  ImageIcon,
  Sticker,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Focus,
  Grid3x3,
  Ruler,
  Maximize2,
  Printer,
  Settings,
  LayoutTemplate,
} from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { mmToPx } from "../../utils/px-mm.ts";
import {
  addTextEl,
  addQrEl,
  addBarcodeEl,
  addImageEl,
  addRectEl,
  addLineEl,
} from "../../lib/keyboard.ts";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

function fitToScreen() {
  const { label } = useEditorV2Store.getState();
  const cw = window.innerWidth - 160;
  const ch = window.innerHeight - 200;
  const fit = Math.max(
    0.5,
    Math.min(4, Math.min(cw / label.widthPx, ch / label.heightPx)),
  );
  useEditorV2Store.getState().setZoom(fit);
  useEditorV2Store.getState().setPan(0, 0);
}

function setLabelSize(widthMm: number, heightMm: number) {
  useEditorV2Store.setState({
    label: {
      widthMm,
      heightMm,
      widthPx: mmToPx(widthMm),
      heightPx: mmToPx(heightMm),
    },
  });
}

function getSelectedElements() {
  const { selectedIds, elements } = useEditorV2Store.getState();
  return elements.filter((e) => selectedIds.includes(e.id));
}

function alignLeft() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({ [selected[0].id]: { x: 0 } });
    return;
  }

  const minX = Math.min(...selected.map((e) => e.x));
  const patches: Record<string, { x: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { x: minX };
  });
  updateElements(patches);
}

function alignCenterHorizontal() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { label, updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({
      [selected[0].id]: { x: Math.round((label.widthPx - selected[0].width) / 2) },
    });
    return;
  }

  const minX = Math.min(...selected.map((e) => e.x));
  const maxX = Math.max(...selected.map((e) => e.x + e.width));
  const centerX = (minX + maxX) / 2;
  const patches: Record<string, { x: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { x: Math.round(centerX - el.width / 2) };
  });
  updateElements(patches);
}

function alignRight() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { label, updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({
      [selected[0].id]: { x: label.widthPx - selected[0].width },
    });
    return;
  }

  const maxX = Math.max(...selected.map((e) => e.x + e.width));
  const patches: Record<string, { x: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { x: maxX - el.width };
  });
  updateElements(patches);
}

function alignTop() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({ [selected[0].id]: { y: 0 } });
    return;
  }

  const minY = Math.min(...selected.map((e) => e.y));
  const patches: Record<string, { y: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { y: minY };
  });
  updateElements(patches);
}

function alignCenterVertical() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { label, updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({
      [selected[0].id]: { y: Math.round((label.heightPx - selected[0].height) / 2) },
    });
    return;
  }

  const minY = Math.min(...selected.map((e) => e.y));
  const maxY = Math.max(...selected.map((e) => e.y + e.height));
  const centerY = (minY + maxY) / 2;
  const patches: Record<string, { y: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { y: Math.round(centerY - el.height / 2) };
  });
  updateElements(patches);
}

function alignBottom() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { label, updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({
      [selected[0].id]: { y: label.heightPx - selected[0].height },
    });
    return;
  }

  const maxY = Math.max(...selected.map((e) => e.y + e.height));
  const patches: Record<string, { y: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { y: maxY - el.height };
  });
  updateElements(patches);
}

function centerOnLabel() {
  const selected = getSelectedElements();
  if (selected.length === 0) return;
  const { label, updateElements } = useEditorV2Store.getState();

  if (selected.length === 1) {
    updateElements({
      [selected[0].id]: {
        x: Math.round((label.widthPx - selected[0].width) / 2),
        y: Math.round((label.heightPx - selected[0].height) / 2),
      },
    });
    return;
  }

  const minX = Math.min(...selected.map((e) => e.x));
  const maxX = Math.max(...selected.map((e) => e.x + e.width));
  const minY = Math.min(...selected.map((e) => e.y));
  const maxY = Math.max(...selected.map((e) => e.y + e.height));

  const groupW = maxX - minX;
  const groupH = maxY - minY;
  const targetX = Math.round((label.widthPx - groupW) / 2);
  const targetY = Math.round((label.heightPx - groupH) / 2);
  const dx = targetX - minX;
  const dy = targetY - minY;

  const patches: Record<string, { x: number; y: number }> = {};
  selected.forEach((el) => {
    patches[el.id] = { x: el.x + dx, y: el.y + dy };
  });
  updateElements(patches);
}

function distributeHorizontal() {
  const selected = getSelectedElements();
  if (selected.length < 3) return;
  const { updateElements } = useEditorV2Store.getState();

  const sorted = [...selected].sort((a, b) => a.x - b.x);
  const leftmost = sorted[0];
  const rightmost = sorted[sorted.length - 1];

  const totalElementWidth = sorted.reduce((sum, el) => sum + el.width, 0);
  const span = rightmost.x + rightmost.width - leftmost.x;
  const totalGaps = span - totalElementWidth;
  const gap = totalGaps / (sorted.length - 1);

  const patches: Record<string, { x: number }> = {};
  let currentX = leftmost.x + leftmost.width + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    patches[sorted[i].id] = { x: Math.round(currentX) };
    currentX += sorted[i].width + gap;
  }
  updateElements(patches);
}

function distributeVertical() {
  const selected = getSelectedElements();
  if (selected.length < 3) return;
  const { updateElements } = useEditorV2Store.getState();

  const sorted = [...selected].sort((a, b) => a.y - b.y);
  const topmost = sorted[0];
  const bottommost = sorted[sorted.length - 1];

  const totalElementHeight = sorted.reduce((sum, el) => sum + el.height, 0);
  const span = bottommost.y + bottommost.height - topmost.y;
  const totalGaps = span - totalElementHeight;
  const gap = totalGaps / (sorted.length - 1);

  const patches: Record<string, { y: number }> = {};
  let currentY = topmost.y + topmost.height + gap;
  for (let i = 1; i < sorted.length - 1; i++) {
    patches[sorted[i].id] = { y: Math.round(currentY) };
    currentY += sorted[i].height + gap;
  }
  updateElements(patches);
}

export const commands: Command[] = [
  // Insert
  { id: "add-text", label: "Add text element", group: "Insert", icon: Type, shortcut: "T", run: addTextEl },
  { id: "add-qr", label: "Add QR code", group: "Insert", icon: QrCode, shortcut: "Q", run: addQrEl },
  { id: "add-barcode", label: "Add barcode", group: "Insert", icon: Barcode, shortcut: "B", run: addBarcodeEl },
  { id: "add-rect", label: "Add rectangle", group: "Insert", icon: Square, shortcut: "R", run: addRectEl },
  { id: "add-line", label: "Add line", group: "Insert", icon: Minus, shortcut: "L", run: addLineEl },
  { id: "add-image", label: "Add image", group: "Insert", icon: ImageIcon, shortcut: "I", run: addImageEl },
  { id: "add-icon", label: "Add icon", group: "Insert", icon: Sticker, shortcut: "C", run: () => window.dispatchEvent(new CustomEvent("thermoprint:open-icons")) },

  // Edit
  { id: "undo", label: "Undo", group: "Edit", icon: Undo2, shortcut: "⌘Z", run: () => useEditorV2Store.temporal.getState().undo() },
  { id: "redo", label: "Redo", group: "Edit", icon: Redo2, shortcut: "⌘⇧Z", run: () => useEditorV2Store.temporal.getState().redo() },
  { id: "dup", label: "Duplicate selection", group: "Edit", icon: Copy, shortcut: "⌘D", run: () => useEditorV2Store.getState().duplicateSelected() },
  { id: "del", label: "Delete selection", group: "Edit", icon: Trash2, shortcut: "⌫", run: () => useEditorV2Store.getState().removeSelected() },

  // Align
  {
    id: "align-left",
    label: "Align left",
    group: "Align",
    icon: AlignHorizontalJustifyStart,
    run: alignLeft,
  },
  {
    id: "align-center-h",
    label: "Align center horizontally",
    group: "Align",
    icon: AlignHorizontalJustifyCenter,
    run: alignCenterHorizontal,
  },
  {
    id: "align-right",
    label: "Align right",
    group: "Align",
    icon: AlignHorizontalJustifyEnd,
    run: alignRight,
  },
  {
    id: "align-top",
    label: "Align top",
    group: "Align",
    icon: AlignVerticalJustifyStart,
    run: alignTop,
  },
  {
    id: "align-center-v",
    label: "Align center vertically",
    group: "Align",
    icon: AlignVerticalJustifyCenter,
    run: alignCenterVertical,
  },
  {
    id: "align-bottom",
    label: "Align bottom",
    group: "Align",
    icon: AlignVerticalJustifyEnd,
    run: alignBottom,
  },
  {
    id: "center-label",
    label: "Center selection on label",
    group: "Align",
    icon: Focus,
    run: centerOnLabel,
  },
  {
    id: "distribute-h",
    label: "Distribute horizontally",
    group: "Align",
    icon: AlignHorizontalDistributeCenter,
    run: distributeHorizontal,
  },
  {
    id: "distribute-v",
    label: "Distribute vertically",
    group: "Align",
    icon: AlignVerticalDistributeCenter,
    run: distributeVertical,
  },

  // View
  { id: "grid", label: "Toggle grid", group: "View", icon: Grid3x3, shortcut: "G", run: () => useEditorV2Store.setState((s) => ({ gridVisible: !s.gridVisible })) },
  { id: "rulers", label: "Toggle rulers", group: "View", icon: Ruler, run: () => useEditorV2Store.setState((s) => ({ rulersVisible: !s.rulersVisible })) },
  { id: "fit", label: "Fit label to screen", group: "View", icon: Maximize2, shortcut: "1", run: fitToScreen },

  // Label
  { id: "label-50x30", label: "Set label size · 50 × 30 mm", group: "Label", icon: Square, run: () => setLabelSize(50, 30) },
  { id: "label-40x12", label: "Set label size · 40 × 12 mm", group: "Label", icon: Square, run: () => setLabelSize(40, 12) },
  { id: "label-40x30", label: "Set label size · 40 × 30 mm", group: "Label", icon: Square, run: () => setLabelSize(40, 30) },
  { id: "label-70x40", label: "Set label size · 70 × 40 mm", group: "Label", icon: Square, run: () => setLabelSize(70, 40) },
  { id: "label-50x50", label: "Set label size · 50 × 50 mm", group: "Label", icon: Square, run: () => setLabelSize(50, 50) },

  // Print
  { id: "print", label: "Print label", group: "Print", icon: Printer, shortcut: "⌘P", run: () => {} },
  { id: "print-settings", label: "Open print settings", group: "Print", icon: Settings, run: () => {} },

  // Templates
  { id: "tpl-asset", label: "Template · Asset tag", group: "Templates", icon: LayoutTemplate, run: () => {} },
  { id: "tpl-shipping", label: "Template · Shipping label", group: "Templates", icon: LayoutTemplate, run: () => {} },
  { id: "tpl-price", label: "Template · Price tag", group: "Templates", icon: LayoutTemplate, run: () => {} },
];
