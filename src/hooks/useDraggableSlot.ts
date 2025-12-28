import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

export type DraggableSlotPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPos: DraggableSlotPosition;
  slotScale: number;
  objectBBoxPx: { width: number; height: number };
};

export const useDraggableSlot = (
  slotId: string,
  position: DraggableSlotPosition,
  options: {
    enabled: boolean;
    containerSize: { width: number; height: number };
    slotScale: number;
    objectBBoxPx: { width: number; height: number };
    fontMetrics: { ascent: number; descent: number; height: number };
    appliedVisualOffsetY: number;
    onSelect?: () => void;
    onPositionChange: (slotId: string, next: Pick<DraggableSlotPosition, 'x' | 'y'>) => void;
  }
) => {
  const draggingRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const latestPosRef = useRef(position);
  const enabledRef = useRef(options.enabled);
  const containerSizeRef = useRef(options.containerSize);
  const slotScaleRef = useRef(options.slotScale);
  const objectBBoxRef = useRef(options.objectBBoxPx);
  const fontMetricsRef = useRef(options.fontMetrics);
  const appliedVisualOffsetYRef = useRef(options.appliedVisualOffsetY);
  const onSelectRef = useRef(options.onSelect);
  const onPositionChangeRef = useRef(options.onPositionChange);

  useEffect(() => {
    latestPosRef.current = position;
  }, [position]);

  useEffect(() => {
    enabledRef.current = options.enabled;
    containerSizeRef.current = options.containerSize;
    slotScaleRef.current = options.slotScale;
    objectBBoxRef.current = options.objectBBoxPx;
    fontMetricsRef.current = options.fontMetrics;
    appliedVisualOffsetYRef.current = options.appliedVisualOffsetY;
    onSelectRef.current = options.onSelect;
    onPositionChangeRef.current = options.onPositionChange;
  }, [
    options.enabled,
    options.containerSize,
    options.slotScale,
    options.objectBBoxPx,
    options.fontMetrics,
    options.appliedVisualOffsetY,
    options.onSelect,
    options.onPositionChange,
  ]);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    dragStateRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabledRef.current) return;
      if (containerSizeRef.current.width <= 0 || containerSizeRef.current.height <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      onSelectRef.current?.();

      draggingRef.current = true;
      const container = containerSizeRef.current;
      dragStateRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPos: latestPosRef.current,
        slotScale: slotScaleRef.current,
        objectBBoxPx: objectBBoxRef.current,
      };

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [slotId]
  );

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const state = dragStateRef.current;
      if (!state) return;
      if (e.pointerId !== state.pointerId) return;

      const container = containerSizeRef.current;
      if (container.width <= 0 || container.height <= 0) return;

      const dxRatio = (e.clientX - state.startClientX) / container.width;
      const dyRatio = (e.clientY - state.startClientY) / container.height;

      const nextX = state.startPos.x + dxRatio;
      const nextY = state.startPos.y + dyRatio;

      onPositionChangeRef.current(slotId, { x: nextX, y: nextY });
    };

    const handleUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const state = dragStateRef.current;
      if (!state) return;
      if (e.pointerId !== state.pointerId) return;

      console.log('[FRONTEND:SERIES_ANCHOR_LOCK]', {
        xRatio: latestPosRef.current.x,
        yRatio: latestPosRef.current.y,
        objectBBoxPx: state.objectBBoxPx,
        fontMetrics: fontMetricsRef.current,
        anchor: 'baseline',
        source: 'normalized-svg',
      });
      stopDragging();
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [slotId, stopDragging]);

  return { onPointerDown };
};
