import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Printer, Shield, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SecurityOverlay } from './SecurityOverlay';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface SecurePDFViewerProps {
  pdfUrl: string;
  documentTitle?: string;
  onPrint?: () => void;
  printDisabled?: boolean;
  remainingPrints?: number;
  maxPrints?: number;
}

export const SecurePDFViewer = ({ 
  pdfUrl, 
  documentTitle = "Secure Document",
  onPrint,
  printDisabled = false,
  remainingPrints,
  maxPrints
}: SecurePDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load PDF
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load document. Please try again.');
        setLoading(false);
      }
    };

    if (pdfUrl) {
      loadPdf();
    }
  }, [pdfUrl]);

  // Render page
  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdf, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => {
    if (scale < 3) setScale(scale + 0.25);
  };

  const zoomOut = () => {
    if (scale > 0.5) setScale(scale - 0.25);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="mb-4 h-12 w-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading secure document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="mb-4 h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <SecurityOverlay>
      <div className="flex flex-col h-full bg-background">
        {/* Secure Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border glass">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Secure View</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-foreground font-medium truncate max-w-md">
              {documentTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-muted-foreground font-mono min-w-[4rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomIn}
                disabled={scale >= 3}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-muted-foreground font-mono min-w-[5rem] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0 hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Print button */}
            <Button
              onClick={onPrint}
              disabled={printDisabled}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>
                {remainingPrints !== undefined 
                  ? `Print (${remainingPrints}/${maxPrints})` 
                  : 'Secure Print'}
              </span>
            </Button>
          </div>
        </div>

        {/* PDF Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-8"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--border) / 0.3) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        >
          <div className="shadow-elevated rounded-lg overflow-hidden animate-scale-in">
            <canvas 
              ref={canvasRef}
              className="block"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
      </div>
    </SecurityOverlay>
  );
};
