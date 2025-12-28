import React, { useEffect, useMemo, useState } from 'react';
import { Move } from 'lucide-react';
import { useDraggableSlot } from '@/hooks/useDraggableSlot';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface LetterStyle {
  fontSize: number;
  offsetY?: number; // vertical offset in px (positive = down)
}

export interface SeriesSlotData {
  id: string;
  x: number; // ratio relative to visible artwork (0..1, overflow allowed)
  y: number; // ratio relative to visible artwork (0..1, overflow allowed)
  width: number; // percentage
  height: number; // percentage
  value: string;
  // Optional per-slot series configuration (starting series for this slot)
  startingSeries?: string;
  // Optional per-slot increment (defaults to 1 if not set)
  seriesIncrement?: number;
  letterStyles: LetterStyle[]; // per-letter font sizes
  defaultFontSize: number;
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

interface SeriesSlotProps {
  slot: SeriesSlotData;
  isSelected: boolean;
  containerWidth: number;
  containerHeight: number;
  slotScale: number;
  onSelect: () => void;
  onPositionChange: (slotId: string, next: { x: number; y: number }) => void;
}

export const SeriesSlot: React.FC<SeriesSlotProps> = ({
  slot,
  isSelected,
  containerWidth,
  containerHeight,
  slotScale,
  onSelect,
  onPositionChange,
}) => {
  const [fontMetrics, setFontMetrics] = useState<{ ascent: number; descent: number; height: number } | null>(null);
  const [fontMetricsError, setFontMetricsError] = useState<string | null>(null);

  const fontKey = useMemo(() => {
    const name = (slot.fontFamily || '').toLowerCase();
    if (name.includes('times')) return StandardFonts.TimesRoman;
    if (name.includes('courier')) return StandardFonts.Courier;
    return StandardFonts.Helvetica;
  }, [slot.fontFamily]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const fontSize = Number(slot.defaultFontSize);
      if (!Number.isFinite(fontSize) || fontSize <= 0) {
        throw new Error('Invalid fontSize for font metrics');
      }

      const finalFontSize = fontSize * slotScale;
      if (!Number.isFinite(finalFontSize) || finalFontSize <= 0) {
        throw new Error('Invalid finalFontSize for font metrics');
      }

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(fontKey);

      const ascent = Number(font.heightAtSize(finalFontSize, { descender: false }));
      const height = Number(font.heightAtSize(finalFontSize, { descender: true }));
      const descent = Math.max(0, height - ascent);

      if (![ascent, descent, height].every((n) => Number.isFinite(n)) || height <= 0) {
        throw new Error('Font metrics unavailable (pdf-lib heightAtSize failed)');
      }

      if (!cancelled) {
        setFontMetrics({ ascent, descent, height });
        setFontMetricsError(null);
      }
    };

    run().catch((e) => {
      const msg = e instanceof Error ? e.message : 'Failed to compute font metrics';
      if (!cancelled) {
        setFontMetrics(null);
        setFontMetricsError(msg);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fontKey, slot.defaultFontSize, slotScale]);

  const resolvedFontMetrics = fontMetrics ?? { ascent: 0, descent: 0, height: 0 };

  const { onPointerDown } = useDraggableSlot(
    slot.id,
    { x: slot.x, y: slot.y, width: slot.width, height: slot.height },
    {
      enabled: Boolean(fontMetrics) && !fontMetricsError,
      containerSize: { width: containerWidth, height: containerHeight },
      slotScale,
      objectBBoxPx: { width: containerWidth, height: containerHeight },
      fontMetrics: resolvedFontMetrics,
      appliedVisualOffsetY: 0,
      onSelect,
      onPositionChange,
    }
  );

  if (fontMetricsError) {
    throw new Error(fontMetricsError);
  }
  if (!fontMetrics) {
    return null;
  }

  const pixelX = slot.x * containerWidth;
  const pixelTop = slot.y * containerHeight;
  const pixelWidth = (slot.width / 100) * containerWidth;
  const pixelHeight = (slot.height / 100) * containerHeight;

  // Render each letter with individual font size
  const renderLetters = () => {
    return slot.value.split('').map((letter, index) => {
      const letterStyle = slot.letterStyles[index];
      const fontSize = letterStyle?.fontSize || slot.defaultFontSize;
      const offsetY = letterStyle?.offsetY || 0;

      return (
        <span
          key={index}
          style={{
            fontSize: fontSize * slotScale,
            fontFamily: slot.fontFamily,
            color: slot.color,
            display: 'inline-block',
            transform: `translateY(${offsetY * slotScale}px)`,
          }}
        >
          {letter}
        </span>
      );
    });
  };

  return (
    <div
      className={`absolute cursor-move group ${isSelected ? 'z-20' : 'z-10'}`}
      style={{
        left: pixelX,
        top: pixelTop,
        width: pixelWidth,
        height: pixelHeight,
        transform: `rotate(${slot.rotation}deg)`,
        transformOrigin: 'center center',
      }}
      onPointerDown={onPointerDown}
    >
      {/* Slot Frame */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundColor: slot.backgroundColor,
          borderColor: slot.borderColor,
          borderWidth: slot.borderWidth,
          borderStyle: 'solid',
          borderRadius: slot.borderRadius,
        }}
      >
        {/* Inner content area with padding */}
        <div
          className="w-full h-full flex items-center"
          style={{
            paddingTop: slot.paddingTop,
            paddingBottom: slot.paddingBottom,
            paddingLeft: slot.paddingLeft,
            paddingRight: slot.paddingRight,
            justifyContent: slot.textAlign === 'left' ? 'flex-start' : slot.textAlign === 'right' ? 'flex-end' : 'center',
          }}
        >
          {/* Per-letter rendering */}
          <div 
            className="flex items-baseline"
            style={{
              justifyContent: slot.textAlign === 'left' ? 'flex-start' : slot.textAlign === 'right' ? 'flex-end' : 'center',
              width: '100%',
            }}
          >
            {renderLetters()}
          </div>
        </div>
      </div>

      {/* Selection ring */}
      <div
        className={`absolute inset-0 rounded pointer-events-none transition-all ${
          isSelected 
            ? 'ring-2 ring-primary ring-offset-2' 
            : 'group-hover:ring-2 group-hover:ring-primary/50'
        }`}
        style={{ borderRadius: slot.borderRadius }}
      />

      {/* Drag handle */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card/95 backdrop-blur rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-border">
        <Move className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-medium">Series Slot</span>
      </div>
    </div>
  );
};
