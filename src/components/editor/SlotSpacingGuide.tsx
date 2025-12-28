import React from 'react';

export const SlotSpacingGuide: React.FC<{
  enabled: boolean;
  containerSize: { width: number; height: number };
  baseSlotYPt: number;
  slotHeightPt: number;
  slotSpacingPt: number;
  minSpacingPt: number;
  maxSpacingPt: number;
  onSlotSpacingChange: (nextPt: number) => void;
}> = () => {
  return null;
};
