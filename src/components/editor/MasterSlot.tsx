import React from 'react';
import { Move } from 'lucide-react';

export interface MasterSlotData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
  // Slot object styling
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

interface MasterSlotProps {
  slot: MasterSlotData;
  isSelected: boolean;
  containerWidth: number;
  containerHeight: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onValueChange: (value: string) => void;
  onResizeStart: (e: React.MouseEvent, corner: string) => void;
}

export const MasterSlot: React.FC<MasterSlotProps> = ({
  slot,
  isSelected,
  containerWidth,
  containerHeight,
  onSelect,
  onDragStart,
  onValueChange,
  onResizeStart,
}) => {
  const pixelX = (slot.x / 100) * containerWidth;
  const pixelY = (slot.y / 100) * containerHeight;
  const pixelWidth = (slot.width / 100) * containerWidth;
  const pixelHeight = (slot.height / 100) * containerHeight;

  return (
    <div
      className={`absolute cursor-move group ${isSelected ? 'z-20' : 'z-10'}`}
      style={{
        left: pixelX,
        top: pixelY,
        width: pixelWidth,
        height: pixelHeight,
        transform: `rotate(${slot.rotation}deg)`,
        transformOrigin: 'center center',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onDragStart}
    >
      {/* Slot Object Frame - The actual styled container */}
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
          <input
            type="text"
            value={slot.value}
            onChange={(e) => onValueChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full bg-transparent border-none focus:outline-none"
            style={{
              fontSize: slot.fontSize,
              fontFamily: slot.fontFamily,
              color: slot.color,
              textAlign: slot.textAlign,
            }}
            placeholder="Enter series..."
          />
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
        <span className="text-[10px] text-muted-foreground font-medium">Drag to move</span>
      </div>

      {/* Resize handles - only show when selected */}
      {isSelected && (
        <>
          <div
            className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary rounded-full cursor-se-resize shadow-md border-2 border-background"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, 'se');
            }}
          />
          <div
            className="absolute -left-2 -bottom-2 w-4 h-4 bg-primary rounded-full cursor-sw-resize shadow-md border-2 border-background"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, 'sw');
            }}
          />
          <div
            className="absolute -right-2 -top-2 w-4 h-4 bg-primary rounded-full cursor-ne-resize shadow-md border-2 border-background"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, 'ne');
            }}
          />
          <div
            className="absolute -left-2 -top-2 w-4 h-4 bg-primary rounded-full cursor-nw-resize shadow-md border-2 border-background"
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, 'nw');
            }}
          />
        </>
      )}
    </div>
  );
};
