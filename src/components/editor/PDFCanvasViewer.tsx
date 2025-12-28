import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface DetectedRegion {
  id: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

interface PDFCanvasViewerProps {
  pdfUrl: string | null;
  onPdfRendered?: (canvas: HTMLCanvasElement, pageWidth: number, pageHeight: number) => void;
  onRegionDetected?: (regions: DetectedRegion[]) => void;
  onDisplayedSizeChange?: (size: { width: number; height: number }) => void;
  onA4RootMount?: (el: HTMLDivElement | null) => void;
  children?: React.ReactNode;
}

export const PDFCanvasViewer: React.FC<PDFCanvasViewerProps> = ({
  pdfUrl,
  onPdfRendered,
  onRegionDetected,
  onDisplayedSizeChange,
  onA4RootMount,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const a4RootRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const rerenderRequestedRef = useRef(false);
  const onPdfRenderedRef = useRef<typeof onPdfRendered>(onPdfRendered);
  const onRegionDetectedRef = useRef<typeof onRegionDetected>(onRegionDetected);
  const onDisplayedSizeChangeRef = useRef<typeof onDisplayedSizeChange>(onDisplayedSizeChange);
  const displayScaleRef = useRef(displayScale);

  useEffect(() => {
    onPdfRenderedRef.current = onPdfRendered;
    onRegionDetectedRef.current = onRegionDetected;
    onDisplayedSizeChangeRef.current = onDisplayedSizeChange;
  }, [onPdfRendered, onRegionDetected]);

  useEffect(() => {
    onDisplayedSizeChangeRef.current = onDisplayedSizeChange;
  }, [onDisplayedSizeChange]);

  useEffect(() => {
    displayScaleRef.current = displayScale;
  }, [displayScale]);

  // A4 dimensions in CSS pixels, matching PDF points (pdf.js viewport at scale=1)
  const A4_WIDTH_PX = 595.28;
  const A4_HEIGHT_PX = 841.89;

  // Render at a higher internal resolution to reduce visible pixelation in the editor.
  // The canvas is rendered at SCALE_FACTOR times the base A4 size, then displayed
  // scaled down via CSS (maxWidth/maxHeight). This keeps edges sharper when the
  // user zooms in on the screen while still using a canvas for region detection.
  const SCALE_FACTOR = 2;
  const CANVAS_WIDTH = A4_WIDTH_PX * SCALE_FACTOR;
  const CANVAS_HEIGHT = A4_HEIGHT_PX * SCALE_FACTOR;

  // Render document (PDF or SVG) to canvas at A4 size
  const renderPDF = useCallback(async () => {
    if (!canvasRef.current || !containerRef.current) return;

    if (!pdfUrl) {
      try {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      } catch {
        // ignore
      }

      setIsLoading(false);
      setError(null);
      return;
    }

    const isLikelyPdfUrl =
      pdfUrl.startsWith('blob:') ||
      pdfUrl.toLowerCase().endsWith('.pdf') ||
      pdfUrl.startsWith('http://') ||
      pdfUrl.startsWith('https://');

    if (!isLikelyPdfUrl) {
      setError('Failed to load document');
      setIsLoading(false);
      return;
    }

    if (isRenderingRef.current) {
      rerenderRequestedRef.current = true;
      return;
    }

    isRenderingRef.current = true;
    rerenderRequestedRef.current = false;

    try {
      setIsLoading(true);
      setError(null);

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }

      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // ignore
        }
        loadingTaskRef.current = null;
      }

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;
      
      // Set canvas to higher-than-screen resolution (supersampling)
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      // Fill with white background first
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Load PDF directly by URL (NO fetch/arrayBuffer)
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      loadingTaskRef.current = loadingTask;
      const pdfDoc = await loadingTask.promise;
      pdfDocRef.current = pdfDoc;

      // Get first page
      const page = await pdfDoc.getPage(1);

      const originalViewport = page.getViewport({ scale: 1 });

      // Map the source page into our fixed A4 canvas without clipping.
      // If the page is already A4, this becomes a no-op (scale ~= SCALE_FACTOR, offsets ~= 0).
      const scale = Math.min(CANVAS_WIDTH / originalViewport.width, CANVAS_HEIGHT / originalViewport.height);
      const viewport = page.getViewport({ scale });

      const offsetX = (CANVAS_WIDTH - viewport.width) / 2;
      const offsetY = (CANVAS_HEIGHT - viewport.height) / 2;

      // Render page
      context.save();
      context.translate(offsetX, offsetY);
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      context.restore();

      setDimensions({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

      // Notify parent of rendered canvas
      onPdfRenderedRef.current?.(canvas, A4_WIDTH_PX, A4_HEIGHT_PX);

      // Notify parent of displayed size (pure A4 user-space size × displayScale)
      onDisplayedSizeChangeRef.current?.({
        width: A4_WIDTH_PX * displayScaleRef.current,
        height: A4_HEIGHT_PX * displayScaleRef.current,
      });
      
      setIsLoading(false);
    } catch (err) {
      const name = (err as any)?.name ? String((err as any).name) : '';
      const message = (err as any)?.message ? String((err as any).message) : '';
      const isCancellation =
        name === 'RenderingCancelledException' ||
        /cancel/i.test(message) ||
        /Worker was destroyed/i.test(message);

      if (!isCancellation) {
        console.error('Error rendering document:', err);
        setError('Failed to load document');
        setIsLoading(false);
      }
    } finally {
      isRenderingRef.current = false;
      renderTaskRef.current = null;
      loadingTaskRef.current = null;
      if (rerenderRequestedRef.current) {
        rerenderRequestedRef.current = false;
        setTimeout(() => {
          renderPDF();
        }, 0);
      }
    }
  }, [pdfUrl]);

  useEffect(() => {
    if (pdfUrl) return;
    setIsLoading(false);
    setError(null);
  }, [pdfUrl]);

  useEffect(() => {
    onDisplayedSizeChangeRef.current?.({
      width: A4_WIDTH_PX * displayScale,
      height: A4_HEIGHT_PX * displayScale,
    });
  }, [displayScale]);

  useEffect(() => {
    const host = scrollRef.current;
    if (!host) return;

    const update = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w <= 0 || h <= 0) return;
      const s = Math.min(w / A4_WIDTH_PX, h / A4_HEIGHT_PX, 1);
      setDisplayScale(Number.isFinite(s) && s > 0 ? s : 1);
    };

    update();
    const handleResize = () => update();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    renderPDF();

    const handleResize = () => {
      renderPDF();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPDF]);

  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }

      if (loadingTaskRef.current) {
        try {
          loadingTaskRef.current.destroy();
        } catch {
          // ignore
        }
        loadingTaskRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="flex w-full h-full">
      <div ref={scrollRef} className="relative flex-1 overflow-auto bg-muted/30">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
          <div className="text-center">
            <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

        <div className="flex justify-center p-6">
          <div
            ref={(el) => {
              a4RootRef.current = el;
              onA4RootMount?.(el);
            }}
            className="relative bg-white shadow-2xl rounded-sm text-black"
            style={{
              width: `${A4_WIDTH_PX * displayScale}px`,
              height: `${A4_HEIGHT_PX * displayScale}px`,
              margin: '24px auto',
            }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 block"
              style={{ width: '100%', height: '100%' }}
            />

            <div className="absolute inset-0" style={{ pointerEvents: 'auto' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
