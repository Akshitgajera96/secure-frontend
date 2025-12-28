export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

export const parseSvgUserSpace = (noteSvg: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(noteSvg, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('Invalid SVG');
  }

  const vbAttr = root.getAttribute('viewBox');
  if (vbAttr) {
    const parts = vbAttr
      .trim()
      .split(/[\s,]+/)
      .map((v) => Number.parseFloat(v));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [x, y, width, height] = parts;
      if (width > 0 && height > 0) {
        return { x, y, width, height, inner: root.innerHTML };
      }
    }
  }

  const w = Number.parseFloat(root.getAttribute('width') || '');
  const h = Number.parseFloat(root.getAttribute('height') || '');
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { x: 0, y: 0, width: w, height: h, inner: root.innerHTML };
  }

  throw new Error('SVG missing viewBox/width/height');
};

export const computeUniformScaleToFit = (
  note: { width: number; height: number },
  rect: { width: number; height: number }
) => {
  return Math.min(rect.width / note.width, rect.height / note.height);
};

export const centerInRect = (
  note: { x: number; y: number; width: number; height: number },
  rect: { x: number; y: number; width: number; height: number },
  scale: number
) => {
  const rectCenterX = rect.x + rect.width / 2;
  const rectCenterY = rect.y + rect.height / 2;

  const noteCenterX = note.x + note.width / 2;
  const noteCenterY = note.y + note.height / 2;

  return {
    tx: rectCenterX - scale * noteCenterX,
    ty: rectCenterY - scale * noteCenterY,
  };
};

export const getSeriesPositionInNote = (note: { x: number; y: number; width: number; height: number }) => {
  return {
    x: note.x + note.width - 16,
    y: note.y + note.height / 2,
  };
};
