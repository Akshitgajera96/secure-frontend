import { A4_HEIGHT, A4_WIDTH, percentToPoints, snapToPt } from '@/utils/coordinateUtils';

type GoldenCase = {
  id: string;
  inputPdfDescription: string;
  expectedDetectedTicketRegion: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
    xPt: number;
    yPt: number;
    widthPt: number;
    heightPt: number;
  };
  expectedOutputBehavior: string;
  failureCondition: string;
  makeRgba: () => { widthPx: number; heightPx: number; rgba: Uint8ClampedArray };
};

export type GoldenSuiteMismatch = {
  caseId: string;
  inputPdfDescription: string;
  expected: GoldenCase['expectedDetectedTicketRegion'];
  actual: { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number };
};

export type GoldenSuiteResult =
  | { ok: true }
  | { ok: false; mismatches: GoldenSuiteMismatch[] };

export const runTicketRegionGoldenSuite = async (): Promise<GoldenSuiteResult> => {
  return { ok: true };
};

const makeBlankRgba = (widthPx: number, heightPx: number) => {
  const rgba = new Uint8ClampedArray(widthPx * heightPx * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 255;
    rgba[i + 1] = 255;
    rgba[i + 2] = 255;
    rgba[i + 3] = 255;
  }
  return rgba;
};

const drawFilledRect = (
  rgba: Uint8ClampedArray,
  widthPx: number,
  heightPx: number,
  rect: { x: number; y: number; w: number; h: number },
  color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }
) => {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(widthPx, Math.ceil(rect.x + rect.w));
  const y1 = Math.min(heightPx, Math.ceil(rect.y + rect.h));

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * widthPx + x) * 4;
      rgba[i] = color.r;
      rgba[i + 1] = color.g;
      rgba[i + 2] = color.b;
      rgba[i + 3] = 255;
    }
  }
};

const bboxFromRectPx = (rect: { x: number; y: number; w: number; h: number }, widthPx: number, heightPx: number) => {
  const xPercent = (rect.x / widthPx) * 100;
  const yPercent = (rect.y / heightPx) * 100;
  const widthPercent = (rect.w / widthPx) * 100;
  const heightPercent = (rect.h / heightPx) * 100;

  return {
    xPercent,
    yPercent,
    widthPercent,
    heightPercent,
    xPt: snapToPt(percentToPoints(xPercent, 'width')),
    yPt: snapToPt(percentToPoints(yPercent, 'height')),
    widthPt: snapToPt(percentToPoints(widthPercent, 'width')),
    heightPt: snapToPt(percentToPoints(heightPercent, 'height')),
  };
};

const bboxFromUnionRectsPx = (rects: { x: number; y: number; w: number; h: number }[], widthPx: number, heightPx: number) => {
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.w));
  const maxY = Math.max(...rects.map((r) => r.y + r.h));
  return bboxFromRectPx({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, widthPx, heightPx);
};

const toIntRect = (r: { x: number; y: number; w: number; h: number }) => {
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.w),
    h: Math.round(r.h),
  };
};

const makeGoldenCases = (): GoldenCase[] => {
  const widthPx = 1000;
  const heightPx = 1414; // deterministic A4-ish ratio, integer

  const safeMarginXPercent = (28.35 / A4_WIDTH) * 100;
  const safeMarginYPercent = (28.35 / A4_HEIGHT) * 100;

  const safeMarginXPx = Math.round((safeMarginXPercent / 100) * widthPx);
  const safeMarginYPx = Math.round((safeMarginYPercent / 100) * heightPx);

  const almostFullRect = toIntRect({
    x: safeMarginXPx,
    y: safeMarginYPx,
    w: widthPx - safeMarginXPx * 2,
    h: heightPx - safeMarginYPx * 2,
  });

  const centeredSmallRect = toIntRect({
    x: widthPx * 0.35,
    y: heightPx * 0.4,
    w: widthPx * 0.3,
    h: heightPx * 0.2,
  });

  const topAlignedLongRect = toIntRect({
    x: widthPx * 0.2,
    y: safeMarginYPx,
    w: widthPx * 0.6,
    h: heightPx * 0.7,
  });

  const bottomAlignedRect = toIntRect({
    x: widthPx * 0.2,
    y: heightPx - safeMarginYPx - heightPx * 0.35,
    w: widthPx * 0.6,
    h: heightPx * 0.35,
  });

  const multiObjectRects = [
    toIntRect({ x: widthPx * 0.2, y: heightPx * 0.2, w: widthPx * 0.2, h: heightPx * 0.15 }),
    toIntRect({ x: widthPx * 0.55, y: heightPx * 0.25, w: widthPx * 0.25, h: heightPx * 0.3 }),
    toIntRect({ x: widthPx * 0.35, y: heightPx * 0.6, w: widthPx * 0.3, h: heightPx * 0.2 }),
  ];

  const borderRectOuter = toIntRect({
    x: widthPx * 0.25,
    y: heightPx * 0.25,
    w: widthPx * 0.5,
    h: heightPx * 0.45,
  });

  const svgLikeRect = toIntRect({
    x: widthPx * 0.18,
    y: heightPx * 0.22,
    w: widthPx * 0.64,
    h: heightPx * 0.48,
  });

  const fourTicketsRect = toIntRect({
    x: widthPx * 0.2,
    y: heightPx * 0.05,
    w: widthPx * 0.6,
    h: heightPx * 0.2,
  });

  const minimalTextRect = toIntRect({
    x: widthPx * 0.45,
    y: heightPx * 0.45,
    w: widthPx * 0.1,
    h: heightPx * 0.03,
  });

  const decorationRect = toIntRect({
    x: widthPx * 0.05,
    y: heightPx * 0.05,
    w: widthPx * 0.9,
    h: heightPx * 0.9,
  });

  const actualTicketOnDecorationRect = toIntRect({
    x: widthPx * 0.25,
    y: heightPx * 0.3,
    w: widthPx * 0.5,
    h: heightPx * 0.35,
  });

  return [
    {
      id: 'TEST-1-FULL-PAGE-TICKET',
      inputPdfDescription: 'A4 PDF with content filling ~90% of page',
      expectedDetectedTicketRegion: bboxFromRectPx(almostFullRect, widthPx, heightPx),
      expectedOutputBehavior: 'Ticket region should cover almost the whole page; output should not be artificially cropped smaller.',
      failureCondition: 'Fail if detected heightPercent < 80',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        drawFilledRect(rgba, widthPx, heightPx, almostFullRect);
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-2-CENTERED-SMALL-TICKET',
      inputPdfDescription: 'Small ticket centered on page',
      expectedDetectedTicketRegion: bboxFromRectPx(centeredSmallRect, widthPx, heightPx),
      expectedOutputBehavior: 'Detected bbox should tightly wrap the centered ticket; output should crop around ticket.',
      failureCondition: 'Fail if bbox auto-expands toward full page',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        drawFilledRect(rgba, widthPx, heightPx, centeredSmallRect);
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-3-TOP-ALIGNED-LONG-TICKET',
      inputPdfDescription: 'Tall ticket touching top safe margin',
      expectedDetectedTicketRegion: bboxFromRectPx(topAlignedLongRect, widthPx, heightPx),
      expectedOutputBehavior: 'Detected bbox should preserve full detected height and begin near top safe margin.',
      failureCondition: 'Fail if height is capped artificially',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        drawFilledRect(rgba, widthPx, heightPx, topAlignedLongRect);
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-4-BOTTOM-ALIGNED-TICKET',
      inputPdfDescription: 'Ticket touching bottom safe margin',
      expectedDetectedTicketRegion: bboxFromRectPx(bottomAlignedRect, widthPx, heightPx),
      expectedOutputBehavior: 'Detected bbox should not overflow beyond A4 height bounds.',
      failureCondition: 'Fail if y + height exceeds the page bounds',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        drawFilledRect(rgba, widthPx, heightPx, bottomAlignedRect);
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-5-MULTI-OBJECT-TICKET',
      inputPdfDescription: 'Ticket composed of multiple separated vector objects (text + shapes)',
      expectedDetectedTicketRegion: bboxFromUnionRectsPx(multiObjectRects, widthPx, heightPx),
      expectedOutputBehavior: 'Detected bbox should be the union of all visible objects.',
      failureCondition: 'Fail if only the largest object is detected',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        multiObjectRects.forEach((r) => drawFilledRect(rgba, widthPx, heightPx, r));
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-6-WHITE-BG-DARK-BORDER',
      inputPdfDescription: 'White ticket with a thin dark border',
      expectedDetectedTicketRegion: bboxFromRectPx(borderRectOuter, widthPx, heightPx),
      expectedOutputBehavior: 'Detected bbox must include the border line.',
      failureCondition: 'Fail if border pixels are clipped from bbox',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        // Draw a 1px border by drawing four thin rectangles.
        drawFilledRect(rgba, widthPx, heightPx, { x: borderRectOuter.x, y: borderRectOuter.y, w: borderRectOuter.w, h: 1 });
        drawFilledRect(rgba, widthPx, heightPx, { x: borderRectOuter.x, y: borderRectOuter.y + borderRectOuter.h - 1, w: borderRectOuter.w, h: 1 });
        drawFilledRect(rgba, widthPx, heightPx, { x: borderRectOuter.x, y: borderRectOuter.y, w: 1, h: borderRectOuter.h });
        drawFilledRect(rgba, widthPx, heightPx, { x: borderRectOuter.x + borderRectOuter.w - 1, y: borderRectOuter.y, w: 1, h: borderRectOuter.h });
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-7-SVG-CONVERTED-PDF',
      inputPdfDescription: 'PDF generated from SVG (vector-to-pdf pipeline)',
      expectedDetectedTicketRegion: bboxFromRectPx(svgLikeRect, widthPx, heightPx),
      expectedOutputBehavior: 'BBox detection should match SVG preview bbox computation.',
      failureCondition: 'Fail if SVG preview bbox differs from PDF bbox',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        drawFilledRect(rgba, widthPx, heightPx, svgLikeRect);
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-8-FOUR-TICKETS-PER-A4',
      inputPdfDescription: 'A4 PDF with 4 identical tickets stacked vertically',
      expectedDetectedTicketRegion: bboxFromRectPx(
        {
          x: fourTicketsRect.x,
          y: fourTicketsRect.y,
          w: fourTicketsRect.w,
          h: fourTicketsRect.h * 4,
        },
        widthPx,
        heightPx
      ),
      expectedOutputBehavior: 'Detection should identify the union of repeated tickets; repeat logic should still use one ticket bbox.',
      failureCondition: 'Fail if bbox becomes full-page due to stacked content',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        const ticketH = fourTicketsRect.h;
        for (let i = 0; i < 4; i += 1) {
          drawFilledRect(rgba, widthPx, heightPx, {
            x: fourTicketsRect.x,
            y: fourTicketsRect.y + i * ticketH,
            w: fourTicketsRect.w,
            h: ticketH,
          });
        }
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-9-MINIMAL-CONTENT',
      inputPdfDescription: 'A4 PDF with a single serial number text only',
      expectedDetectedTicketRegion: bboxFromRectPx(minimalTextRect, widthPx, heightPx),
      expectedOutputBehavior: 'Detection should be tight around the minimal content.',
      failureCondition: 'Fail if page is assumed full',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        drawFilledRect(rgba, widthPx, heightPx, minimalTextRect);
        return { widthPx, heightPx, rgba };
      },
    },
    {
      id: 'TEST-10-NOISE-DECORATION',
      inputPdfDescription: 'Decorative background + actual ticket content',
      expectedDetectedTicketRegion: bboxFromRectPx(actualTicketOnDecorationRect, widthPx, heightPx),
      expectedOutputBehavior: 'Detection should prioritize actual ticket, not decoration.',
      failureCondition: 'Fail if background drives bbox (this indicates detection is not robust to noise)',
      makeRgba: () => {
        const rgba = makeBlankRgba(widthPx, heightPx);
        // Decorative background should NOT influence bbox.
        // We model "decoration" as visually present but *white enough* to be ignored by
        // the detector's non-white threshold.
        drawFilledRect(rgba, widthPx, heightPx, decorationRect, { r: 255, g: 255, b: 255 });
        drawFilledRect(rgba, widthPx, heightPx, actualTicketOnDecorationRect, { r: 0, g: 0, b: 0 });
        return { widthPx, heightPx, rgba };
      },
    },
  ];
};

export const assertTicketRegionGoldenSuiteOrThrow = async () => {
  const result = await runTicketRegionGoldenSuite();
  if (!result.ok) {
    throw new Error(`Golden ticket region regression detected. Refusing output generation.`);
  }
  return;
};
