import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';

 

export type DraggableRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragMode = 'move' | 'resize';

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startRect: DraggableRect;
  mode: DragMode;
  corner?: string;
};

const clamp = (v: number, min: number, max: number) => {
  if (v < min) return min;
  if (v > max) return max;
  return v;
};

export const useDraggableRect = (
  rect: DraggableRect,
  options: {
    enabled: boolean;
    containerSize: { width: number; height: number };
    minSize?: { width: number; height: number };
    onChange: (next: DraggableRect) => void;
  }
) => {
  const draggingRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const rectRef = useRef(rect);

  const enabledRef = useRef(options.enabled);
  const containerSizeRef = useRef(options.containerSize);
  const minSizeRef = useRef(options.minSize || { width: 0.01, height: 0.01 });
  const onChangeRef = useRef(options.onChange);

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    enabledRef.current = options.enabled;
    containerSizeRef.current = options.containerSize;
    minSizeRef.current = options.minSize || { width: 0.01, height: 0.01 };
    onChangeRef.current = options.onChange;
  }, [options.enabled, options.containerSize, options.minSize, options.onChange]);

  const stopDragging = useCallback(() => {
    draggingRef.current = false;
    dragStateRef.current = null;
  }, []);

  const startMove = useCallback((e: React.PointerEvent) => {
    if (!enabledRef.current) return;
    const container = containerSizeRef.current;
    if (container.width <= 0 || container.height <= 0) return;

    e.preventDefault();
    e.stopPropagation();

    draggingRef.current = true;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: rectRef.current,
      mode: 'move',
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const startResize = useCallback((e: React.PointerEvent, corner: string) => {
    if (!enabledRef.current) return;
    const container = containerSizeRef.current;
    if (container.width <= 0 || container.height <= 0) return;

    e.preventDefault();
    e.stopPropagation();

    draggingRef.current = true;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: rectRef.current,
      mode: 'resize',
      corner,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

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

      const minSize = minSizeRef.current;
      const minW = Math.max(0, Number(minSize?.width || 0));
      const minH = Math.max(0, Number(minSize?.height || 0));

      let next: DraggableRect = { ...state.startRect };

      if (state.mode === 'move') {
        const w = clamp(state.startRect.width, 0, 1);
        const h = clamp(state.startRect.height, 0, 1);
        const x = clamp(state.startRect.x + dxRatio, 0, 1 - w);
        const y = clamp(state.startRect.y + dyRatio, 0, 1 - h);
        next = { x, y, width: w, height: h };
      } else {
        const c = String(state.corner || '');
        const left0 = state.startRect.x;
        const top0 = state.startRect.y;
        const right0 = state.startRect.x + state.startRect.width;
        const bottom0 = state.startRect.y + state.startRect.height;

        let x = left0;
        let y = top0;
        let w = state.startRect.width;
        let h = state.startRect.height;

        if (c.includes('w')) {
          x = clamp(left0 + dxRatio, 0, right0 - minW);
          w = right0 - x;
        }
        if (c.includes('e')) {
          x = left0;
          w = clamp(state.startRect.width + dxRatio, minW, 1 - left0);
        }

        if (c.includes('n')) {
          y = clamp(top0 + dyRatio, 0, bottom0 - minH);
          h = bottom0 - y;
        }
        if (c.includes('s')) {
          y = top0;
          h = clamp(state.startRect.height + dyRatio, minH, 1 - top0);
        }

        // Final safety clamp
        w = clamp(w, minW, 1);
        h = clamp(h, minH, 1);
        x = clamp(x, 0, 1 - w);
        y = clamp(y, 0, 1 - h);

        next = { x, y, width: w, height: h };
      }

      onChangeRef.current(next);
    };

    const handleUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const state = dragStateRef.current;
      if (!state) return;
      if (e.pointerId !== state.pointerId) return;
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
  }, [stopDragging]);

  return {
    onPointerDown: startMove,
    onResizePointerDown: startResize,
  };
};
