import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api, API_BASE_URL } from '@/config/api';

const STORAGE_KEY_PREFIX = 'sph:outputPreview:';

type OutputMeta = { pageCount: number; pdfUrl: string };

type PreviewPayload = {
  pdfUrl?: string;
  pageCount?: number;
  pages?: unknown[];
  key?: string;
  jobId?: string;
};

const OutputPreview = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { outputId, previewId } = useParams();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignPrintLimit, setAssignPrintLimit] = useState(1);
  const [assignMessage, setAssignMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [previewS3Key, setPreviewS3Key] = useState<string | null>(null);

  const resolvedPdfUrl = useMemo(() => {
    const raw = String(pdfUrl || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
    return raw;
  }, [pdfUrl]);

  const iframeSrc = useMemo(() => {
    if (!resolvedPdfUrl) return null;
    return `${resolvedPdfUrl}#page=${currentPage}&view=FitH&zoom=page-width&toolbar=0&navpanes=0&scrollbar=0`;
  }, [currentPage, resolvedPdfUrl]);

  const iframeKey = useMemo(() => {
    if (!resolvedPdfUrl) return 'no-pdf';
    return `${resolvedPdfUrl}::${currentPage}`;
  }, [currentPage, resolvedPdfUrl]);

  useEffect(() => {
    if (!pageCount || pageCount <= 0) return;
    setCurrentPage((p) => Math.min(Math.max(1, p), pageCount));
  }, [pageCount]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (typeof outputId === 'string' && outputId.trim()) {
          if (!token) throw new Error('Not authenticated');
          const res = await api.get(`/api/output/${encodeURIComponent(outputId)}/meta`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = (res.data || {}) as Partial<OutputMeta> & { message?: string };
          const nextCount = Number(data?.pageCount || 0);
          const nextUrl = String(data?.pdfUrl || '').trim();
          if (!nextUrl) throw new Error('Missing pdfUrl');
          if (!Number.isFinite(nextCount) || nextCount <= 0) throw new Error('Invalid pageCount');
          if (cancelled) return;
          setPdfUrl(nextUrl);
          setPageCount(nextCount);
          setCurrentPage(1);
          setLoading(false);
          return;
        }

        if (typeof previewId === 'string' && previewId.trim()) {
          const raw = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${previewId}`);
          if (!raw) throw new Error('Preview not found');
          const parsed = JSON.parse(raw) as PreviewPayload;

          const parsedJobId = typeof parsed?.jobId === 'string' ? parsed.jobId.trim() : '';
          const nextUrl = String(parsed?.pdfUrl || '').trim();
          const nextCount = Number.isFinite(parsed?.pageCount)
            ? Number(parsed.pageCount)
            : (Array.isArray(parsed?.pages) ? parsed.pages.length : 0);

          if (!nextUrl && !parsedJobId) throw new Error('Missing pdfUrl');
          if (!Number.isFinite(nextCount) || nextCount <= 0) throw new Error('Invalid pageCount');
          if (cancelled) return;

          setPageCount(nextCount);
          setCurrentPage(1);

          if (parsedJobId) {
            setPdfUrl(null);
            setPreviewS3Key(null);

            const pollIntervalMs = 1000;
            const timeoutMs = 10 * 60 * 1000;
            const startedAt = Date.now();

            while (!cancelled && Date.now() - startedAt < timeoutMs) {
              const statusRes = await api.get(`/api/vector/jobs/${encodeURIComponent(parsedJobId)}`, {
                params: { t: Date.now() },
                headers: {
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  'Cache-Control': 'no-cache',
                  Pragma: 'no-cache',
                },
              });
              const st = statusRes.data as any;
              if (st?.status === 'DONE') {
                const resultRes = await api.get(`/api/vector/jobs/${encodeURIComponent(parsedJobId)}/result`, {
                  params: { t: Date.now() },
                  headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                  },
                });
                const rr = resultRes.data as any;
                const fileUrl = String(rr?.fileUrl || '').trim();
                if (!fileUrl) throw new Error('Missing fileUrl');
                if (cancelled) return;
                setPdfUrl(fileUrl);
                setPreviewS3Key(typeof rr?.key === 'string' && rr.key.trim() ? rr.key.trim() : null);
                setLoading(false);
                return;
              }
              if (st?.status === 'FAILED') {
                throw new Error(st?.error || 'Job failed');
              }
              await new Promise((r) => setTimeout(r, pollIntervalMs));
            }

            throw new Error('Timed out waiting for output');
          }

          setPdfUrl(nextUrl || null);
          setPreviewS3Key(typeof parsed?.key === 'string' && parsed.key.trim() ? parsed.key.trim() : null);
          setPageCount(nextCount);
          setCurrentPage(1);
          setLoading(false);
          return;
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load preview');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [outputId, previewId, token]);

  const handlePrint = useCallback(() => {
    if (!resolvedPdfUrl) return;
    const win = window.open(resolvedPdfUrl, '_blank', 'noopener,noreferrer');
    if (!win) return;

    const tryPrint = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // ignore
      }
    };

    try {
      win.addEventListener('load', tryPrint, { once: true });
    } catch {
      // ignore
    }

    // Fallback: some browsers won't fire load for PDF viewer. Try after a short delay.
    setTimeout(tryPrint, 1200);
  }, [resolvedPdfUrl]);

  const handleAssignPdf = async () => {
    if (!assignEmail.trim() || !assignPrintLimit || assignPrintLimit < 1) {
      setAssignMessage('Please enter a valid email and print limit.');
      setTimeout(() => setAssignMessage(''), 3000);
      return;
    }

    if (!previewS3Key) {
      setAssignMessage('Missing S3 key for this preview. Please Generate Output again.');
      setTimeout(() => setAssignMessage(''), 3500);
      return;
    }
    try {
      await api.post(
        '/api/vector/assign',
        {
          userEmail: assignEmail.trim(),
          printLimit: Number(assignPrintLimit),
          s3Key: previewS3Key,
        },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      setAssignMessage('PDF assigned successfully!');
      setAssignEmail('');
      setAssignPrintLimit(1);
      setTimeout(() => setAssignMessage(''), 3000);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Assignment failed';
      setAssignMessage(msg);
      setTimeout(() => setAssignMessage(''), 3000);
    }
  };

  if (!outputId && !previewId) {
    return <Navigate to="/upload" replace />;
  }

  const canPrev = currentPage > 1;
  const canNext = pageCount > 0 && currentPage < pageCount;

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-white font-medium">Output Preview</div>
        <Button onClick={handlePrint} className="gap-2" disabled={loading || !resolvedPdfUrl}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-64 border-r border-white/10 bg-[#0b1220] p-4 overflow-auto">
          <div className="text-white/60 text-xs font-medium tracking-wider mb-3">PAGES</div>
          <div className="space-y-2">
            {Array.from({ length: Math.max(0, pageCount) }, (_, i) => i + 1).map((p) => {
              const active = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={
                    active
                      ? 'w-full text-left px-3 py-2 rounded-md bg-emerald-500/90 text-black text-sm font-medium'
                      : 'w-full text-left px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/80 text-sm'
                  }
                >
                  Page {p}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="max-w-[1000px] mx-auto">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
              {error ? (
                <div className="p-6 text-sm text-red-700">{error}</div>
              ) : loading ? (
                <div className="p-6 text-sm text-gray-600">Loading…</div>
              ) : !iframeSrc ? (
                <div className="p-6 text-sm text-gray-600">Preview not ready</div>
              ) : (
                <iframe
                  key={iframeKey}
                  title="Output PDF Preview"
                  src={iframeSrc}
                  className="w-full bg-white"
                  style={{ height: 'calc(100vh - 56px - 64px)', backgroundColor: '#ffffff' }}
                />
              )}
            </div>
          </div>
        </div>

        {user?.role === 'admin' ? (
          <div className="w-80 border-l border-white/10 bg-[#0b1220] flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white text-lg font-semibold">Assign to User</h3>
              <p className="text-xs text-white/60 mt-1">Assign this generated PDF and set print limit.</p>
            </div>
            <div className="flex-1 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">User Email</label>
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Print limit</label>
                <input
                  type="number"
                  min={1}
                  value={assignPrintLimit}
                  onChange={(e) => setAssignPrintLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={handleAssignPdf}
                disabled={!previewS3Key}
                className={`w-full py-2 px-4 rounded-md transition-colors ${
                  previewS3Key
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                Assign Pages
              </button>
              {!previewS3Key && (
                <div className="text-xs text-white/50">Generate Output again to enable assignment.</div>
              )}
              {assignMessage && (
                <div
                  className={`text-sm ${
                    assignMessage.toLowerCase().includes('success') ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {assignMessage}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-16 px-4 flex items-center justify-center gap-4 border-t border-white/10">
        <Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={!canPrev} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-white/80 text-sm">Page {Math.max(1, currentPage)} / {Math.max(1, pageCount || 1)}</div>
        <Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(pageCount || 1, p + 1))} disabled={!canNext} className="gap-1">
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default OutputPreview;
