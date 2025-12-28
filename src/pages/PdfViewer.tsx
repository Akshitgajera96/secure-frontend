import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PdfViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const fileUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const file = params.get('file');
    return file ? String(file) : '';
  }, [location.search]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (_) {
      // ignore
    }
  };

  if (!fileUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full border border-border rounded-lg p-6 bg-card">
          <div className="flex items-center gap-2 text-destructive mb-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Missing PDF URL</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This page requires a query param: <code>/?file=&lt;pdf-url&gt;</code>
          </p>
          <Link to="/upload" className="text-primary hover:underline text-sm">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <Button size="sm" className="gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="flex-1 bg-muted/10">
        <iframe title="PDF Viewer" src={fileUrl} className="w-full h-full border-0" />
      </div>
    </div>
  );
};

export default PdfViewer;
