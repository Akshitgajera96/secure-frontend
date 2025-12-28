import React, { useState, useRef, useCallback } from 'react';
import { Settings, Eye, Trash2, Plus, Move, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TextInputBlock {
  id: string;
  x: number;
  y: number;
  value: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
}

interface OutputSlot {
  blocks: {
    x: number;
    y: number;
    value: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    rotation: number;
  }[];
}

interface OutputPage {
  pageNumber: number;
  slots: OutputSlot[];
}

interface TemplateEditorProps {
  pdfCanvasRef?: React.RefObject<HTMLCanvasElement>;
  pdfDimensions?: { width: number; height: number };
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ pdfCanvasRef, pdfDimensions }) => {
  const [inputBlocks, setInputBlocks] = useState<TextInputBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Default styling for new blocks
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');
  const [rotation, setRotation] = useState(0);
  
  // Series input
  const [seriesInput, setSeriesInput] = useState('');
  const [totalPages, setTotalPages] = useState(5);
  
  // Output state
  const [outputPages, setOutputPages] = useState<OutputPage[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  
  const EDITOR_WIDTH = 340;
  const EDITOR_HEIGHT = 120;

  const selectedBlock = inputBlocks.find(b => b.id === selectedBlockId);

  const handleAddInputBlock = () => {
    const newBlock: TextInputBlock = {
      id: Date.now().toString(),
      x: 10 + (inputBlocks.length * 20) % 100,
      y: 30 + (inputBlocks.length * 15) % 60,
      value: inputBlocks.length === 0 ? '5ES177352' : '',
      fontSize,
      fontFamily,
      color: textColor,
      rotation,
    };
    setInputBlocks([...inputBlocks, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  const handleDeleteBlock = () => {
    if (!selectedBlockId) return;
    setInputBlocks(inputBlocks.filter(b => b.id !== selectedBlockId));
    setSelectedBlockId(null);
  };

  const handleMouseDown = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    setSelectedBlockId(blockId);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !selectedBlockId || !editorRef.current) return;

    const dx = (e as any).movementX ?? 0;
    const dy = (e as any).movementY ?? 0;

    setInputBlocks((blocks) =>
      blocks.map((b) => {
        if (b.id !== selectedBlockId) return b;
        const nextX = Math.max(0, Math.min(b.x + dx, EDITOR_WIDTH - 80));
        const nextY = Math.max(0, Math.min(b.y + dy, EDITOR_HEIGHT - 24));
        return { ...b, x: nextX, y: nextY };
      })
    );
  }, [isDragging, selectedBlockId]);

  const handleMouseUp = () => setIsDragging(false);

  const handleValueChange = (blockId: string, value: string) => {
    setInputBlocks(blocks => blocks.map(b => b.id === blockId ? { ...b, value } : b));
  };

  // Update individual block styling
  const updateBlockStyle = (key: keyof TextInputBlock, value: string | number) => {
    if (!selectedBlockId) return;
    setInputBlocks(blocks => 
      blocks.map(b => b.id === selectedBlockId ? { ...b, [key]: value } : b)
    );
  };

  const incrementSeries = (value: string, increment: number): string => {
    const match = value.match(/^(.*?)(\d+)$/);
    if (match) {
      const [, prefix, numStr] = match;
      const num = parseInt(numStr, 10) + increment;
      return `${prefix}${num.toString().padStart(numStr.length, '0')}`;
    }
    return value;
  };

  const parseSeriesValues = (): string[] => {
    if (!seriesInput.trim()) {
      const primaryBlock = inputBlocks.find(b => b.value && /\d+$/.test(b.value));
      if (primaryBlock) {
        const totalSlots = totalPages * 4;
        return Array.from({ length: totalSlots }, (_, i) => incrementSeries(primaryBlock.value, i));
      }
      return [];
    }
    
    const rangeMatch = seriesInput.match(/^(.+?)(\d+)\s*[→\-]\s*\1(\d+)$/);
    if (rangeMatch) {
      const [, prefix, startNum, endNum] = rangeMatch;
      const start = parseInt(startNum, 10);
      const end = parseInt(endNum, 10);
      const padLength = startNum.length;
      return Array.from({ length: end - start + 1 }, (_, i) => 
        `${prefix}${(start + i).toString().padStart(padLength, '0')}`
      );
    }
    
    return seriesInput.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
  };

  const handleGenerateOutput = () => {
    if (inputBlocks.length === 0) {
      toast.error('Add at least one series input.');
      return;
    }
    
    const primaryBlock = inputBlocks.find(b => b.value && /\d+$/.test(b.value));
    if (!primaryBlock) {
      toast.error('Enter a series value with numbers.');
      return;
    }

    const seriesValues = parseSeriesValues();
    if (seriesValues.length === 0) {
      toast.error('No series values to generate.');
      return;
    }

    const SLOTS_PER_PAGE = 4;
    const pages: OutputPage[] = [];
    
    for (let i = 0; i < seriesValues.length; i++) {
      const pageIndex = Math.floor(i / SLOTS_PER_PAGE);
      const slotInPage = i % SLOTS_PER_PAGE;
      
      if (!pages[pageIndex]) {
        pages[pageIndex] = { pageNumber: pageIndex + 1, slots: [] };
      }
      
      const slotBlocks = inputBlocks.map(block => {
        const xPercent = (block.x / EDITOR_WIDTH) * 100;
        const yPercent = (block.y / EDITOR_HEIGHT) * 100;
        
        let value = block.value;
        if (block.id === primaryBlock.id) {
          value = seriesValues[i];
        } else if (/\d+$/.test(block.value)) {
          value = incrementSeries(block.value, i);
        }
        
        return {
          x: xPercent,
          y: yPercent,
          value,
          fontSize: block.fontSize,
          fontFamily: block.fontFamily,
          color: block.color,
          rotation: block.rotation,
        };
      });
      
      pages[pageIndex].slots.push({ blocks: slotBlocks });
    }

    const lastPage = pages[pages.length - 1];
    while (lastPage.slots.length < SLOTS_PER_PAGE) {
      lastPage.slots.push({ blocks: [] });
    }

    setOutputPages(pages);
    setShowOutput(true);
    toast.success(`Generated ${pages.length} pages.`);
  };

  const handlePrint = () => {
    if (outputPages.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Allow popups for printing.');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Series Output</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial; }
            .page { 
              width: 210mm; 
              height: 297mm; 
              page-break-after: always;
              display: flex;
              flex-direction: column;
              position: relative;
            }
            .page:last-child { page-break-after: avoid; }
            .slot {
              flex: 1;
              border-bottom: 1px solid #ddd;
              position: relative;
            }
            .slot:last-child { border-bottom: none; }
            .series-text { position: absolute; }
            .page-number {
              position: absolute;
              bottom: 5mm;
              right: 5mm;
              font-size: 10pt;
              color: #999;
            }
          </style>
        </head>
        <body>
          ${outputPages.map(page => `
            <div class="page">
              ${page.slots.map(slot => `
                <div class="slot">
                  ${slot.blocks.map(block => `
                    <span class="series-text" style="
                      left: ${block.x}%;
                      top: ${block.y}%;
                      font-size: ${block.fontSize}pt;
                      font-family: ${block.fontFamily};
                      color: ${block.color};
                      transform: rotate(${block.rotation}deg);
                    ">${block.value}</span>
                  `).join('')}
                </div>
              `).join('')}
              <span class="page-number">p${page.pageNumber}</span>
            </div>
          `).join('')}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const parsedPreview = parseSeriesValues();

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Editor */}
      <div className="w-[420px] border-r border-border p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="font-semibold text-foreground">Series Number Editor</h2>
        </div>

        {/* Input Slot */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary">Input Slot (Single Template)</span>
          </div>
          
          <div
            ref={editorRef}
            className="relative rounded border-2 border-primary/40 bg-[#4a7cc9] overflow-hidden cursor-crosshair"
            style={{ width: EDITOR_WIDTH, height: EDITOR_HEIGHT }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {inputBlocks.map((block) => (
              <div
                key={block.id}
                className={`absolute cursor-move ${selectedBlockId === block.id ? 'ring-2 ring-white' : ''}`}
                style={{ left: block.x, top: block.y, transform: `rotate(${block.rotation}deg)` }}
                onMouseDown={(e) => handleMouseDown(e, block.id)}
              >
                <div className="flex items-center bg-white rounded shadow-md px-2 py-1">
                  <Move className="h-3 w-3 text-muted-foreground mr-1 flex-shrink-0" />
                  <input
                    type="text"
                    value={block.value}
                    onChange={(e) => handleValueChange(block.id, e.target.value)}
                    onClick={(e) => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                    className="bg-transparent border-none focus:outline-none min-w-[80px]"
                    style={{ fontSize: block.fontSize, fontFamily: block.fontFamily, color: block.color }}
                    placeholder="Series"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-primary mt-2">Enter first series number → auto-increments for all slots</p>
        </div>

        {/* Series Input */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-3">
          <span className="text-xs font-medium text-primary">Series Input (Optional)</span>
          
          <div>
            <Label className="text-xs text-primary">Total Pages (4 slots per page)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={totalPages}
                onChange={(e) => setTotalPages(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={500}
                className="w-20 h-8 bg-background border-border text-sm"
              />
              <span className="text-xs text-primary">= {totalPages * 4} items</span>
            </div>
          </div>
          
          <div>
            <Label className="text-xs text-primary">Or enter custom series (optional)</Label>
            <Textarea
              value={seriesInput}
              onChange={(e) => setSeriesInput(e.target.value)}
              placeholder="As002-As0050"
              className="bg-background border-border h-16 text-sm mt-1"
            />
          </div>
          
          {parsedPreview.length > 0 && (
            <p className="text-xs text-primary">
              Preview: {parsedPreview.slice(0, 5).join(', ')}
              {parsedPreview.length > 5 && ` ... (${parsedPreview.length} total)`}
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Output Preview */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 p-3 border-b border-border">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <Settings className="h-3.5 w-3.5" />
                Tools
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-card">
              <SheetHeader>
                <SheetTitle>Edit Tools</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <Button onClick={handleAddInputBlock} size="sm" className="w-full gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Series Input
                </Button>
                
                {selectedBlockId && (
                  <Button onClick={handleDeleteBlock} variant="destructive" size="sm" className="w-full gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                )}

                <div className="h-px bg-border my-3" />

                <div className="space-y-2">
                  <h4 className="text-xs font-medium">Per-Word Styling</h4>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Font Size</Label>
                    <Input
                      type="number"
                      value={selectedBlock?.fontSize || fontSize}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 14;
                        setFontSize(val);
                        if (selectedBlockId) updateBlockStyle('fontSize', val);
                      }}
                      min={8}
                      max={72}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Font Family</Label>
                    <select
                      className="w-full h-8 px-2 rounded border border-border bg-background text-sm"
                      value={selectedBlock?.fontFamily || fontFamily}
                      onChange={(e) => {
                        setFontFamily(e.target.value);
                        if (selectedBlockId) updateBlockStyle('fontFamily', e.target.value);
                      }}
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="flex gap-1">
                      <Input
                        type="color"
                        value={selectedBlock?.color || textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          if (selectedBlockId) updateBlockStyle('color', e.target.value);
                        }}
                        className="w-10 h-8 p-0.5 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={selectedBlock?.color || textColor}
                        onChange={(e) => {
                          setTextColor(e.target.value);
                          if (selectedBlockId) updateBlockStyle('color', e.target.value);
                        }}
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Rotation (°)</Label>
                    <Input
                      type="number"
                      value={selectedBlock?.rotation || rotation}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setRotation(val);
                        if (selectedBlockId) updateBlockStyle('rotation', val);
                      }}
                      min={-180}
                      max={180}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <Button onClick={handleGenerateOutput} size="sm" className="gap-1.5 h-8" disabled={inputBlocks.length === 0}>
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          
          {showOutput && outputPages.length > 0 && (
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 h-8">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
          )}
        </div>

        {/* Output Area */}
        <ScrollArea className="flex-1 p-4">
          {!showOutput ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Click "Preview" to generate output
            </div>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">{outputPages.length} pages</span>
              <div className="space-y-3">
                {outputPages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="relative bg-white rounded border border-gray-200 shadow-sm"
                    style={{ width: 200, height: 283 }}
                  >
                    <div className="flex flex-col h-full">
                      {page.slots.map((slot, slotIndex) => (
                        <div
                          key={slotIndex}
                          className="relative flex-1 border-b border-gray-300 last:border-b-0"
                        >
                          {slot.blocks.map((block, blockIndex) => (
                            <span
                              key={blockIndex}
                              className="absolute"
                              style={{
                                left: `${block.x}%`,
                                top: `${block.y}%`,
                                fontSize: `${Math.max(8, block.fontSize * 0.5)}px`,
                                fontFamily: block.fontFamily,
                                color: block.color,
                                transform: `rotate(${block.rotation}deg)`,
                              }}
                            >
                              {block.value}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                    <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">
                      p{page.pageNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
