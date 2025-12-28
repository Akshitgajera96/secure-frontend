export type PrintableRegion = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type RgbaSurface = {
  widthPx: number;
  heightPx: number;
  rgba: Uint8ClampedArray;
};

export type DetectPrintableRegionOptions = {
  sampleStepPx?: number;
  nonWhiteThreshold?: number;
};

export type RenderSurface = HTMLCanvasElement | SVGSVGElement | RgbaSurface;
export const detectPrintableRegion = async (renderSurface: RenderSurface, options: DetectPrintableRegionOptions = {}): Promise<PrintableRegion> => {
  void renderSurface;
  void options;
  throw new Error('Printable region detection is disabled');
};
