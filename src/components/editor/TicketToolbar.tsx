import React from 'react';
import { Plus, Trash2, Printer, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface TicketToolbarProps {
  hasSeriesSlot: boolean;
  hasTicketRegion: boolean;
  hasValidTicketRegion: boolean;
  startingSeries: string;
  endingSeries: string;
  totalPages: number;
  isGenerating: boolean;
  generatingLabel?: string;
  lastPreviewId: string | null;

  onAddSeriesSlot: () => void;
  onDeleteSeriesSlot: () => void;
  onStartingSeriesChange: (value: string) => void;
  onTotalPagesChange: (value: number) => void;
  onGenerateOutput: () => void;
  onViewAndPrint: () => void;
  onUploadFont: (file: File) => void;
  onUploadImage: (file: File) => void;
}

export const TicketToolbar: React.FC<TicketToolbarProps> = ({
  hasSeriesSlot,
  hasTicketRegion,
  hasValidTicketRegion,
  startingSeries,
  endingSeries,
  totalPages,
  isGenerating,
  generatingLabel,
  lastPreviewId,
  onAddSeriesSlot,
  onDeleteSeriesSlot,
  onStartingSeriesChange,
  onTotalPagesChange,
  onGenerateOutput,
  onViewAndPrint,
  onUploadFont,
  onUploadImage,
}) => {
  return (
    <div className="w-56 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Ticket Editor
        </h2>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Series Slot Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series Slot</Label>

          {/* Always allow adding new series slots so admin can place multiple boxes */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={onAddSeriesSlot}
              size="sm"
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Series Slot
            </Button>

            {hasSeriesSlot && (
              <Button
                onClick={onDeleteSeriesSlot}
                variant="destructive"
                size="sm"
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove Selected Slot
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Place series number on your ticket (you can add multiple boxes)
          </p>
        </div>

        <Separator />

        {/* Series Configuration */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series Config</Label>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Starting Series</Label>
            <Input
              value={startingSeries}
              onChange={(e) => onStartingSeriesChange(e.target.value)}
              placeholder="e.g. A001 or A 001"
              className="h-8 text-sm bg-background font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Supports spaces (e.g., A 001, B 0001)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Total Pages</Label>
            <Input
              type="number"
              value={totalPages}
              onChange={(e) => onTotalPagesChange(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={500}
              className="h-8 text-sm bg-background"
            />
            <p className="text-[10px] text-primary font-medium">
              {totalPages * 4} tickets total (4 per page)
            </p>
          </div>

          {/* Auto-calculated ending series */}
          <div className="p-2 bg-muted/50 rounded border border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Series Range</p>
            <p className="text-xs font-mono font-medium text-foreground">
              {startingSeries} → {endingSeries}
            </p>
          </div>
        </div>

        <Separator />

        {/* Generate & Preview */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Output</Label>
          
          <Button
            onClick={onGenerateOutput}
            disabled={!hasTicketRegion || !hasValidTicketRegion || !hasSeriesSlot || !startingSeries || isGenerating}
            size="sm"
            className="w-full gap-2"
          >
            <Eye className="h-4 w-4" />
            {isGenerating ? generatingLabel || 'Generating...' : 'Generate Output'}
          </Button>

          {lastPreviewId && (
            <Button
              onClick={onViewAndPrint}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Printer className="h-4 w-4" />
              View & Print
            </Button>
          )}
        </div>

        <Separator />

        {/* Custom Fonts */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Custom Font</Label>
          <input
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="block w-full text-[10px] text-muted-foreground file:mr-2 file:py-1 file:px-2 file:text-[10px] file:rounded file:border-0 file:bg-primary/10 file:text-primary cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadFont(file);
                e.target.value = '';
              }
            }}
          />
          <p className="text-[10px] text-muted-foreground">
            Upload .ttf, .otf, .woff for this session
          </p>
        </div>

        <Separator />

        {/* Custom Image (SVG/PNG/JPG) */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Custom Image</Label>
          <input
            type="file"
            accept=".svg,.png,.jpg,.jpeg"
            className="block w-full text-[10px] text-muted-foreground file:mr-2 file:py-1 file:px-2 file:text-[10px] file:rounded file:border-0 file:bg-primary/10 file:text-primary cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadImage(file);
                e.target.value = '';
              }
            }}
          />
          <p className="text-[10px] text-muted-foreground">
            Add logo or SVG; shown on top of ticket
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground text-center space-y-1">
          <p>1. Position series slot on A4</p>
          <p>2. Set starting series & pages</p>
          <p>3. Generate → View A4 output</p>
        </div>
      </div>
    </div>
  );
};