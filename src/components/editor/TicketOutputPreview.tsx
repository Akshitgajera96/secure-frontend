import React, { useEffect, useState } from 'react';

import { X, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { api } from '@/config/api';

import type { TicketOutputPage } from './TicketEditor';

interface TicketOutputPreviewProps {
  pages: TicketOutputPage[];
  onClose: () => void;
  documentId?: string;
  fileType?: 'pdf' | 'svg';
  pdfUrl?: string;
  customFonts?: { family: string; dataUrl: string }[];
  slotSpacingPt?: number;
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
  ticketCropRatio?: {
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    heightRatio: number;
  } | null;
}

export const TicketOutputPreview: React.FC<TicketOutputPreviewProps> = ({ pages, onClose, documentId, fileType, pdfUrl, slotSpacingPt, ticketCropRatio, ticketCropMm }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const { token } = useAuth();

  const [sourcePdfUrl, setSourcePdfUrl] = useState<string | null>(pdfUrl || null);
  const resolvedPdfUrl = sourcePdfUrl;

  const [printLoading, setPrintLoading] = useState(false);

  const totalTickets = pages.length * 4;

  const spacingPt = Number.isFinite(slotSpacingPt) ? Number(slotSpacingPt) : 0;

  useEffect(() => {
    if (pdfUrl) {
      setSourcePdfUrl(pdfUrl);
      return;
    }

    if (!token) return;
    if (!documentId) return;
    if (!pages || pages.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        let resolvedSourcePdfKey = `document:${documentId}`;
        if (fileType === 'svg') {
          setPrintLoading(true);
          await api.post(`/api/docs/${encodeURIComponent(String(documentId))}/generate`, null, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            validateStatus: (s) => s >= 200 && s < 300,
          });

          const pollIntervalMs = 2000;
          const timeoutMs = 2 * 60 * 1000;
          const startedAt = Date.now();
          while (Date.now() - startedAt < timeoutMs) {
            const stRes = await api.get(`/api/docs/${encodeURIComponent(String(documentId))}/status`, {
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

          const metaRes = await api.get(`/api/docs/${encodeURIComponent(String(documentId))}/meta`, {
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

        const firstPage = pages[0];
        if (!firstPage) return;

        if (!ticketCropRatio) {
          throw new Error('Missing ticketCropRatio');
        }

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

            // Object-relative ratios (0..1) inside the selected ticket crop.
            // Backend replicates into N slots per page; frontend does not do A4 math.
            slots: [{ xRatio: slot.x, yRatio: slot.y }],
          };
        });

        const isUserMmMode =
          ticketCropMm &&
          typeof ticketCropMm.widthMm === 'number' &&
          typeof ticketCropMm.heightMm === 'number' &&
          ticketCropMm.widthMm > 0 &&
          ticketCropMm.heightMm > 0;

        const sanitizedMmOverrides = ticketCropMm
          ? {
              ...ticketCropMm,
              xMm:
                ticketCropMm.alignment === 'center' || ticketCropMm.alignment === 'right'
                  ? null
                  : ticketCropMm.xMm ?? null,
            }
          : null;

        const mmOverrides: Record<string, unknown> = {};
        if (isUserMmMode && sanitizedMmOverrides) {
          mmOverrides.widthMm = sanitizedMmOverrides.widthMm;
          mmOverrides.heightMm = sanitizedMmOverrides.heightMm;

          if (typeof sanitizedMmOverrides.xMm === 'number') mmOverrides.xMm = sanitizedMmOverrides.xMm;
          if (typeof sanitizedMmOverrides.yMm === 'number') mmOverrides.yMm = sanitizedMmOverrides.yMm;
          if (typeof sanitizedMmOverrides.cutMarginMm === 'number') mmOverrides.cutMarginMm = sanitizedMmOverrides.cutMarginMm;
          if (typeof sanitizedMmOverrides.rotationDeg === 'number') mmOverrides.rotationDeg = sanitizedMmOverrides.rotationDeg;
          if (typeof sanitizedMmOverrides.keepProportions === 'boolean') {
            mmOverrides.keepProportions = sanitizedMmOverrides.keepProportions;
          }
          mmOverrides.alignment = sanitizedMmOverrides.alignment;
        }

        const vectorMetadata = {
          sourcePdfKey: resolvedSourcePdfKey,
          fileType: fileType || 'pdf',
          ticketCrop: {
            pageIndex: 0,
            xRatio: ticketCropRatio.xRatio,
            yRatio: ticketCropRatio.yRatio,
            widthRatio: ticketCropRatio.widthRatio,
            heightRatio: ticketCropRatio.heightRatio,
            alignment: sanitizedMmOverrides?.alignment ?? null,
            ...mmOverrides,
          },
          layout: {
            pageSize: 'A4',
            totalPages: pages.length,
            slotSpacingPt: spacingPt,
          },
          series,
          watermarks: [],
        };

        console.log('[FRONTEND:PAYLOAD_OUT]', {
          series: series.map((s: any) => ({ id: s.id, xRatio: s?.slots?.[0]?.xRatio, yRatio: s?.slots?.[0]?.yRatio })),
          ticketCrop: {
            xRatio: ticketCropRatio.xRatio,
            yRatio: ticketCropRatio.yRatio,
            widthRatio: ticketCropRatio.widthRatio,
            heightRatio: ticketCropRatio.heightRatio,
          },
          note: 'No px/pt/page values included',
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

        const nextPdfUrl: string | undefined = data?.pdfUrl;
        if (!nextPdfUrl) {
          throw new Error('Missing pdfUrl from /api/vector/generate');
        }

        if (cancelled) return;
        setSourcePdfUrl(nextPdfUrl);
      } catch (e) {
        if (cancelled) return;
        console.error('Preview generate error:', e);
        toast.error(e instanceof Error ? e.message : 'Preview generation failed');
      } finally {
        if (!cancelled) setPrintLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, token, documentId, pages, spacingPt, fileType, ticketCropRatio, ticketCropMm]);

  const parseSeriesPattern = (value: string) => {
    const str = String(value || '').trim();
    const m = str.match(/^(.*?)(\d+)$/);
    if (!m) return null;
    return { prefix: m[1], start: Number(m[2]), padLength: m[2].length };
  };

  const handlePrint = async () => {
    if (printLoading) return;
    if (!token) {
      toast.error('Not authenticated');
      return;
    }
    if (!documentId) {
      toast.error('Missing documentId');
      return;
    }

    try {
      setPrintLoading(true);

      let resolvedSourcePdfKey = `document:${documentId}`;
      if (fileType === 'svg') {
        await api.post(`/api/docs/${encodeURIComponent(String(documentId))}/generate`, null, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          validateStatus: (s) => s >= 200 && s < 300,
        });

        const pollIntervalMs = 2000;
        const timeoutMs = 2 * 60 * 1000;
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const stRes = await api.get(`/api/docs/${encodeURIComponent(String(documentId))}/status`, {
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

        const metaRes = await api.get(`/api/docs/${encodeURIComponent(String(documentId))}/meta`, {
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
      const firstPage = pages[0];
      if (!firstPage) {
        toast.error('No pages to print');
        return;
      }

      if (!ticketCropRatio) {
        throw new Error('Missing ticketCropRatio');
      }

      const crop = ticketCropRatio;
      const values = [crop.xRatio, crop.yRatio, crop.widthRatio, crop.heightRatio];
      const allFinite = values.every((n) => Number.isFinite(n));
      if (!allFinite) {
        throw new Error('ticketCropRatio contains non-finite numbers');
      }
      if (crop.xRatio < 0 || crop.yRatio < 0 || crop.widthRatio <= 0 || crop.heightRatio <= 0) {
        throw new Error('Invalid ticketCropRatio: values must be inside the page and width/height must be > 0');
      }
      if (crop.xRatio + crop.widthRatio > 1 || crop.yRatio + crop.heightRatio > 1) {
        throw new Error('Invalid ticketCropRatio: selection extends outside the page. Move/resize the blue box inside the page.');
      }

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
          slotSpacingPt: spacingPt,
        },
        series,
        watermarks: [],
      };

      console.log('[FRONTEND:PAYLOAD_OUT]', {
        series: series.map((s: any) => ({ id: s.id, xRatio: s?.slots?.[0]?.xRatio, yRatio: s?.slots?.[0]?.yRatio })),
        ticketCrop: {
          xRatio: ticketCropRatio.xRatio,
          yRatio: ticketCropRatio.yRatio,
          widthRatio: ticketCropRatio.widthRatio,
          heightRatio: ticketCropRatio.heightRatio,
        },
        note: 'No px/pt/page values included',
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

      const jobId: string | undefined = data?.jobId;
      if (!jobId) {
        throw new Error('Missing jobId from /api/vector/generate');
      }

      const pollIntervalMs = 1000;
      const timeoutMs = 10 * 60 * 1000;
      const startedAt = Date.now();

      let finalUrl: string | null = null;
      while (Date.now() - startedAt < timeoutMs) {
        const stRes = await api.get(`/api/vector/jobs/${encodeURIComponent(jobId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const st = stRes.data as any;
        if (st?.status === 'DONE') {
          const rrRes = await api.get(`/api/vector/jobs/${encodeURIComponent(jobId)}/result`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const rr = rrRes.data as any;
          const fileUrl = String(rr?.fileUrl || '').trim();
          if (!fileUrl) throw new Error('Missing fileUrl');
          finalUrl = fileUrl;
          break;
        }
        if (st?.status === 'FAILED') {
          throw new Error(st?.error || 'Job failed');
        }
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }

      if (!finalUrl) {
        throw new Error('Timed out waiting for output');
      }

      const win = window.open(finalUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        toast.error('Popup blocked. Please allow popups and try again.');
        return;
      }

      toast.message('Opened generated vector PDF. Use Ctrl+P to print.');
    } catch (err) {
      console.error('Print generate error:', err);
      toast.error(err instanceof Error ? err.message : 'Print failed');
    } finally {
      setPrintLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            Output: {pages.length} pages, {totalTickets} tickets
          </span>
        </div>
        <Button onClick={handlePrint} size="sm" className="gap-2" disabled={printLoading}>
          <Printer className="h-4 w-4" />
          {printLoading ? 'Generating...' : 'Print All Pages'}
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Page Navigation */}
        <div className="w-48 border-r border-border p-3 overflow-y-auto bg-card/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Pages</p>
          <div className="space-y-1">
            {pages.map((page, idx) => {
              const primarySlot = page.seriesSlots[0];
              const firstTicket = page.tickets[0];
              const lastTicket = page.tickets[3];
              const firstSeries = primarySlot && firstTicket
                ? firstTicket.seriesBySlot[primarySlot.id]?.seriesValue
                : '';
              const lastSeries = primarySlot && lastTicket
                ? lastTicket.seriesBySlot[primarySlot.id]?.seriesValue
                : '';

              return (
                <button
                  key={page.pageNumber}
                  onClick={() => setCurrentPage(idx)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    currentPage === idx
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  Page {page.pageNumber}
                  {firstSeries && lastSeries ? ` (${firstSeries} - ${lastSeries})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page Preview with Scroll */}
        <div className="flex-1 min-h-0">
          <div className="h-full overflow-auto p-6 bg-muted/30 flex justify-center">
            <div className="flex justify-center items-start w-full">
              {resolvedPdfUrl ? (
                <iframe
                  src={`${resolvedPdfUrl}#page=${currentPage + 1}`}
                  title="Output Preview"
                  style={{
                    width: '210mm',
                    height: '297mm',
                    background: 'white',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '210mm',
                    height: '297mm',
                    background: 'white',
                  }}
                  className="flex items-center justify-center text-sm text-muted-foreground"
                >
                  Generating preview...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-border bg-card">
        <Button
          variant="outline"
          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {pages.length}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
          disabled={currentPage === pages.length - 1}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
