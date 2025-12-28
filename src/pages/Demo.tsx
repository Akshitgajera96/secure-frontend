import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SecurePDFViewer } from '@/components/SecurePDFViewer';
import { toast } from 'sonner';

// Demo PDF URL (a sample public PDF)
const DEMO_PDF_URL = 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf';

const Demo = () => {
  const handlePrint = () => {
    toast.info('Demo mode: Print functionality preview');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mini Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded bg-accent/20 text-accent text-xs font-medium">
            DEMO MODE
          </div>
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium">Protected Document</span>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1">
        <SecurePDFViewer
          pdfUrl={DEMO_PDF_URL}
          documentTitle="Sample Document (Demo)"
          onPrint={handlePrint}
        />
      </div>
    </div>
  );
};

export default Demo;
