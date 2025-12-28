import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import type { MasterSlotData } from './MasterSlot';

interface RightPropertiesPanelProps {
  slot: MasterSlotData | null;
  onUpdateSlot: (updates: Partial<MasterSlotData>) => void;
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
];

export const RightPropertiesPanel: React.FC<RightPropertiesPanelProps> = ({
  slot,
  onUpdateSlot,
}) => {
  if (!slot) {
    return (
      <div className="w-72 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Add a master slot to edit its properties
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Slot Properties</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Style your slot object</p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Slot Background & Border */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Slot Frame</Label>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={slot.backgroundColor}
                onChange={(e) => onUpdateSlot({ backgroundColor: e.target.value })}
                className="w-10 h-8 p-0.5 cursor-pointer"
              />
              <Input
                type="text"
                value={slot.backgroundColor}
                onChange={(e) => onUpdateSlot({ backgroundColor: e.target.value })}
                className="flex-1 h-8 text-xs font-mono"
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

        {/* Typography */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Typography</Label>
          
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground">Font Size (px)</Label>
            <div className="flex items-center gap-2">
              <Slider
                value={[slot.fontSize]}
                onValueChange={([v]) => onUpdateSlot({ fontSize: v })}
                min={8}
                max={72}
                step={1}
                className="flex-1"
              />
              <Input
                type="number"
                value={slot.fontSize}
                onChange={(e) => onUpdateSlot({ fontSize: parseInt(e.target.value) || 14 })}
                className="w-16 h-7 text-xs"
                min={8}
                max={72}
              />
            </div>
          </div>

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

        {/* Dimensions */}
        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Position & Size (%)</Label>
          
          <div className="grid grid-cols-2 gap-2">
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
                onChange={(e) => onUpdateSlot({ height: Math.max(3, parseFloat(e.target.value) || 10) })}
                className="h-7 text-xs"
                min={3}
                max={100}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">X Position</Label>
              <Input
                type="number"
                value={Math.round(slot.x)}
                onChange={(e) => onUpdateSlot({ x: Math.max(0, Math.min(100 - slot.width, parseFloat(e.target.value) || 0)) })}
                className="h-7 text-xs"
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Y Position</Label>
              <Input
                type="number"
                value={Math.round(slot.y)}
                onChange={(e) => onUpdateSlot({ y: Math.max(0, Math.min(100 - slot.height, parseFloat(e.target.value) || 0)) })}
                className="h-7 text-xs"
                min={0}
                max={100}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
