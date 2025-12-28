import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { useDraggableRect } from '@/hooks/useDraggableRect';
import { assertTicketRegionGoldenSuiteOrThrow } from '@/utils/goldenTicketRegionSuite';
import { Eye, Plus, Sparkles, Trash2 } from 'lucide-react';
import { TicketToolbar } from './TicketToolbar';
import { TicketPropertiesPanel } from './TicketPropertiesPanel';
import { SeriesSlot, SeriesSlotData } from './SeriesSlot';

type EditorProxy = {
  page: { widthPt: number; heightPt: number };
  contentBBox: { x: number; y: number; width: number; height: number };
  safeMargins: { top: number; right: number; bottom: number; left: number };
};

type TicketRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TicketOnPage = {
  seriesBySlot: Record<
    string,
    {
      seriesValue: string;
      letterStyles: { fontSize: number; offsetY: number }[];
    }
  >;
};

type TicketOutputPage = {
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

type SeriesPlacementRule = {
  anchor: string;
  offset: { x: number; y: number };
  rotation: number;
};

type SlotStyle = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  textColor: string;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
};

const A4_WIDTH_PX = 595.28;
const A4_HEIGHT_PX = 841.89;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const formatPt = (v: number) => {
  if (!Number.isFinite(v)) return '0';
  return String(Math.round(v * 100) / 100);
};

const calculateEndingSeries = (start: string, totalTickets: number): string => {
  const match = start.match(/^(.*?)(\d+)$/);
  if (match) {
    const [, prefix, numStr] = match;
    const startNum = parseInt(numStr, 10);
    const endNum = startNum + totalTickets - 1;
    return `${prefix}${endNum.toString().padStart(numStr.length, '0')}`;
  }
  return start;
};

export const VectorProxyEditor: React.FC<{
  documentId: string;
  ticketCropMm?: {
    xMm: number | null;
    yMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
    cutMarginMm: number | null;
    rotationDeg: number | null;
    keepProportions: boolean | null;
    alignment: 'left' | 'center' | 'right' | null;
  } | null;
  onGenerate?: () => void;
}> = ({ documentId, ticketCropMm, onGenerate }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const fileType = 'svg' as const;

  const [proxy, setProxy] = useState<EditorProxy | null>(null);
  const [loading, setLoading] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const [placement, setPlacement] = useState<SeriesPlacementRule>({
    anchor: 'MARGIN_TOP_LEFT',
    offset: { x: 0, y: 0 },
    rotation: 0,
  });

  const [hasSeriesSlot, setHasSeriesSlot] = useState(true);
  const [startingSeries, setStartingSeries] = useState('A001');
  const [totalPages, setTotalPages] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStage, setGenerateStage] = useState<'preparing' | 'generating' | null>(null);
  const [lastPreviewId, setLastPreviewId] = useState<string | null>(null);

  const [customFonts, setCustomFonts] = useState<{ family: string; dataUrl: string }[]>([]);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);

  const [ticketRegion, setTicketRegion] = useState<TicketRegion | null>({
    x: 0.1,
    y: 0.1,
    width: 0.3,
    height: 0.2
  });
  const [isDrawingTicketRegion, setIsDrawingTicketRegion] = useState(false);
  const [ticketRegionDrawStart, setTicketRegionDrawStart] = useState<{ pointerId: number; x: number; y: number } | null>(null);
  const [ticketRegionDraft, setTicketRegionDraft] = useState<TicketRegion | null>(null);
  const [userModifiedTicketRegion, setUserModifiedTicketRegion] = useState(false);

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
  }, [ticketRegion]);

  const [slotStyle, setSlotStyle] = useState<SlotStyle>({
    backgroundColor: 'transparent',
    borderColor: '#10b981',
    borderWidth: 0,
    borderRadius: 4,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    textColor: '#000000',
    fontFamily: 'Arial',
    textAlign: 'center',
  });

  const [artworkLocked, setArtworkLocked] = useState<{
    artworkNaturalSize: { width: number; height: number };
    slotScale: number;
    objectBBoxPx: { width: number; height: number };
    artworkOffsetPx: { x: number; y: number };
  } | null>(null);

  const [seriesSlots, setSeriesSlots] = useState<SeriesSlotData[]>([
    {
      id: 'default-slot',
      x: 0.5,
      y: 0.5,
      width: 0.1,
      height: 0.05,
      value: 'A001',
      startingSeries: 'A001',
      seriesIncrement: 1,
      defaultFontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      rotation: 0,
      backgroundColor: 'transparent',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 4,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 8,
      paddingRight: 8,
      textAlign: 'center',
      letterStyles: [
        { fontSize: 24, offsetY: 0 },
        { fontSize: 24, offsetY: 0 },
        { fontSize: 24, offsetY: 0 },
        { fontSize: 24, offsetY: 0 }
      ]
    }
  ]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>('default-slot');

  const [slotSpacingPt] = useState(0);

  const [displayedPdfSize, setDisplayedPdfSize] = useState({ width: 0, height: 0 });
  const a4RootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const A4_WIDTH_PX = 794; // 210mm
  const A4_HEIGHT_PX = 1123; // 297mm
  
  const [canvasContainerSize, setCanvasContainerSize] = useState({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });

  useEffect(() => {
    if (!svgContent) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      canvas.width = A4_WIDTH_PX;
      canvas.height = A4_HEIGHT_PX;
      ctx.clearRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

      const scale = Math.min(
        A4_WIDTH_PX / img.width,
        A4_HEIGHT_PX / img.height
      );

      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const offsetX = (A4_WIDTH_PX - drawW) / 2;
      const offsetY = (A4_HEIGHT_PX - drawH) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      URL.revokeObjectURL(url);
      
      // Update displayedPdfSize for overlay
      setDisplayedPdfSize({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
    };
    img.src = url;
  }, [svgContent, A4_WIDTH_PX, A4_HEIGHT_PX]);

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

  const displayedTicketSize = useMemo(() => {
    if (fileType === 'svg') {
      return canvasContainerSize;
    }
    if (displayedPdfSize.width > 0 && displayedPdfSize.height > 0) {
      return displayedPdfSize;
    }
    return { width: 595.28, height: 841.89 };
  }, [displayedPdfSize, fileType, canvasContainerSize]);

  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (canvas && fileType === 'svg') {
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCanvasContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [fileType]);

  const { onPointerDown: onTicketRegionPointerDown, onResizePointerDown: onTicketRegionResizePointerDown } = useDraggableRect(
    ticketRegion
      ? { x: ticketRegion.x, y: ticketRegion.y, width: ticketRegion.width, height: ticketRegion.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    {
      enabled: Boolean(ticketRegion) && fileType === 'svg',
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

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

  const page = proxy?.page;

  const scale = useMemo(() => {
    if (!page) return 1;
    const sx = A4_WIDTH_PX / page.widthPt;
    const sy = A4_HEIGHT_PX / page.heightPt;
    return Math.min(sx, sy);
  }, [page]);

  const toPx = useCallback(
    (pt: number) => {
      const n = Number(pt);
      if (!Number.isFinite(n)) return 0;
      return n * scale;
    },
    [scale]
  );

  const getAnchorPt = useCallback(
    (anchor: string) => {
      const p = proxy?.page;
      if (!p) return { x: 0, y: 0 };

      const sm = proxy?.safeMargins;
      const left = sm?.left ?? 20;
      const top = sm?.top ?? 20;
      const right = sm?.right ?? 20;
      const bottom = sm?.bottom ?? 20;

      switch (anchor) {
        case 'PAGE_TOP_LEFT':
          return { x: 0, y: 0 };
        case 'PAGE_TOP_RIGHT':
          return { x: p.widthPt, y: 0 };
        case 'PAGE_BOTTOM_LEFT':
          return { x: 0, y: p.heightPt };
        case 'PAGE_BOTTOM_RIGHT':
          return { x: p.widthPt, y: p.heightPt };
        case 'MARGIN_TOP_LEFT':
          return { x: left, y: top };
        case 'MARGIN_TOP_RIGHT':
          return { x: p.widthPt - right, y: top };
        case 'MARGIN_BOTTOM_LEFT':
          return { x: left, y: p.heightPt - bottom };
        case 'MARGIN_BOTTOM_RIGHT':
          return { x: p.widthPt - right, y: p.heightPt - bottom };
        case 'CONTENT_TOP_LEFT':
          return { x: proxy?.contentBBox?.x ?? 0, y: proxy?.contentBBox?.y ?? 0 };
        case 'CONTENT_TOP_RIGHT':
          return {
            x: (proxy?.contentBBox?.x ?? 0) + (proxy?.contentBBox?.width ?? 0),
            y: proxy?.contentBBox?.y ?? 0,
          };
        case 'CONTENT_BOTTOM_LEFT':
          return {
            x: proxy?.contentBBox?.x ?? 0,
            y: (proxy?.contentBBox?.y ?? 0) + (proxy?.contentBBox?.height ?? 0),
          };
        case 'CONTENT_BOTTOM_RIGHT':
          return {
            x: (proxy?.contentBBox?.x ?? 0) + (proxy?.contentBBox?.width ?? 0),
            y: (proxy?.contentBBox?.y ?? 0) + (proxy?.contentBBox?.height ?? 0),
          };
        default:
          return { x: 0, y: 0 };
      }
    },
    [proxy]
  );

  const handlePt = useMemo(() => {
    const a = getAnchorPt(placement.anchor);
    return { x: a.x + placement.offset.x, y: a.y + placement.offset.y };
  }, [getAnchorPt, placement.anchor, placement.offset.x, placement.offset.y]);

  const handlePercent = useMemo(() => {
    if (!proxy?.page) return { xPct: 0, yPct: 0 };
    const w = Number(proxy.page.widthPt) || 1;
    const h = Number(proxy.page.heightPt) || 1;
    const xPct = (handlePt.x / w) * 100;
    const yPct = (handlePt.y / h) * 100;
    return { xPct, yPct };
  }, [handlePt.x, handlePt.y, proxy?.page]);

  const load = useCallback(async () => {
    if (!token) return;
    if (!documentId) return;

    setLoading(true);
    try {
      let cachedSvg: string | null = null;
      try {
        cachedSvg = sessionStorage.getItem(`rawSvg:${documentId}`);
      } catch {
        cachedSvg = null;
      }

      const [proxyRes, rulesRes, rawSvgRes] = await Promise.all([
        api.get(`/api/docs/${documentId}/editor-proxy`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get(`/api/docs/${documentId}/placement-rules`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        cachedSvg
          ? Promise.resolve({ data: cachedSvg })
          : api.get(`/api/docs/${documentId}/raw-svg`, {
              headers: { Authorization: `Bearer ${token}` },
              responseType: 'text' as any,
            }),
      ]);

      const nextProxy = proxyRes.data as EditorProxy;
      setProxy(nextProxy);

      const rawSvg = typeof (rawSvgRes as any)?.data === 'string' ? String((rawSvgRes as any).data) : null;
      setSvgContent(rawSvg);
      if (rawSvg && !cachedSvg) {
        try {
          sessionStorage.setItem(`rawSvg:${documentId}`, rawSvg);
        } catch {
        }
      }

      const rules = (rulesRes.data as any)?.placementRules?.seriesPlacement;
      if (rules && typeof rules === 'object') {
        const anchor = typeof rules.anchor === 'string' ? rules.anchor : placement.anchor;
        const ox = Number(rules?.offset?.x);
        const oy = Number(rules?.offset?.y);
        const rot = Number(rules?.rotation ?? 0);
        if (anchor && Number.isFinite(ox) && Number.isFinite(oy) && Number.isFinite(rot)) {
          setPlacement({ anchor, offset: { x: ox, y: oy }, rotation: rot });
        }
      }
    } catch (e) {
      const eAny = e as any;
      const msg = String(eAny?.response?.data?.message || eAny?.message || '').trim();
      toast.error(msg || 'Failed to load editor proxy');
    } finally {
      setLoading(false);
    }
  }, [documentId, placement.anchor, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePlacement = useCallback(async () => {
    if (!token) return;
    if (!documentId) return;

    try {
      await api.put(
        `/api/docs/${documentId}/placement-rules`,
        { seriesPlacement: placement },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Placement saved');
    } catch (e) {
      const eAny = e as any;
      const msg = String(eAny?.response?.data?.message || eAny?.message || '').trim();
      toast.error(msg || 'Failed to save placement');
    }
  }, [documentId, placement, token]);

  const endingSeries = useMemo(() => calculateEndingSeries(startingSeries, totalPages * 4), [startingSeries, totalPages]);

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
      if (!ticketRegion) {
        toast.error('Please select a ticket region first');
        return;
      }

      const totalTickets = totalPages * 4;

      const primarySlot = seriesSlots[0];
      const primaryBaseSeries = primarySlot?.startingSeries || primarySlot?.value || startingSeries;

      const pages: TicketOutputPage[] = [];

      for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
        const tickets: TicketOnPage[] = [];

        for (let ticketIdx = 0; ticketIdx < 4; ticketIdx++) {
          const globalIdx = pageIdx * 4 + ticketIdx;

          const seriesBySlot: TicketOnPage['seriesBySlot'] = {};

          seriesSlots.forEach((slot) => {
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
          seriesSlots,
          tickets,
        });
      }

      if (pages.length === 0) {
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
        throw new Error(
          'Invalid ticketCropRatio: selection extends outside the page. Move/resize the blue box inside the page.'
        );
      }

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

      const sanitizedTicketCropMm = ticketCropMm
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
          xMm: sanitizedTicketCropMm?.xMm ?? null,
          yMm: sanitizedTicketCropMm?.yMm ?? null,
          widthMm: sanitizedTicketCropMm?.widthMm ?? null,
          heightMm: sanitizedTicketCropMm?.heightMm ?? null,
          cutMarginMm: sanitizedTicketCropMm?.cutMarginMm ?? null,
          rotationDeg: sanitizedTicketCropMm?.rotationDeg ?? null,
          keepProportions: sanitizedTicketCropMm?.keepProportions ?? null,
          alignment: sanitizedTicketCropMm?.alignment ?? null,
        },
        layout: {
          pageSize: 'A4',
          totalPages: pages.length,
          slotSpacingPt,
        },
        series,
        watermarks: [],
      };

      console.log('[FRONTEND:ALIGNMENT_FLOW]', {
        alignment: (vectorMetadata as any)?.ticketCrop?.alignment,
        xMm: (vectorMetadata as any)?.ticketCrop?.xMm,
      });

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
            ticketCropMm: sanitizedTicketCropMm,
            documentId,
            fileType,
          })
        );
      } catch (e) {
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
  }, [customFonts, documentId, fileType, incrementSeries, isGenerating, seriesSlots, slotSpacingPt, startingSeries, ticketRegion, ticketCropRatio, totalPages, token, ticketCropMm]);

  const handleViewAndPrint = useCallback(() => {
    if (!lastPreviewId) return;
    navigate(`/output-preview/${lastPreviewId}`);
  }, [lastPreviewId, navigate]);

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

  const DEFAULT_FONT_FAMILIES = useMemo(
    () => [
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
    ],
    []
  );

  const handleAddSeriesSlot = useCallback(() => {
    const letterStyles = startingSeries.split('').map(() => ({ fontSize: 24, offsetY: 0 }));

    const fallbackX = 0.6;
    const fallbackY = 0.4;
    const fallbackWidth = 20;
    const fallbackHeight = 8;

    const stackIdx = seriesSlots.length;
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
  }, [seriesSlots.length, startingSeries]);

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

    toast.success('Series slot deleted');
  }, [seriesSlots, selectedSlotId]);

  const handleUpdateSlot = useCallback(
    (updates: Partial<SeriesSlotData>) => {
      if (!selectedSlotId) return;

      setSeriesSlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== selectedSlotId) return slot;

          const updated: SeriesSlotData = { ...slot, ...updates };

          if (updates.value && updates.value !== slot.value) {
            const newLength = updates.value.length;
            const currentStyles = slot.letterStyles || [];

            const newLetterStyles: any[] = [];
            for (let i = 0; i < newLength; i++) {
              newLetterStyles.push(currentStyles[i] || { fontSize: slot.defaultFontSize, offsetY: 0 });
            }
            updated.letterStyles = newLetterStyles;
            setStartingSeries(updates.value);
          }

          return updated;
        })
      );
    },
    [selectedSlotId]
  );

  const handleUpdateLetterFontSize = useCallback(
    (index: number, fontSize: number) => {
      if (!selectedSlotId) return;

      setSeriesSlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== selectedSlotId) return slot;

          const newLetterStyles = [...(slot.letterStyles || [])];
          newLetterStyles[index] = { ...newLetterStyles[index], fontSize };

          return { ...slot, letterStyles: newLetterStyles };
        })
      );
    },
    [selectedSlotId]
  );

  const handleUpdateLetterOffset = useCallback(
    (index: number, offsetY: number) => {
      if (!selectedSlotId) return;

      setSeriesSlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== selectedSlotId) return slot;

          const newLetterStyles = [...(slot.letterStyles || [])];
          newLetterStyles[index] = { ...newLetterStyles[index], offsetY };

          return { ...slot, letterStyles: newLetterStyles };
        })
      );
    },
    [selectedSlotId]
  );

  const handleUploadFont = useCallback((file: File) => {
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
        toast.error('Failed to load font');
      }
    };

    reader.readAsDataURL(file);
  }, []);

  const handleUploadImage = useCallback((file: File) => {
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
      toast.success('Image added on ticket');
    };
    reader.readAsDataURL(file);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!proxy) return;

      e.preventDefault();
      e.stopPropagation();

      const start = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startOffsetX: placement.offset.x,
        startOffsetY: placement.offset.y,
      };
      dragRef.current = start;
      setIsDragging(true);

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    },
    [placement.offset.x, placement.offset.y, proxy]
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (e.pointerId !== d.pointerId) return;

      const dxPx = e.clientX - d.startX;
      const dyPx = e.clientY - d.startY;
      const dxPt = dxPx / scale;
      const dyPt = dyPx / scale;

      const nextX = d.startOffsetX + dxPt;
      const nextY = d.startOffsetY + dyPt;

      setPlacement((prev) => ({
        ...prev,
        offset: {
          x: Number.isFinite(nextX) ? nextX : prev.offset.x,
          y: Number.isFinite(nextY) ? nextY : prev.offset.y,
        },
      }));
    };

    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, scale]);

  if (loading && !proxy) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Loading editor…</div>;
  }

  if (!proxy) {
    return <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Editor unavailable</div>;
  }

  if (true) {
    const selectedSlot = selectedSlotId ? seriesSlots.find((s) => s.id === selectedSlotId) || null : null;

    return (
      <div className="flex h-full bg-background">
        <TicketToolbar
          hasSeriesSlot={seriesSlots.length > 0}
          hasTicketRegion={Boolean(ticketRegion)}
          hasValidTicketRegion={hasValidTicketRegion}
          startingSeries={startingSeries}
          endingSeries={endingSeries}
          totalPages={totalPages}
          isGenerating={isGenerating}
          generatingLabel={generateStage === 'preparing' ? 'Preparing document…' : 'Generating…'}
          onAddSeriesSlot={handleAddSeriesSlot}
          onDeleteSeriesSlot={handleDeleteSeriesSlot}
          onStartingSeriesChange={setStartingSeries}
          onTotalPagesChange={setTotalPages}
          onGenerateOutput={handleGenerateOutput}
          lastPreviewId={lastPreviewId}
          onViewAndPrint={handleViewAndPrint}
          onUploadFont={handleUploadFont}
          onUploadImage={handleUploadImage}
        />

        <div className="flex-1 relative bg-muted/30 overflow-visible flex items-center justify-center">
          {svgContent ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  background:"#fff", 
                  display:"block",
                  aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}`,
                  maxWidth: `${A4_WIDTH_PX}px`,
                  maxHeight: `${A4_HEIGHT_PX}px`
                }}
              />
              {fileType === 'svg' && (
                <div
                  className="ticket-overlay absolute inset-0 z-10 overflow-visible pointer-events-auto border-2 border-dashed border-gray-400"
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
              {seriesSlots.length > 0 && (
                <div className="series-overlay absolute inset-0 z-10 overflow-visible">
                  <div
                    className="absolute"
                    style={{
                      left: artworkLocked?.artworkOffsetPx.x || 0,
                      top: artworkLocked?.artworkOffsetPx.y || 0,
                      width: artworkLocked?.objectBBoxPx.width || A4_WIDTH_PX,
                      height: artworkLocked?.objectBBoxPx.height || A4_HEIGHT_PX,
                    }}
                  >
                    <div className="relative w-full h-full">
                      {seriesSlots.map((slot) => (
                        <SeriesSlot
                          key={slot.id}
                          slot={slot}
                          isSelected={selectedSlotId === slot.id}
                          containerWidth={artworkLocked?.objectBBoxPx.width || A4_WIDTH_PX}
                          containerHeight={artworkLocked?.objectBBoxPx.height || A4_HEIGHT_PX}
                          slotScale={artworkLocked?.slotScale || 1}
                          onSelect={() => setSelectedSlotId(slot.id)}
                          onPositionChange={(slotId, next) => {
                            setSeriesSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, x: next.x, y: next.y } : s)));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-sm text-white/70 px-6 text-center">
              SVG preview unavailable (missing SVG content). Please re-open this document from Upload.
            </div>
          )}
        </div>

        {selectedSlot ? (
          <TicketPropertiesPanel
            slot={selectedSlot}
            availableFonts={[...DEFAULT_FONT_FAMILIES, ...customFonts.map((f) => f.family)]}
            onUpdateSlot={handleUpdateSlot}
            onUpdateLetterFontSize={handleUpdateLetterFontSize}
            onUpdateLetterOffset={handleUpdateLetterOffset}
          />
        ) : null}
      </div>
    );
  }

  const sm = proxy.safeMargins;

  const pagePx = { w: A4_WIDTH_PX, h: A4_HEIGHT_PX };
  const contentPx = {
    x: toPx(proxy.contentBBox.x),
    y: toPx(proxy.contentBBox.y),
    w: toPx(proxy.contentBBox.width),
    h: toPx(proxy.contentBBox.height),
  };

  const marginPx = {
    x: toPx(sm.left),
    y: toPx(sm.top),
    w: toPx(proxy.page.widthPt - sm.left - sm.right),
    h: toPx(proxy.page.heightPt - sm.top - sm.bottom),
  };

  const handlePx = { x: toPx(handlePt.x), y: toPx(handlePt.y) };

  return (
    <div className="h-full w-full flex flex-row">
      <div className="w-56 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Ticket Editor
          </h2>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series Slot</Label>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  setHasSeriesSlot(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Series Slot
              </Button>

              {hasSeriesSlot && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={() => {
                    setHasSeriesSlot(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Selected Slot
                </Button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground">Place series number on your ticket (you can add multiple boxes)</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series Config</Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Starting Series</Label>
              <Input
                value={startingSeries}
                onChange={(e) => setStartingSeries(e.target.value)}
                placeholder="e.g. A001 or A 001"
                className="h-8 text-sm bg-background font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Supports spaces (e.g., A 001, B 0001)</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Total Pages</Label>
              <Input
                type="number"
                value={totalPages}
                onChange={(e) => setTotalPages(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={500}
                className="h-8 text-sm bg-background"
              />
              <p className="text-[10px] text-primary font-medium">{totalPages * 4} tickets total (4 per page)</p>
            </div>

            <div className="p-2 bg-muted/50 rounded border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Series Range</p>
              <p className="text-xs font-mono font-medium text-foreground">
                {startingSeries} → {endingSeries}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Output</Label>
            <Button
              onClick={async () => {
                if (!hasSeriesSlot) {
                  toast.message('Add a series slot first');
                  return;
                }
                await handleGenerateOutput();
              }}
              size="sm"
              className="w-full gap-2"
            >
              <Eye className="h-4 w-4" />
              Generate Output
            </Button>

            <Button size="sm" variant="outline" className="w-full" onClick={savePlacement}>
              Save placement
            </Button>
          </div>
        </div>

        <div className="p-3 border-t border-border bg-muted/30">
          <div className="text-[10px] text-muted-foreground text-center space-y-1">
            <p>1. Choose anchor + position handle</p>
            <p>2. Save placement</p>
            <p>3. Generate → Preview</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-muted/30">
        <div className="flex justify-center p-6">
          <div
            className="relative bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/10"
            style={{ width: pagePx.w, height: pagePx.h }}
          >
            <div
              className="absolute"
              style={{ left: contentPx.x, top: contentPx.y, width: contentPx.w, height: contentPx.h, border: '2px solid #f59e0b' }}
            />
            <div
              className="absolute"
              style={{ left: marginPx.x, top: marginPx.y, width: marginPx.w, height: marginPx.h, border: '2px dashed #94a3b8' }}
            />

            {hasSeriesSlot ? (
              <div
                role="button"
                aria-label="Series placement handle"
                onPointerDown={onPointerDown}
                className="absolute"
                style={{
                  left: clamp(handlePx.x - 6, -20, pagePx.w + 20),
                  top: clamp(handlePx.y - 6, -20, pagePx.h + 20),
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  background: '#2563eb',
                  border: '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  cursor: 'grab',
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="w-80 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Slot Properties</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Style your series slot</p>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="color"
                value={slotStyle.borderColor}
                onChange={(e) => setSlotStyle((prev) => ({ ...prev, borderColor: e.target.value }))}
                className="w-10 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={slotStyle.borderColor}
                onChange={(e) => setSlotStyle((prev) => ({ ...prev, borderColor: e.target.value }))}
                className="flex-1 h-8 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Border Width</Label>
                <Input
                  type="number"
                  value={slotStyle.borderWidth}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, borderWidth: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-7 text-xs"
                  min={0}
                  max={10}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Border Radius</Label>
                <Input
                  type="number"
                  value={slotStyle.borderRadius}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, borderRadius: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-7 text-xs"
                  min={0}
                  max={50}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Padding (px)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Top</Label>
                <Input
                  type="number"
                  value={slotStyle.paddingTop}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, paddingTop: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-7 text-xs"
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                <Input
                  type="number"
                  value={slotStyle.paddingBottom}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, paddingBottom: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-7 text-xs"
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Left</Label>
                <Input
                  type="number"
                  value={slotStyle.paddingLeft}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, paddingLeft: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-7 text-xs"
                  min={0}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Right</Label>
                <Input
                  type="number"
                  value={slotStyle.paddingRight}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, paddingRight: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="h-7 text-xs"
                  min={0}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Transform</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Rotation (deg)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[placement.rotation]}
                  onValueChange={([v]) => setPlacement((prev) => ({ ...prev, rotation: v }))}
                  min={-180}
                  max={180}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={placement.rotation}
                  onChange={(e) => setPlacement((prev) => ({ ...prev, rotation: parseInt(e.target.value) || 0 }))}
                  className="w-16 h-7 text-xs"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Position &amp; Size (%)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">X Position</Label>
                <Input
                  type="number"
                  value={Math.round(handlePercent.xPct)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!proxy?.page) return;
                    if (!Number.isFinite(n)) return;
                    const absPt = (n / 100) * proxy.page.widthPt;
                    const a = getAnchorPt(placement.anchor);
                    setPlacement((prev) => ({ ...prev, offset: { ...prev.offset, x: absPt - a.x } }));
                  }}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Y Position</Label>
                <Input
                  type="number"
                  value={Math.round(handlePercent.yPct)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!proxy?.page) return;
                    if (!Number.isFinite(n)) return;
                    const absPt = (n / 100) * proxy.page.heightPt;
                    const a = getAnchorPt(placement.anchor);
                    setPlacement((prev) => ({ ...prev, offset: { ...prev.offset, y: absPt - a.y } }));
                  }}
                  className="h-7 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Width</Label>
                <Input type="number" value={20} readOnly className="h-7 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Height</Label>
                <Input type="number" value={8} readOnly className="h-7 text-xs" />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Typography</Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Font Family</Label>
              <select
                value={slotStyle.fontFamily}
                onChange={(e) => setSlotStyle((prev) => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full h-8 px-2 rounded border border-input bg-background text-sm"
              >
                <option value="Arial">Arial</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={slotStyle.textColor}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, textColor: e.target.value }))}
                  className="w-10 h-8 p-0.5 cursor-pointer"
                />
                <Input
                  type="text"
                  value={slotStyle.textColor}
                  onChange={(e) => setSlotStyle((prev) => ({ ...prev, textColor: e.target.value }))}
                  className="flex-1 h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground">Text Alignment</Label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => setSlotStyle((prev) => ({ ...prev, textAlign: align }))}
                    className={`flex-1 h-8 rounded border text-xs capitalize transition-colors ${
                      slotStyle.textAlign === align
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
