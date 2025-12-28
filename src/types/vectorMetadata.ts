// Vector metadata types - MUST MATCH BACKEND CONTRACT EXACTLY
export interface VectorMetadata {
  sourcePdfKey: string; // s3://documents/original/<uuid>.pdf
  
  ticketCrop: {
    pageIndex: number;
    xRatio: number;
    yRatio: number;
    widthRatio: number;
    heightRatio: number;

    xMm?: number | null;
    yMm?: number | null;
    widthMm?: number | null;
    heightMm?: number | null;
    cutMarginMm?: number | null;
    rotationDeg?: number | null;
    keepProportions?: boolean | null;
    alignment?: 'left' | 'center' | 'right' | null;
  };
  
  layout: {
    pageSize: "A4";
    repeatPerPage: number;
  };
  
  series: VectorSeries[];
  
  watermarks: VectorWatermark[];
}

export interface VectorSeries {
  id: string;
  prefix: string;
  start: number;
  step: number;
  font: string;
  fontSize: number;
  slots: VectorSlot[];
}

export interface VectorSlot {
  xRatio: number;
  yRatio: number;
}

export interface VectorWatermark {
  id: string;
  type: "text" | "svg";
  value?: string;
  svgPath?: string;
  opacity: number;
  rotate: number;
  scale?: number;
  position: {
    x: number;
    y: number;
  };
}

// Helper to convert from legacy TicketOutputPage to VectorMetadata
export const convertLegacyToVector = (
  sourcePdfKey: string,
  ticketCrop: any,
  legacyPages: any[]
): VectorMetadata => {
  // Extract series configuration from first page
  const firstPage = legacyPages[0];
  if (!firstPage) throw new Error('No pages to convert');
  
  const series: VectorSeries[] = firstPage.seriesSlots.map((slot: any, index: number) => ({
    id: slot.id,
    prefix: '', // Extract from slot.value if needed
    start: 1, // Extract from slot.startingSeries if needed
    step: 1,
    font: slot.fontFamily || 'Arial',
    fontSize: slot.defaultFontSize || 24,
    slots: [{
      xRatio: Number(slot.x),
      yRatio: Number(slot.y)
    }]
  }));
  
  const watermarks: VectorWatermark[] = [];
  
  return {
    sourcePdfKey,
    ticketCrop,
    layout: {
      pageSize: "A4",
      repeatPerPage: 4
    },
    series,
    watermarks
  };
};
