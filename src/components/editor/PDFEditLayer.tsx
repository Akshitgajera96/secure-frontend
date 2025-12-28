import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MasterSlot, MasterSlotData } from './MasterSlot';

interface PDFEditLayerProps {
  pdfUrl: string | null;
  masterSlot: MasterSlotData | null;
  onSlotUpdate: (slot: MasterSlotData) => void;
  onSlotSelect: () => void;
}

export const PDFEditLayer: React.FC<PDFEditLayerProps> = ({
  pdfUrl,
  masterSlot,
  onSlotUpdate,
  onSlotSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, slotX: 0, slotY: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, slotX: 0, slotY: 0 });

  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!masterSlot) return;
    e.preventDefault();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      slotX: masterSlot.x,
      slotY: masterSlot.y,
    });
  }, [masterSlot]);

  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
    if (!masterSlot) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(corner);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: masterSlot.width,
      height: masterSlot.height,
      slotX: masterSlot.x,
      slotY: masterSlot.y,
    });
  }, [masterSlot]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!masterSlot || containerSize.width === 0) return;

    if (isDragging) {
      const dx = ((e.clientX - dragStart.x) / containerSize.width) * 100;
      const dy = ((e.clientY - dragStart.y) / containerSize.height) * 100;
      
      const newX = Math.max(0, Math.min(100 - masterSlot.width, dragStart.slotX + dx));
      const newY = Math.max(0, Math.min(100 - masterSlot.height, dragStart.slotY + dy));
      
      onSlotUpdate({ ...masterSlot, x: newX, y: newY });
    }

    if (isResizing) {
      const dx = ((e.clientX - resizeStart.x) / containerSize.width) * 100;
      const dy = ((e.clientY - resizeStart.y) / containerSize.height) * 100;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.slotX;
      let newY = resizeStart.slotY;

      if (isResizing.includes('e')) {
        newWidth = Math.max(5, Math.min(100 - newX, resizeStart.width + dx));
      }
      if (isResizing.includes('w')) {
        const widthChange = Math.min(dx, resizeStart.width - 5);
        newWidth = resizeStart.width - widthChange;
        newX = Math.max(0, resizeStart.slotX + widthChange);
      }
      if (isResizing.includes('s')) {
        newHeight = Math.max(3, Math.min(100 - newY, resizeStart.height + dy));
      }
      if (isResizing.includes('n')) {
        const heightChange = Math.min(dy, resizeStart.height - 3);
        newHeight = resizeStart.height - heightChange;
        newY = Math.max(0, resizeStart.slotY + heightChange);
      }

      onSlotUpdate({ ...masterSlot, x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, masterSlot, containerSize, dragStart, resizeStart, onSlotUpdate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  const handleValueChange = useCallback((value: string) => {
    if (masterSlot) {
      onSlotUpdate({ ...masterSlot, value });
    }
  }, [masterSlot, onSlotUpdate]);

  // If no PDF, show a message prompting to upload
  if (!pdfUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg border-2 border-border">
        <p className="text-muted-foreground text-sm">Upload a PDF to start editing</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg shadow-lg">
      {/* THE REAL PDF - This is the ONLY editing surface */}
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="absolute inset-0 w-full h-full border-0"
        title="PDF Canvas"
        style={{ zIndex: 1 }}
      />

      {/* Transparent Edit Layer - Positioned EXACTLY on top of PDF */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ zIndex: 10 }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => {
          if (!isDragging && !isResizing) {
            onSlotSelect();
          }
        }}
      >
        {/* Master Slot lives HERE - directly on top of the PDF */}
        {masterSlot && containerSize.width > 0 && (
          <MasterSlot
            slot={masterSlot}
            isSelected={true}
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            onSelect={onSlotSelect}
            onDragStart={handleDragStart}
            onValueChange={handleValueChange}
            onResizeStart={handleResizeStart}
          />
        )}
      </div>
    </div>
  );
};
