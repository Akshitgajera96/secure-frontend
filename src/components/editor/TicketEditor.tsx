// frontend/src/components/editor/TicketEditor.tsx
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SeriesSlot, SeriesSlotData, LetterStyle } from './SeriesSlot';
import { TicketToolbar } from './TicketToolbar';
import { TicketPropertiesPanel } from './TicketPropertiesPanel';
import { DocumentPreview } from './DocumentPreview';
import { useDraggableRect } from '@/hooks/useDraggableRect';
import { A4_HEIGHT, A4_WIDTH, SAFE_MARGIN, snapToPt } from '@/utils/coordinateUtils';
import { assertTicketRegionGoldenSuiteOrThrow } from '@/utils/goldenTicketRegionSuite';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/config/api';

type TicketRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TicketCropMmOverride = {
  xMm: number | null;
  yMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  cutMarginMm: number | null;
  rotationDeg: number | null;
  keepProportions: boolean | null;
  alignment: 'left' | 'center' | 'right' | null;
};

interface TicketEditorProps {
  pdfUrl?: string | null;
  fileType?: 'pdf' | 'svg';
  documentId?: string;
  ticketCropMm?: TicketCropMmOverride | null;
}

export type TicketOnPage = {
  seriesBySlot: Record<
    string,
    {
      seriesValue: string;
      letterStyles: { fontSize: number; offsetY: number }[];
    }
  >;
};

export type TicketOutputPage = {
  pageNumber: number;
  layoutMode: 'vector';
  ticketImageData: string;
  ticketRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  seriesSlots: SeriesSlotData[];
  tickets: TicketOnPage[];
};

export const TicketEditor: React.FC<TicketEditorProps> = ({ pdfUrl, fileType = 'pdf', documentId, ticketCropMm }: TicketEditorProps) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [pdfCanvas, setPdfCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

  const DEFAULT_FONT_FAMILIES = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Helvetica',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS',
    'Monaco',
  ];

  const [customFonts, setCustomFonts] = useState<{ family: string; dataUrl: string }[]>([]);

  // Detected ticket region (user can adjust this)
  const [ticketRegion, setTicketRegion] = useState<TicketRegion | null>(null);
  const [isDrawingTicketRegion, setIsDrawingTicketRegion] = useState(false);
  const [ticketRegionDrawStart, setTicketRegionDrawStart] = useState<{ pointerId: number; x: number; y: number } | null>(null);
  const [ticketRegionDraft, setTicketRegionDraft] = useState<TicketRegion | null>(null);
  const [userModifiedTicketRegion, setUserModifiedTicketRegion] = useState(false);

  // REQUIRED: ticketCropRatio state for frontend→backend pipeline
  const [ticketCropRatio, setTicketCropRatio] = useState<{
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    heightRatio: number;
  } | null>(null);

  useEffect(() => {
    if (!ticketRegion) return;
    const next = {
      xRatio: ticketRegion.x,
      yRatio: ticketRegion.y,
      widthRatio: ticketRegion.width,
      heightRatio: ticketRegion.height,
    };

    setTicketCropRatio(next);
  }, [fileType, ticketRegion]);

  useEffect(() => {
    if (!ticketRegion) return;
    // stored ticketRegion ratios are the single source of truth for crop
  }, [ticketRegion]);

  // Series slot state (support multiple slots, one selected at a time)
  const [seriesSlots, setSeriesSlots] = useState<SeriesSlotData[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Global spacing between repeated ticket slots (single source of truth, PDF points)
  const [slotSpacingPt, setSlotSpacingPt] = useState(0);

  // Series config - support any characters including spaces
  const [startingSeries, setStartingSeries] = useState('A001');
  const [totalPages, setTotalPages] = useState(5);

  // Output state
  const [outputPages, setOutputPages] = useState<TicketOutputPage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStage, setGenerateStage] = useState<'preparing' | 'generating' | null>(null);
  const [lastPreviewId, setLastPreviewId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [overlayImagePosition, setOverlayImagePosition] = useState({ x: 5, y: 5, width: 20 });
  const [isOverlayDragging, setIsOverlayDragging] = useState(false);
  const [overlayDragStart, setOverlayDragStart] = useState({ x: 0, y: 0, startX: 5, startY: 5 });
  const [isOverlaySelected, setIsOverlaySelected] = useState(false);
  const [isOverlayResizing, setIsOverlayResizing] = useState(false);
  const [overlayResizeStart, setOverlayResizeStart] = useState({ x: 0, y: 0, width: 20 });

  // Track the actual displayed size of the PDF canvas for accurate drag calculations
  const [displayedPdfSize, setDisplayedPdfSize] = useState({ width: 0, height: 0 });

  const [artworkLocked, setArtworkLocked] = useState<{
    artworkNaturalSize: { width: number; height: number };
    slotScale: number;
    objectBBoxPx: { width: number; height: number };
    artworkOffsetPx: { x: number; y: number };
  } | null>(null);

  const a4RootRef = useRef<HTMLDivElement | null>(null);

  const clamp01 = useCallback((v: number) => Math.max(0, Math.min(1, v)), []);
  const clampTicketRegion = useCallback(
    (r: TicketRegion): TicketRegion => {
      const minW = 0.02;
      const minH = 0.02;

      const width = Math.max(minW, Math.min(1, r.width));
      const height = Math.max(minH, Math.min(1, r.height));

      const x = Math.max(0, Math.min(1 - width, r.x));
      const y = Math.max(0, Math.min(1 - height, r.y));

      return { x, y, width, height };
    },
    []
  );

  const handleDisplayedPdfSizeChange = useCallback((size: { width: number; height: number }) => {
    setDisplayedPdfSize(size);
  }, []);

  const repeatPerPage = 4;
  const slotHeightPt = useMemo(() => {
    if (!ticketRegion) return A4_HEIGHT / repeatPerPage;
    const h = ticketRegion.height * A4_HEIGHT;
    const maxH = A4_HEIGHT - SAFE_MARGIN * 2;
    return snapToPt(Math.max(1, Math.min(maxH, h)));
  }, [ticketRegion]);

  const maxSlotSpacingPt = useMemo(() => {
    // Keep the last slot bottom within SAFE_MARGIN (top-aligned base at SAFE_MARGIN)
    const baseTopPt = SAFE_MARGIN;
    const bottomLimit = A4_HEIGHT - SAFE_MARGIN;
    const lastBottomIfNoSpacing = baseTopPt + repeatPerPage * slotHeightPt;
    const availableForGaps = bottomLimit - lastBottomIfNoSpacing;
    const max = availableForGaps <= 0 ? 0 : availableForGaps / (repeatPerPage - 1);
    return snapToPt(Math.max(0, max));
  }, [repeatPerPage, slotHeightPt]);

  // Calculate ending series
  const calculateEndingSeries = useCallback((start: string, totalTickets: number): string => {
    const match = start.match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, numStr] = match;
      const startNum = parseInt(numStr, 10);
      const endNum = startNum + totalTickets - 1;
      return `${prefix}${endNum.toString().padStart(numStr.length, '0')}`;
    }
    return start;
  }, []);

  // 4 tickets per page
  const endingSeries = useMemo(() => calculateEndingSeries(startingSeries, totalPages * 4), [startingSeries, totalPages, calculateEndingSeries]);

  const handlePdfRendered = useCallback((canvas: HTMLCanvasElement, width: number, height: number) => {
    setPdfCanvas(canvas);
    setPdfDimensions({ width, height });

    setDisplayedPdfSize({ width, height });
  }, []);

  // Increment series - preserve spaces and other characters
  const incrementSeries = useCallback((value: string, increment: number): string => {
    const match = value.match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, numStr] = match;
      const num = parseInt(numStr, 10);
      const endNum = num + increment;
      return `${prefix}${endNum.toString().padStart(numStr.length, '0')}`;
    }
    return value;
  }, []);

  const handleAddSeriesSlot = useCallback(() => {
    const letterStyles: LetterStyle[] = startingSeries.split('').map(() => ({
      fontSize: 24,
      offsetY: 0,
    }));

    const fallbackX = 0.6;
    const fallbackY = 0.4;
    const fallbackWidth = 20;
    const fallbackHeight = 8;

    const stackIdx = seriesSlots.length;
    const stackGap = 2;
    const stackStep = fallbackHeight + stackGap;

    const baseX = fallbackX;
    const baseY = fallbackY + stackIdx * 0.05;

    const newSlot: SeriesSlotData = {
      id: Date.now().toString(),
      x: baseX,
      y: baseY,
      width: fallbackWidth,
      height: fallbackHeight,
      value: startingSeries,
      startingSeries: startingSeries,
      seriesIncrement: 1,
      letterStyles,
      defaultFontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      rotation: 0,
      backgroundColor: 'transparent',
      borderColor: '#10b981',
      borderWidth: 0,
      borderRadius: 4,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 8,
      paddingRight: 8,
      textAlign: 'center',
    };

    setSeriesSlots((prev) => [...prev, newSlot]);
    setSelectedSlotId(newSlot.id);
    toast.success('Series slot added. Drag to position on ticket.');
  }, [startingSeries, seriesSlots.length]);

  const handleDeleteSeriesSlot = useCallback(() => {
    setSeriesSlots((prev) => {
      if (prev.length === 0) return prev;
      if (!selectedSlotId) {
        const [, ...rest] = prev;
        return rest;
      }
      return prev.filter((slot) => slot.id !== selectedSlotId);
    });

    setSelectedSlotId((prevSelectedId) => {
      const remaining = seriesSlots.filter((slot) => slot.id !== prevSelectedId);
      return remaining.length > 0 ? remaining[0].id : null;
    });

    setOutputPages([]);
    toast.success('Series slot deleted');
  }, [seriesSlots, selectedSlotId]);

  const handleUpdateSlot = useCallback((updates: Partial<SeriesSlotData>) => {
    if (!selectedSlotId) return;

    setSeriesSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== selectedSlotId) return slot;

        const updated: SeriesSlotData = { ...slot, ...updates };

        if (updates.value && updates.value !== slot.value) {
          const newLength = updates.value.length;
          const currentStyles = slot.letterStyles || [];

          const newLetterStyles: LetterStyle[] = [];
          for (let i = 0; i < newLength; i++) {
            newLetterStyles.push(currentStyles[i] || { fontSize: slot.defaultFontSize, offsetY: 0 });
          }
          updated.letterStyles = newLetterStyles;
          // Keep startingSeries in sync with the slot value the user is editing
          setStartingSeries(updates.value);
        }

        return updated;
      })
    );
  }, [selectedSlotId]);

  const handleUpdateLetterFontSize = useCallback((index: number, fontSize: number) => {
    if (!selectedSlotId) return;

    setSeriesSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== selectedSlotId) return slot;

        const newLetterStyles = [...(slot.letterStyles || [])];
        newLetterStyles[index] = { ...newLetterStyles[index], fontSize };

        return { ...slot, letterStyles: newLetterStyles };
      })
    );
  }, [selectedSlotId]);

  const handleUpdateLetterOffset = useCallback((index: number, offsetY: number) => {
    if (!selectedSlotId) return;

    setSeriesSlots((prev) =>
      prev.map((slot) => {
        if (slot.id !== selectedSlotId) return slot;

        const newLetterStyles = [...(slot.letterStyles || [])];
        newLetterStyles[index] = { ...newLetterStyles[index], offsetY };

        return { ...slot, letterStyles: newLetterStyles };
      })
    );
  }, [selectedSlotId]);

  const handleOverlayDragStart = useCallback((e: React.MouseEvent) => {
    if (!overlayImage || displayedPdfSize.width === 0) return;
    e.preventDefault();
    e.stopPropagation();

    setIsOverlayDragging(true);
    setOverlayDragStart({
      x: e.clientX,
      y: e.clientY,
      startX: overlayImagePosition.x,
      startY: overlayImagePosition.y,
    });
  }, [overlayImage, overlayImagePosition, displayedPdfSize.width]);

  const handleOverlayResizeStart = useCallback((e: React.MouseEvent) => {
    if (!overlayImage || displayedPdfSize.width === 0) return;
    e.preventDefault();
    e.stopPropagation();

    setIsOverlayResizing(true);
    setOverlayResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: overlayImagePosition.width,
    });
  }, [overlayImage, overlayImagePosition.width, displayedPdfSize.width]);

  const handleOverlayWheel = useCallback((e: React.WheelEvent) => {
    if (!overlayImage) return;
    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? -2 : 2;
    setOverlayImagePosition((prev) => {
      const newWidth = Math.max(5, Math.min(80, prev.width + delta));
      return { ...prev, width: newWidth };
    });
  }, [overlayImage]);

  const displayedTicketSize = useMemo(() => {
    if (displayedPdfSize.width > 0 && displayedPdfSize.height > 0) {
      return displayedPdfSize;
    }
    return { width: 595.28, height: 841.89 };
  }, [displayedPdfSize]);

  const ticketRegionPx = useMemo(() => {
    if (!ticketRegion) return null;
    const w = displayedTicketSize.width;
    const h = displayedTicketSize.height;
    if (!(w > 0 && h > 0)) return null;
    return {
      left: ticketRegion.x * w,
      top: ticketRegion.y * h,
      width: ticketRegion.width * w,
      height: ticketRegion.height * h,
    };
  }, [displayedTicketSize.height, displayedTicketSize.width, ticketRegion]);

  const slotScale = artworkLocked?.slotScale ?? 1;
  const objectBBoxPx = artworkLocked?.objectBBoxPx ?? { width: 0, height: 0 };
  const artworkOffsetX = artworkLocked?.artworkOffsetPx.x ?? 0;
  const artworkOffsetY = artworkLocked?.artworkOffsetPx.y ?? 0;

  const { onPointerDown: onTicketRegionPointerDown, onResizePointerDown: onTicketRegionResizePointerDown } = useDraggableRect(
    ticketRegion
      ? { x: ticketRegion.x, y: ticketRegion.y, width: ticketRegion.width, height: ticketRegion.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    {
      enabled: Boolean(ticketRegion) && (fileType === 'svg' || displayedPdfSize.width > 0),
      containerSize: { width: displayedTicketSize.width, height: displayedTicketSize.height },
      minSize: { width: 0.02, height: 0.02 },
      onChange: (next) => {
        if (!ticketRegion) return;
        setUserModifiedTicketRegion(true);
        const clamped = clampTicketRegion({ x: next.x, y: next.y, width: next.width, height: next.height });
        setTicketRegion(clamped);
      },
    }
  );

  useEffect(() => {
    if (!isDrawingTicketRegion) return;
    if (!ticketRegionDrawStart) return;
    if (!a4RootRef.current) return;

    const target = a4RootRef.current;

    const getRatiosFromEvent = (e: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return null;
      const x = clamp01((e.clientX - rect.left) / w);
      const y = clamp01((e.clientY - rect.top) / h);
      if (![x, y].every((n) => Number.isFinite(n))) return null;
      return { x, y };
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== ticketRegionDrawStart.pointerId) return;
      const p = getRatiosFromEvent(e);
      if (!p) return;

      const x1 = ticketRegionDrawStart.x;
      const y1 = ticketRegionDrawStart.y;
      const x2 = p.x;
      const y2 = p.y;

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);

      setTicketRegionDraft({ x: left, y: top, width, height });
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== ticketRegionDrawStart.pointerId) return;
      setIsDrawingTicketRegion(false);
      setTicketRegionDrawStart(null);

      setUserModifiedTicketRegion(true);
      setTicketRegionDraft((draft) => {
        if (!draft) return null;
        if (!(draft.width > 0 && draft.height > 0)) return null;
        setTicketRegion(clampTicketRegion(draft));
        return null;
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDrawingTicketRegion, ticketRegionDrawStart, clamp01, clampTicketRegion]);

  const handleCreateTicketRegionPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (ticketRegion) return;
      if (isDrawingTicketRegion) return;

      if (!a4RootRef.current) return;

      const rect = a4RootRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;

      const xRatio = clamp01((e.clientX - rect.left) / w);
      const yRatio = clamp01((e.clientY - rect.top) / h);
      if (![xRatio, yRatio].every((n) => Number.isFinite(n))) return;

      e.preventDefault();
      e.stopPropagation();

      setIsDrawingTicketRegion(true);
      setTicketRegionDrawStart({ pointerId: e.pointerId, x: xRatio, y: yRatio });
      setTicketRegionDraft({ x: xRatio, y: yRatio, width: 0, height: 0 });

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [isDrawingTicketRegion, ticketRegion, clamp01]
  );

  const handleTicketRegionPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setUserModifiedTicketRegion(true);
      onTicketRegionPointerDown(e);
    },
    [onTicketRegionPointerDown]
  );

  const handleTicketRegionResizePointerDown = useCallback(
    (e: React.PointerEvent, corner: string) => {
      setUserModifiedTicketRegion(true);
      onTicketRegionResizePointerDown(e, corner);
    },
    [onTicketRegionResizePointerDown]
  );

  const handleGenerateOutput = useCallback(async () => {
    if (isGenerating) {
      toast.error('Output generation already in progress');
      return;
    }

    setIsGenerating(true);
    setGenerateStage('preparing');
    setLastPreviewId(null);

    try {
      if (import.meta.env.MODE === 'production') {
        await assertTicketRegionGoldenSuiteOrThrow();
      }
      if (fileType === 'pdf' && !pdfCanvas) {
        toast.error('No PDF canvas available');
        return;
      }
      if (!ticketRegion) {
        toast.error('Please select a ticket region first');
        return;
      }
      const totalTickets = totalPages * 4;

      // Use the first slot as the primary for range display only.
      const primarySlot = seriesSlots[0];
      const primaryBaseSeries = primarySlot?.startingSeries || primarySlot?.value || startingSeries;

      const pages: TicketOutputPage[] = [];

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const tickets: TicketOnPage[] = [];

        // Top-to-bottom ordering: ticketIdx 0..3 is the visual order on the page.
        for (let ticketIdx = 0; ticketIdx < 4; ticketIdx++) {
          const globalIdx = pageIdx * 4 + ticketIdx;

          const seriesBySlot: TicketOnPage['seriesBySlot'] = {};

          seriesSlots.forEach((slot) => {
            // Each slot uses its own fully independent base series and increment.
            const slotBaseSeries = slot.startingSeries || slot.value || startingSeries;
            const inc = slot.seriesIncrement ?? 1;
            const seriesValue = incrementSeries(slotBaseSeries, globalIdx * inc);

            const letterStyles = seriesValue.split('').map((_, idx) => {
              const baseStyle = slot.letterStyles?.[idx];
              return baseStyle
                ? { fontSize: baseStyle.fontSize, offsetY: baseStyle.offsetY ?? 0 }
                : { fontSize: slot.defaultFontSize, offsetY: 0 };
            });

            seriesBySlot[slot.id] = { seriesValue, letterStyles };
          });

          tickets.push({ seriesBySlot });
        }

        pages.push({
          pageNumber: pageIdx + 1,
          layoutMode: 'vector',
          ticketImageData: '',
          ticketRegion: {
            x: ticketRegion.x,
            y: ticketRegion.y,
            width: ticketRegion.width,
            height: ticketRegion.height,
          },
          // seriesSlots are stored ticket-relative (0..100) and sent as-is.
          seriesSlots,
          tickets,
        });
      }

      if (pages.length === 0) {
        // eslint-disable-next-line no-console
        console.error('[handleGenerateOutput] Output pages array is empty');
        throw new Error('Output pages array is empty');
      }

      if (!ticketCropRatio) {
        throw new Error('Missing ticketCropRatio');
      }

      const crop = ticketCropRatio;
      const values = [crop.xRatio, crop.yRatio, crop.widthRatio, crop.heightRatio];
      const allFinite = values.every((n) => Number.isFinite(n));
      if (!allFinite) {
        throw new Error('Invalid ticketCropRatio: contains non-finite numbers');
      }
      if (crop.xRatio < 0 || crop.yRatio < 0 || crop.widthRatio <= 0 || crop.heightRatio <= 0) {
        throw new Error('Invalid ticketCropRatio: values must be inside the page and width/height must be > 0');
      }
      if (crop.xRatio > 1 || crop.yRatio > 1 || crop.widthRatio > 1 || crop.heightRatio > 1) {
        throw new Error('Invalid ticketCropRatio: each ratio must be between 0 and 1');
      }
      if (crop.xRatio + crop.widthRatio > 1 || crop.yRatio + crop.heightRatio > 1) {
        throw new Error('Invalid ticketCropRatio: selection extends outside the page. Move/resize the blue box inside the page.');
      }

      setOutputPages(pages);

      const endSeries = incrementSeries(primaryBaseSeries, totalTickets - 1);
      if (!token) throw new Error('Not authenticated');
      if (!documentId) throw new Error('Missing documentId');

      let resolvedSourcePdfKey = `document:${documentId}`;

      // Enforce normalize-before-print ordering for SVG documents.
      if (fileType === 'svg') {
        toast.message('Preparing document…');
        await api.post(`/api/docs/${encodeURIComponent(documentId)}/generate`, null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          validateStatus: (s) => s >= 200 && s < 300,
        });

        const pollIntervalMs = 2000;
        const timeoutMs = 2 * 60 * 1000;
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const stRes = await api.get(`/api/docs/${encodeURIComponent(documentId)}/status`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const st = stRes.data as any;
          const status = String(st?.status || '').toUpperCase();
          if (status === 'DONE') break;
          if (status === 'FAILED') {
            const errMsg = String(st?.error?.message || '').trim();
            throw new Error(errMsg || 'SVG normalization failed');
          }
          await new Promise((r) => setTimeout(r, pollIntervalMs));
        }

        const metaRes = await api.get(`/api/docs/${encodeURIComponent(documentId)}/meta`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const meta = metaRes.data as any;
        const fileKey = String(meta?.fileKey || '').trim();
        if (!fileKey || !fileKey.endsWith('.pdf')) {
          throw new Error('Normalization failed: document is not a PDF');
        }
        resolvedSourcePdfKey = fileKey;
      }

      setGenerateStage('generating');

      const firstPage = pages[0];
      if (!firstPage) throw new Error('No pages to generate');

      const parseSeriesPattern = (value: string) => {
        const str = String(value || '').trim();
        const m = str.match(/^(.*?)(\d+)$/);
        if (!m) return null;
        return { prefix: m[1], start: Number(m[2]), padLength: m[2].length };
      };

      const series = firstPage.seriesSlots.map((slot) => {
        const firstTicket = firstPage.tickets?.[0];
        const firstSeriesValue = firstTicket?.seriesBySlot?.[slot.id]?.seriesValue ?? '';
        const parsed = parseSeriesPattern(firstSeriesValue);
        const letterStyles = firstTicket?.seriesBySlot?.[slot.id]?.letterStyles;
        const letterFontSizes = Array.isArray(letterStyles) ? letterStyles.map((ls) => ls.fontSize) : undefined;
        const letterOffsets = Array.isArray(letterStyles) ? letterStyles.map((ls) => ls.offsetY) : undefined;

        return {
          id: slot.id,
          prefix: parsed?.prefix ?? '',
          start: Number.isFinite(parsed?.start) ? parsed!.start : 1,
          step: Number.isFinite((slot as any).seriesIncrement) ? Number((slot as any).seriesIncrement) : 1,
          padLength: Number.isFinite(parsed?.padLength) ? parsed!.padLength : 0,
          font: slot.fontFamily || 'Helvetica',
          fontSize: slot.defaultFontSize || 24,
          letterFontSizes,
          letterOffsets,
          slots: [{ xRatio: slot.x, yRatio: slot.y }],
        };
      });

      const sanitizedMmOverrides = ticketCropMm
        ? {
            ...ticketCropMm,
            xMm:
              ticketCropMm.alignment === 'center' || ticketCropMm.alignment === 'right'
                ? null
                : ticketCropMm.xMm ?? null,
          }
        : null;

      const vectorMetadata = {
        sourcePdfKey: resolvedSourcePdfKey,
        fileType: fileType || 'pdf',
        ticketCrop: {
          pageIndex: 0,
          xRatio: ticketCropRatio.xRatio,
          yRatio: ticketCropRatio.yRatio,
          widthRatio: ticketCropRatio.widthRatio,
          heightRatio: ticketCropRatio.heightRatio,
          xMm: sanitizedMmOverrides?.xMm ?? null,
          yMm: sanitizedMmOverrides?.yMm ?? null,
          widthMm: sanitizedMmOverrides?.widthMm ?? null,
          heightMm: sanitizedMmOverrides?.heightMm ?? null,
          cutMarginMm: sanitizedMmOverrides?.cutMarginMm ?? null,
          rotationDeg: sanitizedMmOverrides?.rotationDeg ?? null,
          keepProportions: sanitizedMmOverrides?.keepProportions ?? null,
          alignment: sanitizedMmOverrides?.alignment ?? null,
        },
        layout: {
          pageSize: 'A4',
          totalPages: pages.length,
          slotSpacingPt,
        },
        series,
        watermarks: [],
      };

      const res = await api.post(
        '/api/vector/generate',
        { vectorMetadata },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = (res.data || {}) as any;

      const generatedJobId: string | undefined = (data as any)?.jobId;
      if (!generatedJobId) {
        throw new Error('Missing jobId from /api/vector/generate');
      }

      const previewId = `${Date.now()}:${Math.random().toString(16).slice(2)}`;
      try {
        sessionStorage.setItem(
          `sph:outputPreview:${previewId}`,
          JSON.stringify({
            jobId: generatedJobId,
            pageCount: pages.length,
            pages,
            slotSpacingPt,
            customFonts,
            ticketCropRatio,
            ticketCropMm: sanitizedMmOverrides,
            documentId,
            fileType,
          })
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[handleGenerateOutput] Failed to write preview sessionStorage', e);
        throw new Error('Failed to prepare output preview');
      }

      setLastPreviewId(previewId);
      toast.success('Output generated');
      toast.success(`Generated ${pages.length} pages, ${totalTickets} tickets (${primaryBaseSeries} → ${endSeries})`);
    } catch (err) {
      console.error('Error generating output:', err);
      toast.error('Output generation failed');
    } finally {
      setIsGenerating(false);
      setGenerateStage(null);
    }
  }, [customFonts, documentId, fileType, incrementSeries, isGenerating, pdfCanvas, seriesSlots, slotSpacingPt, startingSeries, ticketRegion, ticketCropRatio, totalPages, token]);

  const handleViewAndPrint = useCallback(() => {
    if (!lastPreviewId) return;
    navigate(`/output-preview/${lastPreviewId}`);
  }, [lastPreviewId, navigate]);

  const handleUploadFont = useCallback((file: File | null) => {
    if (!file) return;

    const allowedTypes = [
      'font/ttf',
      'font/otf',
      'font/woff',
      'font/woff2',
      'application/x-font-ttf',
      'application/x-font-otf',
      'application/font-woff',
      'application/font-woff2',
    ];

    if (!allowedTypes.includes(file.type) && !/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/.test(file.name)) {
      toast.error('Upload a valid font file (.ttf, .otf, .woff, .woff2)');
      return;
    }

    const fontFamilyName = file.name.replace(/\.[^.]+$/, '') || 'Custom Font';

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = typeof e.target?.result === 'string' ? e.target.result : null;
        if (!dataUrl) {
          toast.error('Failed to read font file');
          return;
        }

        const fontFace = new (window as any).FontFace(fontFamilyName, `url(${dataUrl})`);
        const loaded = await fontFace.load();
        (document as any).fonts.add(loaded);

        setCustomFonts((prev) => {
          if (prev.some((f) => f.family === fontFamilyName)) return prev;
          return [...prev, { family: fontFamilyName, dataUrl }];
        });

        toast.success(`Font "${fontFamilyName}" added`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading font:', error);
        toast.error('Failed to load font');
      }
    };

    reader.readAsDataURL(file);
  }, []);

  const hasValidTicketRegion = useMemo(() => {
    if (!ticketRegion) return false;
    const x = Number(ticketRegion.x);
    const y = Number(ticketRegion.y);
    const w = Number(ticketRegion.width);
    const h = Number(ticketRegion.height);
    if (![x, y, w, h].every((n) => Number.isFinite(n))) return false;
    if (w <= 0 || h <= 0) return false;
    if (x < 0 || y < 0) return false;
    if (x > 1 || y > 1) return false;
    if (w > 1 || h > 1) return false;
    if (x + w > 1 || y + h > 1) return false;
    return true;
  }, [ticketRegion]);

  const handleUploadImage = useCallback((file: File | null) => {
    if (!file) return;

    const allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg'];

    const lowered = file.name.toLowerCase();
    if (!allowedTypes.includes(file.type) && !/(\.svg|\.png|\.jpe?g)$/.test(lowered)) {
      toast.error('Upload SVG, PNG, or JPG image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = typeof e.target?.result === 'string' ? e.target.result : null;
      if (!result) {
        toast.error('Failed to read image file');
        return;
      }
      setOverlayImage(result);
      setOverlayImagePosition({ x: 5, y: 5, width: 20 });
      toast.success('Image added on ticket');
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <>
      <div className="flex h-full bg-background">
        {/* Left Toolbar */}
        <TicketToolbar
          hasSeriesSlot={seriesSlots.length > 0}
          hasTicketRegion={Boolean(ticketRegion)}
          hasValidTicketRegion={hasValidTicketRegion}
          startingSeries={startingSeries}
          endingSeries={endingSeries}
          totalPages={totalPages}
          isGenerating={isGenerating}
          generatingLabel={generateStage === 'preparing' ? 'Preparing document…' : 'Generating…'}
          lastPreviewId={lastPreviewId}
          onAddSeriesSlot={handleAddSeriesSlot}
          onDeleteSeriesSlot={handleDeleteSeriesSlot}
          onStartingSeriesChange={setStartingSeries}
          onTotalPagesChange={setTotalPages}
          onGenerateOutput={handleGenerateOutput}
          onViewAndPrint={handleViewAndPrint}
          onUploadFont={(f: File) => handleUploadFont(f)}
          onUploadImage={(f: File) => handleUploadImage(f)}
        />

        {/* Center - PDF Canvas */}
        <div ref={containerRef} className="flex-1 relative bg-muted/30 overflow-visible">
          <DocumentPreview
            docType="pdf"
            svgContent={null}
            pdfUrl={pdfUrl}
            onRegionDetected={undefined}
            onDisplayedSizeChange={handleDisplayedPdfSizeChange}
            disableAutoCenter={userModifiedTicketRegion}
            onArtworkLocked={(payload) => {
              setArtworkLocked((prev) => prev ?? payload);
            }}
            onA4RootMount={(el) => {
              a4RootRef.current = el;
              // Frontend is dumb - no SVG bbox authority
            }}
          >
            {/* Detected/Adjustable Ticket Region */}
            {(fileType === 'svg' || displayedPdfSize.width > 0) && (
              <div
                className="ticket-overlay absolute inset-0 z-10 overflow-visible pointer-events-auto"
                onPointerDown={handleCreateTicketRegionPointerDown}
              >
                {ticketRegionDraft ? (
                  <div
                    className="absolute border-2 border-blue-500 pointer-events-none"
                    style={{
                      left: `${ticketRegionDraft.x * 100}%`,
                      top: `${ticketRegionDraft.y * 100}%`,
                      width: `${ticketRegionDraft.width * 100}%`,
                      height: `${ticketRegionDraft.height * 100}%`,
                    }}
                  />
                ) : null}
                {ticketRegion ? (
                <div
                  className={`absolute border-2 ${hasValidTicketRegion ? 'border-blue-500' : 'border-red-500'} cursor-move pointer-events-auto`}
                  style={{
                    left: `${ticketRegion.x * 100}%`,
                    top: `${ticketRegion.y * 100}%`,
                    width: `${ticketRegion.width * 100}%`,
                    height: `${ticketRegion.height * 100}%`,
                  }}
                  onPointerDown={handleTicketRegionPointerDown}
                >
                  {/* Resize handles for ticket region */}
                  {['nw', 'ne', 'sw', 'se'].map((corner) => (
                    <div
                      key={corner}
                      className="absolute w-3 h-3 bg-blue-500 rounded-full cursor-pointer"
                      style={{
                        top: corner.includes('n') ? -6 : 'auto',
                        bottom: corner.includes('s') ? -6 : 'auto',
                        left: corner.includes('w') ? -6 : 'auto',
                        right: corner.includes('e') ? -6 : 'auto',
                      }}
                      onPointerDown={(e) => handleTicketRegionResizePointerDown(e, corner)}
                    />
                  ))}
                </div>
                ) : null}
              </div>
            )}

            {/* Series Slots - Backend-Authoritative Only */}
            {seriesSlots.length > 0 && artworkLocked && (
              <div className="series-overlay absolute inset-0 z-10 overflow-visible">
                <div
                  className="absolute"
                  style={{
                    left: artworkOffsetX,
                    top: artworkOffsetY,
                    width: objectBBoxPx.width,
                    height: objectBBoxPx.height,
                  }}
                >
                  <div className="relative w-full h-full">
                    {seriesSlots.map((slot) => (
                      <SeriesSlot
                        key={slot.id}
                        slot={slot}
                        isSelected={selectedSlotId === slot.id}
                        containerWidth={objectBBoxPx.width}
                        containerHeight={objectBBoxPx.height}
                        slotScale={slotScale}
                        onSelect={() => setSelectedSlotId(slot.id)}
                        onPositionChange={(slotId, next) => {
                          setSeriesSlots((prev) =>
                            prev.map((s) => (s.id === slotId ? { ...s, x: next.x, y: next.y } : s))
                          );
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {overlayImage && displayedPdfSize.width > 0 && (
              <div
                className="absolute group"
                style={{
                  left: `${overlayImagePosition.x}%`,
                  top: `${overlayImagePosition.y}%`,
                  width: `${overlayImagePosition.width}%`,
                }}
              >
                <img
                  src={overlayImage}
                  alt="Overlay"
                  className="w-full h-auto select-none cursor-move"
                  onMouseDown={handleOverlayDragStart}
                  onWheel={handleOverlayWheel}
                />
                {/* Resize handle for overlay image (bottom-right) */}
                <div
                  className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary rounded-full cursor-se-resize shadow-md border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={handleOverlayResizeStart}
                />
              </div>
            )}
          </DocumentPreview>
        </div>

        {/* Right Properties Panel */}
        {selectedSlotId ? (
          <TicketPropertiesPanel
            slot={seriesSlots.find((s) => s.id === selectedSlotId) || null}
            availableFonts={[...DEFAULT_FONT_FAMILIES, ...customFonts.map((f) => f.family)]}
            onUpdateSlot={handleUpdateSlot}
            onUpdateLetterFontSize={handleUpdateLetterFontSize}
            onUpdateLetterOffset={handleUpdateLetterOffset}
          />
        ) : null}
      </div>

      {/* Output Preview is now a dedicated route: /output-preview */}
    </>
  );
};

export default TicketEditor;
