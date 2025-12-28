import React, { useEffect, useMemo, useRef, useState } from 'react';

import { PDFCanvasViewer, DetectedRegion } from './PDFCanvasViewer';
import { InlineSvgViewer } from './InlineSvgViewer';

export const DocumentPreview: React.FC<{
  docType: 'pdf' | 'svg';
  pdfUrl?: string | null;
  svgContent?: string | null;
  onArtworkLocked?: (payload: {
    artworkNaturalSize: { width: number; height: number };
    slotScale: number;
    objectBBoxPx: { width: number; height: number };
    artworkOffsetPx: { x: number; y: number };
  }) => void;
  onPdfRendered?: (canvas: HTMLCanvasElement) => void;
  onRegionDetected?: (regions: DetectedRegion[]) => void;
  onDisplayedSizeChange?: (size: { width: number; height: number }) => void;
  disableAutoCenter?: boolean;
  onA4RootMount?: (el: HTMLDivElement | null) => void;
  children?: React.ReactNode;
}> = ({
  docType,
  pdfUrl,
  svgContent,
  onArtworkLocked,
  onPdfRendered,
  onRegionDetected,
  onDisplayedSizeChange,
  disableAutoCenter,
  onA4RootMount,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onDisplayedSizeChangeRef = useRef(onDisplayedSizeChange);

  const displayScale = 1;

  const [svgLoaded, setSvgLoaded] = useState(false);
  const [artworkNaturalSize, setArtworkNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const lockedRef = useRef(false);
  const slotScaleLockedRef = useRef<number | null>(null);

  const A4_WIDTH_PX = 595.28;
  const A4_HEIGHT_PX = 841.89;

  useEffect(() => {
    if (docType !== 'svg') return;
    if (!svgLoaded) return;
    const svgCount = document.querySelectorAll('svg[data-artwork-svg="true"]').length;
    if (svgCount !== 1) {
      throw new Error('❌ More than one SVG detected');
    }
  }, [docType, svgLoaded]);

  const worldTransform = useMemo(() => {
    if (docType !== 'svg') return null;
    if (!svgLoaded) return null;
    if (!artworkNaturalSize) return null;
    const s = slotScaleLockedRef.current;
    if (!Number.isFinite(s) || !s || s <= 0) return null;

    const scaledW = artworkNaturalSize.width * s;
    const scaledH = artworkNaturalSize.height * s;

    const finalOffsetX = (A4_WIDTH_PX - scaledW) / 2;
    const finalOffsetY = (A4_HEIGHT_PX - scaledH) / 2;

    return { offsetX: finalOffsetX, offsetY: finalOffsetY, scale: s };
  }, [A4_HEIGHT_PX, A4_WIDTH_PX, artworkNaturalSize, docType, svgLoaded]);

  useEffect(() => {
    onDisplayedSizeChangeRef.current = onDisplayedSizeChange;
  }, [onDisplayedSizeChange]);

  useEffect(() => {
    if (docType !== 'svg') return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      onDisplayedSizeChangeRef.current?.({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
  }, [docType]);

  if (docType === 'svg') {
    if (!svgContent) {
      return (
        <PDFCanvasViewer
          pdfUrl={pdfUrl || null}
          onPdfRendered={(canvas) => {
            onPdfRendered?.(canvas);
          }}
          onRegionDetected={onRegionDetected}
          onDisplayedSizeChange={onDisplayedSizeChange}
        >
          {children}
        </PDFCanvasViewer>
      );
    }

    const setA4Root = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      onA4RootMount?.(el);
    };

    return (
      <div className="flex w-full h-full bg-muted/30">
        <div className="flex-1 overflow-auto">
          <div className="flex justify-center p-6">
            <div
              ref={setA4Root}
              className="preview-canvas relative bg-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/10 text-black svg-doc-page overflow-visible"
              style={{
                width: `${A4_WIDTH_PX * displayScale}px`,
                height: `${A4_HEIGHT_PX * displayScale}px`,
                margin: '24px auto',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  transform: worldTransform
                    ? `matrix(${worldTransform.scale}, 0, 0, ${worldTransform.scale}, ${worldTransform.offsetX}, ${worldTransform.offsetY})`
                    : undefined,
                  transformOrigin: 'top left',
                }}
              >
                <InlineSvgViewer
                  svgContent={svgContent}
                  onRegionDetected={onRegionDetected}
                  disableAutoCenter={disableAutoCenter}
                  onSvgLoaded={(size) => {
                    if (lockedRef.current) return;
                    if (!size || !(size.width > 0) || !(size.height > 0)) {
                      throw new Error('Invalid artworkNaturalSize from SVG load');
                    }

                    setArtworkNaturalSize(size);
                    setSvgLoaded(true);

                    const s = Math.min(A4_WIDTH_PX / size.width, A4_HEIGHT_PX / size.height);
                    if (!Number.isFinite(s) || s <= 0) {
                      throw new Error('Invalid slotScale for initial A4 fit');
                    }
                    slotScaleLockedRef.current = s;
                    lockedRef.current = true;

                    const objectBBoxPx = { width: size.width * s, height: size.height * s };
                    const artworkOffsetPx = {
                      x: (A4_WIDTH_PX - objectBBoxPx.width) / 2,
                      y: (A4_HEIGHT_PX - objectBBoxPx.height) / 2,
                    };

                    onArtworkLocked?.({
                      artworkNaturalSize: size,
                      slotScale: s,
                      objectBBoxPx,
                      artworkOffsetPx,
                    });
                  }}
                />
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PDFCanvasViewer
      pdfUrl={pdfUrl}
      onPdfRendered={(canvas) => {
        onPdfRendered?.(canvas);
      }}
      onRegionDetected={onRegionDetected}
      onDisplayedSizeChange={onDisplayedSizeChange}
      onA4RootMount={onA4RootMount}
    >
      {children}
    </PDFCanvasViewer>
  );
};
