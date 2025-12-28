import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { LeftToolbar } from './LeftToolbar';
import { RightPropertiesPanel } from './RightPropertiesPanel';
import { PDFEditLayer } from './PDFEditLayer';
import { OutputPreview, OutputPageData, OutputSlotBlock } from './OutputPreview';
import type { MasterSlotData } from './MasterSlot';

interface SeriesEditorProps {
  pdfUrl?: string | null;
}

export const SeriesEditor: React.FC<SeriesEditorProps> = ({ pdfUrl }) => {
  // Master slot state
  const [masterSlot, setMasterSlot] = useState<MasterSlotData | null>(null);
  
  // Series config
  const [startingSeries, setStartingSeries] = useState('A001');
  const [totalPages, setTotalPages] = useState(5);
  
  // Output state
  const [outputPages, setOutputPages] = useState<OutputPageData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddMasterSlot = useCallback(() => {
    if (masterSlot) {
      toast.error('Only one master slot allowed');
      return;
    }
    
    const newSlot: MasterSlotData = {
      id: Date.now().toString(),
      x: 30,
      y: 40,
      width: 40,
      height: 12,
      value: startingSeries || 'A001',
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000',
      rotation: 0,
      // Slot object styling defaults
      backgroundColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 2,
      borderRadius: 4,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 12,
      paddingRight: 12,
      textAlign: 'center',
    };
    
    setMasterSlot(newSlot);
    toast.success('Master slot added. Drag and style it on the PDF.');
  }, [masterSlot, startingSeries]);

  const handleDeleteMasterSlot = useCallback(() => {
    setMasterSlot(null);
    setOutputPages([]);
    toast.success('Master slot deleted');
  }, []);

  const handleUpdateSlot = useCallback((updates: Partial<MasterSlotData>) => {
    if (!masterSlot) return;
    setMasterSlot({ ...masterSlot, ...updates });
  }, [masterSlot]);

  const incrementSeries = (value: string, increment: number): string => {
    const match = value.match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, numStr] = match;
      const num = parseInt(numStr, 10) + increment;
      return `${prefix}${num.toString().padStart(numStr.length, '0')}`;
    }
    return value;
  };

  const handleGenerateOutput = useCallback(() => {
    if (!masterSlot) {
      toast.error('Add a master slot first');
      return;
    }
    
    if (!startingSeries || !/\d+$/.test(startingSeries)) {
      toast.error('Starting series must end with numbers (e.g., A001)');
      return;
    }

    setIsGenerating(true);

    // Generate series values
    const totalSlots = totalPages * 4;
    const seriesValues = Array.from({ length: totalSlots }, (_, i) => 
      incrementSeries(startingSeries, i)
    );

    // Build pages - clone the ENTIRE slot object for each slot
    const SLOTS_PER_PAGE = 4;
    const pages: OutputPageData[] = [];

    for (let i = 0; i < seriesValues.length; i++) {
      const pageIndex = Math.floor(i / SLOTS_PER_PAGE);
      
      if (!pages[pageIndex]) {
        pages[pageIndex] = { pageNumber: pageIndex + 1, slots: [] };
      }

      // Clone the full slot object styling
      const slotBlock: OutputSlotBlock = {
        x: masterSlot.x,
        y: masterSlot.y,
        width: masterSlot.width,
        height: masterSlot.height,
        value: seriesValues[i],
        fontSize: masterSlot.fontSize,
        fontFamily: masterSlot.fontFamily,
        color: masterSlot.color,
        rotation: masterSlot.rotation,
        backgroundColor: masterSlot.backgroundColor,
        borderColor: masterSlot.borderColor,
        borderWidth: masterSlot.borderWidth,
        borderRadius: masterSlot.borderRadius,
        paddingTop: masterSlot.paddingTop,
        paddingBottom: masterSlot.paddingBottom,
        paddingLeft: masterSlot.paddingLeft,
        paddingRight: masterSlot.paddingRight,
        textAlign: masterSlot.textAlign,
      };

      pages[pageIndex].slots.push({ block: slotBlock });
    }

    setOutputPages(pages);
    setIsGenerating(false);
    toast.success(`Generated ${pages.length} pages with ${totalSlots} slots`);
  }, [masterSlot, startingSeries, totalPages]);

  const handleShowPreview = useCallback(() => {
    if (outputPages.length === 0) {
      toast.error('Generate output first');
      return;
    }
    setShowPreview(true);
  }, [outputPages]);

  return (
    <>
      <div className="flex h-full bg-background">
        {/* Left Toolbar */}
        <LeftToolbar
          hasMasterSlot={!!masterSlot}
          startingSeries={startingSeries}
          totalPages={totalPages}
          isGenerating={isGenerating}
          hasOutput={outputPages.length > 0}
          onAddMasterSlot={handleAddMasterSlot}
          onDeleteMasterSlot={handleDeleteMasterSlot}
          onStartingSeriesChange={setStartingSeries}
          onTotalPagesChange={setTotalPages}
          onGenerateOutput={handleGenerateOutput}
          onShowPreview={handleShowPreview}
        />

        {/* Center - PDF Viewer + Edit Layer */}
        <div className="flex-1 p-4">
          <PDFEditLayer
            pdfUrl={pdfUrl || null}
            masterSlot={masterSlot}
            onSlotUpdate={setMasterSlot}
            onSlotSelect={() => {}}
          />
        </div>

        {/* Right Properties Panel */}
        <RightPropertiesPanel
          slot={masterSlot}
          onUpdateSlot={handleUpdateSlot}
        />
      </div>

      {/* Output Preview Modal */}
      {showPreview && (
        <OutputPreview
          pages={outputPages}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
};
