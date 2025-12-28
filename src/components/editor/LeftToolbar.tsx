import React from 'react';
import { Plus, Trash2, Printer, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface LeftToolbarProps {
  hasMasterSlot: boolean;
  startingSeries: string;
  totalPages: number;
  isGenerating: boolean;
  generatingLabel?: string;
  hasOutput: boolean;
  lastPreviewId?: string | null;
  onAddMasterSlot: () => void;
  onDeleteMasterSlot: () => void;
  onStartingSeriesChange: (value: string) => void;
  onTotalPagesChange: (value: number) => void;
  onGenerateOutput: () => void;
  onShowPreview: () => void;
  onViewGeneratedOutput?: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  hasMasterSlot,
  startingSeries,
  totalPages,
  isGenerating,
  generatingLabel,
  hasOutput,
  lastPreviewId,
  onAddMasterSlot,
  onDeleteMasterSlot,
  onStartingSeriesChange,
  onTotalPagesChange,
  onGenerateOutput,
  onShowPreview,
  onViewGeneratedOutput,
}) => {
  return (
    <div className="w-56 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Tools</h2>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Master Slot Controls */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Master Slot</Label>
          
          {!hasMasterSlot ? (
            <Button
              onClick={onAddMasterSlot}
              size="sm"
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Master Slot
            </Button>
          ) : (
            <Button
              onClick={onDeleteMasterSlot}
              variant="destructive"
              size="sm"
              className="w-full gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Master Slot
            </Button>
          )}
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
              placeholder="e.g. A001"
              className="h-8 text-sm bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Enter starting value with numbers
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
            <p className="text-[10px] text-muted-foreground">
              {totalPages * 4} slots total (4 per page)
            </p>
          </div>
        </div>

        <Separator />

        {/* Generate Output */}
        <div className="space-y-2">
          <Button
            onClick={onGenerateOutput}
            disabled={!hasMasterSlot || !startingSeries || isGenerating}
            size="sm"
            className="w-full gap-2"
          >
            <Eye className="h-4 w-4" />
            {isGenerating ? generatingLabel || 'Generating...' : 'Generate Output'}
          </Button>

          {lastPreviewId && onViewGeneratedOutput && (
            <Button
              onClick={onViewGeneratedOutput}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Printer className="h-4 w-4" />
              View Generated Output
            </Button>
          )}

          {hasOutput && (
            <Button
              onClick={onShowPreview}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <Printer className="h-4 w-4" />
              View & Print
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Position master slot on PDF → Generate → Print
        </p>
      </div>
    </div>
  );
};
