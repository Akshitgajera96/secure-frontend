import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Type } from 'lucide-react';
import type { SeriesSlotData } from './SeriesSlot';

interface TicketPropertiesPanelProps {
  slot: SeriesSlotData | null;
  onUpdateSlot: (updates: Partial<SeriesSlotData>) => void;
  onUpdateLetterFontSize: (index: number, fontSize: number) => void;
  onUpdateLetterOffset: (index: number, offsetY: number) => void;
  availableFonts?: string[];
}

const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Helvetica',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Monaco',
];

export const TicketPropertiesPanel: React.FC<TicketPropertiesPanelProps> = ({
  slot,
  onUpdateSlot,
  onUpdateLetterFontSize,
  onUpdateLetterOffset,
  availableFonts,
}) => {
  if (!slot) {
    return (
      <div className="w-80 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Add a series slot to edit properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Slot Properties</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Style your series slot</p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Per-Letter Font Size Control */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Type className="h-3 w-3" />
            Per-Letter Font Size
          </Label>
          
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-center gap-1 flex-wrap">
              {slot.value.split('').map((letter, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center bg-background rounded px-2 py-1 border border-border gap-1"
                >
                  <span
                    className="font-mono font-bold"
                    style={{
                      fontSize: Math.min(slot.letterStyles[index]?.fontSize || slot.defaultFontSize, 24),
                      color: slot.color,
                    }}
                  >
                    {letter}
                  </span>
                  <Input
                    type="number"
                    value={slot.letterStyles[index]?.fontSize || slot.defaultFontSize}
                    onChange={(e) => onUpdateLetterFontSize(index, parseInt(e.target.value) || 12)}
                    className="w-12 h-6 text-[10px] text-center p-1"
                    min={8}
                    max={72}
                  />
                  <Input
                    type="number"
                    value={slot.letterStyles[index]?.offsetY || 0}
                    onChange={(e) => onUpdateLetterOffset(index, parseInt(e.target.value) || 0)}
                    className="w-12 h-6 text-[10px] text-center p-1"
                    min={-50}
                    max={50}
                    placeholder="Y"
                  />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Adjust font size for each letter individually
            </p>
          </div>

          {/* Default Font Size */}
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Default Font Size (px)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[slot.defaultFontSize]}
                onValueChange={([v]) => onUpdateSlot({ defaultFontSize: v })}
                min={8}
                max={72}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={slot.defaultFontSize}
                onChange={(e) => onUpdateSlot({ defaultFontSize: parseInt(e.target.value) || 14 })}
                className="w-16 h-7 text-xs"
                min={8}
                max={72}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Typography */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Typography</Label>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Font Family</Label>
            <select
              value={slot.fontFamily}
              onChange={(e) => onUpdateSlot({ fontFamily: e.target.value })}
              className="w-full h-8 px-2 rounded border border-input bg-background text-sm"
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
              {availableFonts
                ?.filter((font) => !FONT_FAMILIES.includes(font))
                .map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Text Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={slot.color}
                onChange={(e) => onUpdateSlot({ color: e.target.value })}
                className="w-10 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={slot.color}
                onChange={(e) => onUpdateSlot({ color: e.target.value })}
                className="flex-1 h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Text Alignment</Label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onUpdateSlot({ textAlign: align })}
                  className={`flex-1 h-8 rounded border text-xs capitalize transition-colors ${
                    slot.textAlign === align
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Slot Frame */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Slot Frame</Label>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Background</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={slot.backgroundColor === 'transparent' ? '#ffffff' : slot.backgroundColor}
                onChange={(e) => onUpdateSlot({ backgroundColor: e.target.value })}
                className="w-10 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={slot.backgroundColor}
                onChange={(e) => onUpdateSlot({ backgroundColor: e.target.value })}
                className="flex-1 h-8 text-xs font-mono"
                placeholder="transparent or #hex"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Border Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={slot.borderColor}
                onChange={(e) => onUpdateSlot({ borderColor: e.target.value })}
                className="w-10 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={slot.borderColor}
                onChange={(e) => onUpdateSlot({ borderColor: e.target.value })}
                className="flex-1 h-8 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Border Width</Label>
              <Input
                type="number"
                value={slot.borderWidth}
                onChange={(e) => onUpdateSlot({ borderWidth: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs"
                min={0}
                max={10}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Border Radius</Label>
              <Input
                type="number"
                value={slot.borderRadius}
                onChange={(e) => onUpdateSlot({ borderRadius: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs"
                min={0}
                max={50}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Padding */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Padding (px)</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Top</Label>
              <Input
                type="number"
                value={slot.paddingTop}
                onChange={(e) => onUpdateSlot({ paddingTop: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Bottom</Label>
              <Input
                type="number"
                value={slot.paddingBottom}
                onChange={(e) => onUpdateSlot({ paddingBottom: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Left</Label>
              <Input
                type="number"
                value={slot.paddingLeft}
                onChange={(e) => onUpdateSlot({ paddingLeft: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs"
                min={0}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Right</Label>
              <Input
                type="number"
                value={slot.paddingRight}
                onChange={(e) => onUpdateSlot({ paddingRight: Math.max(0, parseInt(e.target.value) || 0) })}
                className="h-7 text-xs"
                min={0}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Transform */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Transform</Label>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Rotation (deg)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[slot.rotation]}
                onValueChange={([v]) => onUpdateSlot({ rotation: v })}
                min={-180}
                max={180}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={slot.rotation}
                onChange={(e) => onUpdateSlot({ rotation: parseInt(e.target.value) || 0 })}
                className="w-16 h-7 text-xs"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Position & Size */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Position & Size</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">X Position</Label>
              <Input
                type="number"
                value={Number.isFinite(slot.x) ? slot.x : 0}
                onChange={(e) => onUpdateSlot({ x: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Y Position</Label>
              <Input
                type="number"
                value={Number.isFinite(slot.y) ? slot.y : 0}
                onChange={(e) => onUpdateSlot({ y: parseFloat(e.target.value) || 0 })}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Width</Label>
              <Input
                type="number"
                value={Math.round(slot.width)}
                onChange={(e) => onUpdateSlot({ width: Math.max(5, parseFloat(e.target.value) || 20) })}
                className="h-7 text-xs"
                min={5}
                max={100}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Height</Label>
              <Input
                type="number"
                value={Math.round(slot.height)}
                onChange={(e) => onUpdateSlot({ height: Math.max(5, parseFloat(e.target.value) || 10) })}
                className="h-7 text-xs"
                min={5}
                max={100}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
