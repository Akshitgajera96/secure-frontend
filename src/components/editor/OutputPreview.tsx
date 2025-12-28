import React, { useRef } from 'react';
import { X, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface OutputSlotBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface OutputPageData {
  pageNumber: number;
  slots: { block: OutputSlotBlock }[];
}

interface OutputPreviewProps {
  pages: OutputPageData[];
  onClose: () => void;
}

// Margins inside each A4 slot region (in percentage)
const SLOT_MARGINS = {
  top: 3,
  bottom: 3,
  left: 4,
  right: 4,
};

export const OutputPreview: React.FC<OutputPreviewProps> = ({ pages, onClose }) => {
  const [currentPage, setCurrentPage] = React.useState(0);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Series Output - Print</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: Arial, sans-serif;
            }
            .page {
              width: 210mm;
              height: 297mm;
              page-break-after: always;
              display: flex;
              flex-direction: column;
              position: relative;
              background: white;
            }
            .page:last-child {
              page-break-after: avoid;
            }
            .slot-region {
              flex: 1;
              position: relative;
              border-bottom: 1px solid #ddd;
            }
            .slot-region:last-child {
              border-bottom: none;
            }
            .slot-inner {
              position: absolute;
              top: ${SLOT_MARGINS.top}%;
              left: ${SLOT_MARGINS.left}%;
              right: ${SLOT_MARGINS.right}%;
              bottom: ${SLOT_MARGINS.bottom}%;
            }
            .slot-object {
              position: absolute;
              display: flex;
              align-items: center;
              overflow: hidden;
            }
            .slot-text {
              width: 100%;
            }
            .page-number {
              position: absolute;
              bottom: 3mm;
              right: 5mm;
              font-size: 8pt;
              color: #999;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${pages.map((page) => `
            <div class="page">
              ${page.slots.map((slot) => `
                <div class="slot-region">
                  <div class="slot-inner">
                    <div 
                      class="slot-object" 
                      style="
                        left: ${slot.block.x}%;
                        top: ${slot.block.y}%;
                        width: ${slot.block.width}%;
                        height: ${slot.block.height}%;
                        background-color: ${slot.block.backgroundColor};
                        border: ${slot.block.borderWidth}px solid ${slot.block.borderColor};
                        border-radius: ${slot.block.borderRadius}px;
                        padding: ${slot.block.paddingTop}px ${slot.block.paddingRight}px ${slot.block.paddingBottom}px ${slot.block.paddingLeft}px;
                        transform: rotate(${slot.block.rotation}deg);
                        transform-origin: center center;
                        justify-content: ${slot.block.textAlign === 'left' ? 'flex-start' : slot.block.textAlign === 'right' ? 'flex-end' : 'center'};
                      "
                    >
                      <span 
                        class="slot-text" 
                        style="
                          font-size: ${slot.block.fontSize}px;
                          font-family: ${slot.block.fontFamily};
                          color: ${slot.block.color};
                          text-align: ${slot.block.textAlign};
                        "
                      >${slot.block.value}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
              <span class="page-number">Page ${page.pageNumber} of ${pages.length}</span>
            </div>
          `).join('')}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const currentPageData = pages[currentPage];

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
            Preview: {pages.length} pages, {pages.length * 4} slots
          </span>
        </div>
        <Button onClick={handlePrint} size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print Output
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Page Navigation */}
        <div className="w-48 border-r border-border p-3 overflow-y-auto bg-card/50">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Pages</p>
          <div className="space-y-1">
            {pages.map((page, idx) => (
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
              </button>
            ))}
          </div>
        </div>

        {/* Page Preview */}
        <div className="flex-1 p-6 overflow-auto flex items-start justify-center bg-muted/30">
          <div
            ref={printContainerRef}
            className="bg-white shadow-2xl"
            style={{
              width: '210mm',
              minHeight: '297mm',
              transform: 'scale(0.65)',
              transformOrigin: 'top center',
            }}
          >
            {currentPageData && (
              <div className="h-full flex flex-col" style={{ minHeight: '297mm' }}>
                {currentPageData.slots.map((slot, slotIdx) => (
                  <div
                    key={slotIdx}
                    className="flex-1 relative"
                    style={{
                      borderBottom: slotIdx < 3 ? '1px solid #ddd' : 'none',
                    }}
                  >
                    {/* Inner content area with margins */}
                    <div
                      className="absolute"
                      style={{
                        top: `${SLOT_MARGINS.top}%`,
                        left: `${SLOT_MARGINS.left}%`,
                        right: `${SLOT_MARGINS.right}%`,
                        bottom: `${SLOT_MARGINS.bottom}%`,
                      }}
                    >
                      {/* Cloned Slot Object */}
                      <div
                        className="absolute flex items-center overflow-hidden"
                        style={{
                          left: `${slot.block.x}%`,
                          top: `${slot.block.y}%`,
                          width: `${slot.block.width}%`,
                          height: `${slot.block.height}%`,
                          backgroundColor: slot.block.backgroundColor,
                          border: `${slot.block.borderWidth}px solid ${slot.block.borderColor}`,
                          borderRadius: slot.block.borderRadius,
                          padding: `${slot.block.paddingTop}px ${slot.block.paddingRight}px ${slot.block.paddingBottom}px ${slot.block.paddingLeft}px`,
                          transform: `rotate(${slot.block.rotation}deg)`,
                          transformOrigin: 'center center',
                          justifyContent: slot.block.textAlign === 'left' ? 'flex-start' : slot.block.textAlign === 'right' ? 'flex-end' : 'center',
                        }}
                      >
                        <span
                          className="w-full"
                          style={{
                            fontSize: slot.block.fontSize,
                            fontFamily: slot.block.fontFamily,
                            color: slot.block.color,
                            textAlign: slot.block.textAlign,
                          }}
                        >
                          {slot.block.value}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Page number */}
                <span className="absolute bottom-2 right-4 text-xs text-gray-400">
                  Page {currentPageData.pageNumber} of {pages.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-border bg-card">
        <Button
          variant="outline"
          size="sm"
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
