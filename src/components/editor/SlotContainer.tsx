import React, { useRef } from 'react';
import { InlineSvgViewer } from './InlineSvgViewer';

interface SlotContainerProps {
  svgContent: string;
  slotWidthPx: number;
  slotHeightPx: number;
  artworkNaturalWidthPx: number;
  artworkNaturalHeightPx: number;
  slotScale: number;
  artworkOffsetX: number;
  artworkOffsetY: number;
}

export const SlotContainer: React.FC<SlotContainerProps> = ({
  svgContent,
  slotWidthPx,
  slotHeightPx,
  artworkNaturalWidthPx,
  artworkNaturalHeightPx,
  slotScale,
  artworkOffsetX,
  artworkOffsetY,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width: slotWidthPx,
        height: slotHeightPx,
        overflow: 'hidden', // Clip artwork to slot bounds like backend
      }}
    >
        {/* Artwork layer - rendered at natural size then scaled via transform */}
        <div
          className="absolute"
          style={{
            left: artworkOffsetX,
            top: artworkOffsetY,
            width: artworkNaturalWidthPx,
            height: artworkNaturalHeightPx,
            transform: `scale(${slotScale})`,
            transformOrigin: 'top left',
          }}
        >
          <InlineSvgViewer
            svgContent={svgContent}
            disableAutoCenter={true}
          />
        </div>

      <div className="hidden" />
    </div>
  );
};
