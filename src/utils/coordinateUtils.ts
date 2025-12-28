// Frontend coordinate utilities - shared with backend logic
//
// STEP 1 — COORDINATE MODEL (SINGLE SOURCE OF TRUTH)
// -----------------------------------------------
// 1. All layout data is defined in a logical A4 PDF space, in **PostScript points**.
//    - `A4_WIDTH` / `A4_HEIGHT` define the absolute page size in points.
//    - Any persisted object positions/sizes must be expressed in this space.
// 2. The UI/editor never stores pixels as authoritative positions.
//    - Pixels are derived from PDF points via a single scalar `scale`.
//    - `scale` is computed by the A4 container (e.g. containerWidth / A4_WIDTH).
// 3. Screen/UI space is always a *projection* of PDF space:
//    - Given a PDF point value `pt` and a scalar `scale` → screen pixels = `pt * scale`.
//    - Given screen pixels `px` and the same `scale` → PDF points = `px / scale`.
//
// STEP 2 — INVARIANTS (NON‑NEGOTIABLE)
// ------------------------------------
// - Editor preview, output preview, and final PDF must correspond to the same
//   underlying PDF‑point coordinates.
// - All persisted positions and dimensions are in **A4 PDF points only**.
// - Any screen pixel value is a *derived view* and must be convertible back to
//   the original PDF point value using the same `scale`.
// - If an object is visible in the editor, the same PDF‑point object must be
//   used for output preview and PDF generation.
// - Drag boxes and resize handles are computed from the object’s bounding box
//   in PDF points and then projected to screen via `pdfToScreen`.
//
// STEP 3 — FLOW (DETECTION → PDF)
// -------------------------------
// Object detected → stored as PDF points → rendered in editor (scaled)
// → dragged/resized in screen pixels → converted back to PDF points with
// `screenToPdf` → rendered in output preview (scaled) → rendered in PDF.
//
// A4 SINGLE SOURCE OF TRUTH (ABSOLUTE)
export const A4_WIDTH = 595.28; // points
export const A4_HEIGHT = 841.89; // points
export const SAFE_MARGIN = 28.35; // 10mm

// Snap precision for PDF points (1/1000 pt granularity avoids drift).
const SNAP_PRECISION = 1000;

// ---------------------------------------------------------------------------
// Centralized A4 coordinate helpers (frontend)
// ---------------------------------------------------------------------------

// Convert a PDF‑point coordinate to screen/CSS pixels using a known scalar.
// - `pdfValuePt` is a coordinate or size in A4 PDF points.
// - `scale` is derived once from the rendered A4 container
//    e.g. `const scale = containerWidthPx / A4_WIDTH;`.
// No container/viewport math is done here; only point⇄pixel projection.
export const pdfToScreen = (pdfValuePt: number, scale: number): number => {
  return pdfValuePt * scale;
};

// Convert screen/CSS pixels back to PDF‑point coordinates using the
// *same* `scale` that was used for `pdfToScreen`.
// - `screenValuePx` is a coordinate or size measured in pixels.
// - `scale` must be the exact scalar used during rendering.
export const screenToPdf = (screenValuePx: number, scale: number): number => {
  if (!scale) return screenValuePx; // caller must ensure non‑zero scale; this avoids NaN.
  return screenValuePx / scale;
};

// Snap a PDF point value to stable precision suitable for layout.
// This should be used whenever we promote a derived float back into
// authoritative PDF‑space state.
export const snapToPt = (valuePt: number): number => {
  return Math.round(valuePt * SNAP_PRECISION) / SNAP_PRECISION;
};

// Helper for percentage to points conversion
export const percentToPoints = (percent: number, dimension: 'width' | 'height') => {
  return (percent / 100) * (dimension === 'width' ? A4_WIDTH : A4_HEIGHT);
};

// Helper for points to percentage conversion
export const pointsToPercent = (points: number, dimension: 'width' | 'height') => {
  return (points / (dimension === 'width' ? A4_WIDTH : A4_HEIGHT)) * 100;
};
