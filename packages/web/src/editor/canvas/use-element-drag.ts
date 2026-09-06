import { useRef, useCallback } from "react";
import type Konva from "konva";
import { useEditorV2Store } from "../../store/editor-store.ts";

export function useElementDrag(elementId: string) {
  const startPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  const handleDragStart = useCallback(
    (_e: Konva.KonvaEventObject<DragEvent>) => {
      const { selectedIds, elements, selectOnly } = useEditorV2Store.getState();
      const isPartOfSelection = selectedIds.includes(elementId);

      const activeIds = isPartOfSelection ? selectedIds : [elementId];
      if (!isPartOfSelection) {
        selectOnly([elementId]);
      }

      const map = new Map<string, { x: number; y: number }>();
      for (const id of activeIds) {
        const el = elements.find((item) => item.id === id);
        if (el) {
          map.set(id, { x: el.x, y: el.y });
        }
      }
      startPositionsRef.current = map;
    },
    [elementId],
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const startMap = startPositionsRef.current;
      if (startMap.size <= 1) return;

      const startPos = startMap.get(elementId);
      if (!startPos) return;

      const dx = e.target.x() - startPos.x;
      const dy = e.target.y() - startPos.y;

      const stage = e.target.getStage();
      if (!stage) return;

      startMap.forEach((orig, id) => {
        if (id === elementId) return;
        const otherNode = stage.findOne(`#${id}`);
        if (otherNode) {
          otherNode.position({
            x: Math.round(orig.x + dx),
            y: Math.round(orig.y + dy),
          });
        }
      });
      e.target.getLayer()?.batchDraw();
    },
    [elementId],
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const startMap = startPositionsRef.current;
      const { updateElement, updateElements } = useEditorV2Store.getState();

      if (startMap.size <= 1) {
        updateElement(elementId, {
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
        startPositionsRef.current.clear();
        return;
      }

      const startPos = startMap.get(elementId);
      if (!startPos) {
        updateElement(elementId, {
          x: Math.round(e.target.x()),
          y: Math.round(e.target.y()),
        });
        startPositionsRef.current.clear();
        return;
      }

      const dx = e.target.x() - startPos.x;
      const dy = e.target.y() - startPos.y;

      const patches: Record<string, { x: number; y: number }> = {};
      startMap.forEach((orig, id) => {
        patches[id] = {
          x: Math.round(orig.x + dx),
          y: Math.round(orig.y + dy),
        };
      });

      updateElements(patches);
      startPositionsRef.current.clear();
    },
    [elementId],
  );

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { selectToggle, selectOnly } = useEditorV2Store.getState();
      if (e.evt.shiftKey) {
        selectToggle(elementId);
      } else {
        selectOnly([elementId]);
      }
    },
    [elementId],
  );

  const handleTap = useCallback(
    (_e: Konva.KonvaEventObject<TouchEvent>) => {
      const { selectOnly } = useEditorV2Store.getState();
      selectOnly([elementId]);
    },
    [elementId],
  );

  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleClick,
    handleTap,
  };
}
