import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useLocation, Navigate, Link, useSearchParams } from 'react-router-dom';
import { Shield, ArrowLeft, AlertCircle, Printer, Eye } from 'lucide-react';
import { SecurePrintDialog } from '@/components/SecurePrintDialog';
import { TicketEditor } from '@/components/editor/TicketEditor';
import { VectorProxyEditor } from '@/components/editor/VectorProxyEditor';

import { Button } from '@/components/ui/button';

import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/config/api';

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

type ViewerNavState = {
  sessionToken?: string;
  documentTitle?: string;
  documentId?: string;
  documentType?: 'pdf' | 'svg';
  remainingPrints?: number;
  maxPrints?: number;
  ticketCropMm?: TicketCropMmOverride | null;
};

const Viewer = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = (location.state || {}) as ViewerNavState;
  const sessionToken = state.sessionToken ?? searchParams.get('sessionToken') ?? undefined;
  const documentTitle = state.documentTitle ?? searchParams.get('documentTitle') ?? undefined;
  const documentId = state.documentId ?? searchParams.get('documentId') ?? undefined;
  const documentType = (state.documentType ?? searchParams.get('documentType') ?? 'pdf') as 'pdf' | 'svg';
  const ticketCropMmFromState = state.ticketCropMm ?? undefined;

  const initialPrintsRaw = state.remainingPrints ?? searchParams.get('remainingPrints');
  const maxPrintsRaw = state.maxPrints ?? searchParams.get('maxPrints');
  const initialPrints = Number.parseInt(String(initialPrintsRaw ?? '0'), 10) || 0;
  const maxPrints = Number.parseInt(String(maxPrintsRaw ?? '0'), 10) || 0;
  const { token, user } = useAuth();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingPrints, setRemainingPrints] = useState(initialPrints || 0);

  const [docStatus, setDocStatus] = useState<'IDLE' | 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusStartedAt, setStatusStartedAt] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [hasGenerateRequest, setHasGenerateRequest] = useState(false);

  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  const shouldRedirect = !sessionToken;

  const ticketCropMm = useMemo(() => {
    if (ticketCropMmFromState) return ticketCropMmFromState;
    if (!documentId) return null;
    try {
      const raw = sessionStorage.getItem(`ticketCropMm:${documentId}`);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [documentId, ticketCropMmFromState]);

  useEffect(() => {
    if (!token) return;
    if (!documentId) return;

    let cancelled = false;

    const run = async () => {
      const startedAtWall = statusStartedAt || Date.now();
      if (!statusStartedAt) setStatusStartedAt(startedAtWall);

      const pollMs = 5000;
      const maxMs = 120_000;
      const startedAt = Date.now();
      let lastStatus = '';

      while (!cancelled && Date.now() - startedAt < maxMs) {
        try {
          setStatusError(null);
          const res = await api.get(`/api/docs/${documentId}/status`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          const nextStatus = String(res.data?.status || '').toUpperCase();
          lastStatus = nextStatus;
          if (nextStatus === 'IDLE' || nextStatus === 'PENDING' || nextStatus === 'RUNNING' || nextStatus === 'DONE' || nextStatus === 'FAILED') {
            setDocStatus(nextStatus as any);
          }

          if (nextStatus === 'DONE' || nextStatus === 'FAILED') return;
        } catch (e) {
          const eAny = e as any;
          const msg = String(eAny?.response?.data?.message || eAny?.message || '').trim();
          setStatusError(msg || 'Failed to check status');
        }

        await new Promise((t) => setTimeout(t, pollMs));
      }

      if (!cancelled && documentType === 'svg' && lastStatus !== 'DONE' && lastStatus !== 'FAILED') {
        setStatusError('Still processing (may take up to 2 minutes). You can keep editing and try Preview later.');
      }
    };

    if (documentType === 'svg' && hasGenerateRequest) {
      run();
    } else {
      setDocStatus('DONE');
    }

    return () => {
      cancelled = true;
    };
  }, [documentId, documentType, hasGenerateRequest, token]);

  const handlePreviewClick = useCallback(async () => {
    if (!token) {
      toast.error('Please login again');
      return;
    }
    if (!sessionToken) {
      toast.error('Missing session token');
      return;
    }

    if (documentType === 'svg' && docStatus !== 'DONE') {
      toast.message('Generate output first, then Preview');
      return;
    }

    const requestIdKey = sessionToken ? `secure-render:${sessionToken}` : 'secure-render:unknown';
    let stableRequestId = '';
    try {
      stableRequestId = sessionStorage.getItem(requestIdKey) || '';
      if (!stableRequestId) {
        stableRequestId = crypto.randomUUID();
        sessionStorage.setItem(requestIdKey, stableRequestId);
      }
    } catch {
      stableRequestId = crypto.randomUUID();
    }

    setPreviewLoading(true);
    setError(null);
    try {
      const res = await api.post(
        '/api/docs/secure-render',
        { sessionToken, requestId: stableRequestId },
        {
          params: { mode: 'url' },
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'X-Request-Id': stableRequestId,
            Accept: 'application/json',
          },
          validateStatus: (s) => (s >= 200 && s < 300) || s === 409,
        }
      );

      if (res.status === 409) {
        toast.message('Still processing, please wait');
        return;
      }

      const data = res.data as any;
      const nextUrl = String(data?.fileUrl || '').trim();
      if (!nextUrl) {
        throw new Error('Missing fileUrl');
      }
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
      setPdfUrl(nextUrl);
    } catch (e) {
      const eAny = e as any;
      const msg = String(eAny?.response?.data?.message || eAny?.message || '').trim();
      setError(msg || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [docStatus, documentType, sessionToken, token]);

  const handlePrintClick = () => {
    if (remainingPrints > 0) {
      setShowPrintDialog(true);
    } else {
      toast.error('Print limit exceeded');
    }
  };

  const handleConfirmPrint = useCallback(async () => {

    if (remainingPrints <= 0) {
      toast.error('Print limit exceeded');
      return;
    }

    setIsPrinting(true);

    try {
      const res = await api.post(
        '/api/docs/secure-print',
        { sessionToken },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = res.data as any;

      const newRemaining = data.remainingPrints ?? remainingPrints - 1;
      setRemainingPrints(newRemaining);

      const pdfUrl = data.fileUrl;

      const printWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        const tryPrint = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {
            // ignore
          }
        };

        try {
          printWindow.addEventListener('load', tryPrint, { once: true });
        } catch {
          // ignore
        }

        setTimeout(tryPrint, 1200);
      }

      setShowPrintDialog(false);
      toast.success(`Print ready. ${newRemaining} prints remaining.`);

    } catch (err) {
      console.error('Print error:', err);
      toast.error(err instanceof Error ? err.message : 'Print failed');
    } finally {
      setIsPrinting(false);
    }
  }, [sessionToken, remainingPrints, documentTitle, token]);

  if (shouldRedirect) {
    return <Navigate to="/upload" replace />;
  }

  return (
    <div
      className="h-screen flex flex-col bg-background"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
        <Link
          to="/upload"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground truncate max-w-[220px]">{documentTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-primary">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium">Protected</span>
            </div>

            <Button
              size="sm"
              variant="default"
              className="gap-2"
              disabled={remainingPrints <= 0}
              onClick={handlePrintClick}
            >
              <Printer className="h-4 w-4" />
              {remainingPrints > 0 ? 'Print' : 'No Prints Left'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={previewLoading || (documentType === 'svg' && docStatus !== 'DONE')}
              onClick={handlePreviewClick}
            >
              <Eye className="h-4 w-4" />
              {previewLoading ? 'Loading…' : 'Preview'}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-border bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs">
          {documentType === 'svg' ? (
            <>
              <span className="text-muted-foreground">Editor is ready. Click Generate when you want the PDF.</span>
              {docStatus ? (
                <span className="text-muted-foreground">Status: {docStatus}</span>
              ) : null}
              {statusStartedAt && Date.now() - statusStartedAt > 30_000 && docStatus !== 'DONE' ? (
                <span className="text-muted-foreground">Large file, may take up to 2 minutes.</span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground">Editor is ready. Click Preview to load the PDF.</span>
          )}
        </div>

        {statusError ? (
          <div className="mt-1 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{statusError}</span>
          </div>
        ) : null}

        {error ? (
          <div className="mt-1 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 flex flex-row">
        <div className="flex-1 min-h-0">
          {user?.role === 'admin' ? (
            documentType === 'svg' && documentId ? (
              <VectorProxyEditor
                documentId={documentId}
                ticketCropMm={ticketCropMm}
                onGenerate={() => {
                  setHasGenerateRequest(true);
                  setDocStatus('PENDING');
                  setStatusStartedAt(Date.now());
                }}
              />
            ) : (
              <TicketEditor pdfUrl={pdfUrl} fileType={documentType} documentId={documentId} ticketCropMm={ticketCropMm} />
            )
          ) : (
            <div className="h-full w-full bg-[#0b1220]">
              <div className="w-full h-full">
                {pdfUrl ? (
                  <iframe
                    title="Secure PDF Viewer"
                    src={pdfUrl}
                    className="w-full h-full bg-white"
                    style={{ border: 0 }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-white/70">
                    Click Preview to load
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <SecurePrintDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        onConfirmPrint={handleConfirmPrint}
        remainingPrints={remainingPrints}
        maxPrints={maxPrints}
        documentTitle={documentTitle}
        isPrinting={isPrinting}
      />
    </div>
  );
};

export default Viewer;
