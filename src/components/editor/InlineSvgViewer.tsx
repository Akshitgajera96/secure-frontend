import React, { useLayoutEffect, useRef, useState } from 'react';
import { A4_HEIGHT, A4_WIDTH } from '@/utils/coordinateUtils';
import type { DetectedRegion } from './PDFCanvasViewer';

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'use',
  'symbol',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'style',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'filter',
  'feflood',
  'fecolormatrix',
  'fecomponenttransfer',
  'fecomposite',
  'feconvolvematrix',
  'fediffuselighting',
  'fedisplacementmap',
  'fedistantlight',
  'fedropshadow',
  'fefunca',
  'fefuncb',
  'fefuncg',
  'fefuncr',
  'fegaussianblur',
  'feimage',
  'femerge',
  'femergenode',
  'femorphology',
  'feoffset',
  'fepointlight',
  'fespecularlighting',
  'fespotlight',
  'fetile',
  'feturbulence',
  'pattern',
  'title',
  'desc',
]);
const ALLOWED_ATTRS = new Set([
  'd',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'points',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'opacity',
  'transform',
  'id',
  'class',
  'style',
  'clip-path',
  'mask',
  'filter',
  'patternunits',
  'patterncontentunits',
  'gradientunits',
  'gradienttransform',
  'offset',
  'stop-color',
  'stop-opacity',
  'in',
  'in2',
  'result',
  'stddeviation',
  'dx',
  'dy',
  'values',
  'type',
  'operator',
  'k1',
  'k2',
  'k3',
  'k4',
  'radius',
  'xchannelselector',
  'ychannelselector',
  'scale',
  'surfaceScale',
  'kernelunitlength',
  'kernelmatrix',
  'order',
  'preservealpha',
  'edgeMode',
  'targetx',
  'targety',
  'bias',
  'intercept',
  'slope',
  'amplitude',
  'exponent',
  'tableValues',
  'basefrequency',
  'numoctaves',
  'seed',
  'stitchtiles',
  'viewBox',
  'preserveAspectRatio',
  'xlink:href',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
]);

const PRINTABLE_TAGS = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'polyline',
  'polygon',
  'text',
]);

const NON_PRINTABLE_CONTAINERS = new Set([
  'defs',
  'clippath',
  'mask',
  'filter',
  'pattern',
  'foreignobject',
]);

const isHiddenByAttrs = (el: Element): boolean => {
  const display = (el.getAttribute('display') || '').trim().toLowerCase();
  if (display === 'none') return true;

  const visibility = (el.getAttribute('visibility') || '').trim().toLowerCase();
  if (visibility === 'hidden') return true;

  const opacityAttr = (el.getAttribute('opacity') || '').trim();
  if (opacityAttr.length > 0) {
    const o = Number.parseFloat(opacityAttr);
    if (Number.isFinite(o) && o <= 0) return true;
  }

  return false;
};

const isHiddenByAncestor = (el: Element): boolean => {
  let cur: Element | null = el;
  while (cur) {
    if (isHiddenByAttrs(cur)) return true;
    cur = cur.parentElement;
  }
  return false;
};

const isInsideNonPrintableContainer = (el: Element): boolean => {
  let cur: Element | null = el;
  while (cur) {
    const tag = cur.tagName.toLowerCase();
    if (NON_PRINTABLE_CONTAINERS.has(tag)) return true;
    cur = cur.parentElement;
  }
  return false;
};

const sanitizeSvgInPlace = (root: Element) => {
  const walk = (node: Element) => {
    const children = Array.from(node.children);
    for (const child of children) {
      const tag = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        child.remove();
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const name = attr.name;
        const lower = name.toLowerCase();
        const value = attr.value || '';

        if (!ALLOWED_ATTRS.has(name) && !ALLOWED_ATTRS.has(lower)) {
          child.removeAttribute(name);
          continue;
        }

        if (lower.startsWith('on')) {
          child.removeAttribute(name);
          continue;
        }

        if (lower === 'href' || lower.endsWith(':href')) {
          if (!/^\s*#[-a-z0-9_]+\s*$/i.test(value)) {
            child.removeAttribute(name);
            continue;
          }
        }

        if (/javascript:|data:/i.test(value)) {
          child.removeAttribute(name);
          continue;
        }

        if (/url\(/i.test(value) && !/url\(\s*#[-a-z0-9_]+\s*\)/i.test(value)) {
          child.removeAttribute(name);
          continue;
        }
      }

      walk(child);
    }
  };

  const dangerous = root.querySelectorAll('script, image, foreignObject, iframe, embed, object');
  dangerous.forEach((n) => n.remove());
  walk(root);
};

const parseCssClassStyles = (cssText: string) => {
  const text = typeof cssText === 'string' ? cssText : '';
  const classMap = new Map<string, Record<string, string>>();
  const ruleRe = /([^{}]+)\{([^}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(text))) {
    const selectorsRaw = String(m[1] || '').trim();
    const bodyRaw = String(m[2] || '');
    if (!selectorsRaw) continue;
    if (/url\s*\(/i.test(bodyRaw)) continue;

    const decls: Record<string, string> = {};
    bodyRaw
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const idx = pair.indexOf(':');
        if (idx <= 0) return;
        const key = pair.slice(0, idx).trim().toLowerCase();
        const val = pair.slice(idx + 1).trim();
        const allowed = new Set([
          'fill',
          'stroke',
          'fill-opacity',
          'stroke-opacity',
          'stroke-width',
          'opacity',
        ]);
        if (!allowed.has(key)) return;
        if (/url\s*\(/i.test(val) && !/url\(\s*#[-a-z0-9_]+\s*\)/i.test(val)) return;
        decls[key] = val;
      });

    if (Object.keys(decls).length === 0) continue;

    const selectors = selectorsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sel of selectors) {
      // Only allow simple selectors that reference class names, like:
      // .cls-1
      // path.cls-1
      // g .cls-1
      // Reject ids/attrs/pseudo selectors
      if (/[#\[:]/.test(sel)) continue;
      const classRe = /\.([a-zA-Z0-9_-]+)/g;
      const foundClasses: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = classRe.exec(sel))) {
        foundClasses.push(cm[1]);
      }
      if (foundClasses.length === 0) continue;

      for (const className of foundClasses) {
        const existing = classMap.get(className) || {};
        classMap.set(className, { ...existing, ...decls });
      }
    }
  }
  return classMap;
};

const inlineCssClassStyles = (svgRoot: SVGSVGElement) => {
  const styleBlocks = Array.from(svgRoot.querySelectorAll('style'))
    .map((s) => s.textContent || '')
    .filter(Boolean);

  const cssClassStyles = new Map<string, Record<string, string>>();
  for (const block of styleBlocks) {
    const parsed = parseCssClassStyles(block);
    for (const [k, v] of parsed.entries()) {
      const existing = cssClassStyles.get(k) || {};
      cssClassStyles.set(k, { ...existing, ...v });
    }
  }

  if (cssClassStyles.size === 0) return;

  const nodes = svgRoot.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon, text, tspan');
  nodes.forEach((node) => {
    const el = node as SVGElement;
    if (isHiddenByAncestor(el)) return;
    if (isInsideNonPrintableContainer(el)) return;

    const classRaw = el.getAttribute('class') || '';
    const classNames = classRaw
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (classNames.length === 0) return;

    const merged: Record<string, string> = {};
    for (const cn of classNames) {
      const found = cssClassStyles.get(cn);
      if (!found) continue;
      Object.assign(merged, found);
    }

    const hasAttrOrStyle = (k: string) => {
      if (el.hasAttribute(k)) return true;
      const styleAttr = el.getAttribute('style') || '';
      return new RegExp(`(?:^|;)\\s*${k}\\s*:`,'i').test(styleAttr);
    };

    const setIfMissing = (attr: string, cssKey: string) => {
      const v = merged[cssKey];
      if (!v) return;
      if (hasAttrOrStyle(attr) || hasAttrOrStyle(cssKey)) return;
      el.setAttribute(attr, v);
    };

    setIfMissing('fill', 'fill');
    setIfMissing('stroke', 'stroke');
    setIfMissing('fill-opacity', 'fill-opacity');
    setIfMissing('stroke-opacity', 'stroke-opacity');
    setIfMissing('stroke-width', 'stroke-width');
    setIfMissing('opacity', 'opacity');
  });
};

const buildA4SvgElement = (raw: string): SVGSVGElement => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const root = doc.documentElement;

  if (!root || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('SVG contains no printable vector objects');
  }

  const svgRoot = root as unknown as SVGSVGElement;
  sanitizeSvgInPlace(svgRoot);

  if (!svgRoot.getAttribute('xmlns')) {
    svgRoot.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  inlineCssClassStyles(svgRoot);

  const vbFromAttr = svgRoot.getAttribute('viewBox');
  let vb: { x: number; y: number; width: number; height: number } | null = null;
  if (vbFromAttr) {
    const parts = vbFromAttr
      .trim()
      .split(/[ ,]+/)
      .map((v) => Number(v));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [x, y, width, height] = parts;
      if (width > 0 && height > 0) vb = { x, y, width, height };
    }
  }

  if (!vb) {
    const parseLen = (v: string | null) => {
      const s = typeof v === 'string' ? v.trim() : '';
      if (!s) return null;
      const m = s.match(/^([+-]?(?:\d+\.?\d*|\d*\.?\d+))(pt)?$/i);
      if (!m) return null;
      const n = Number(m[1]);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n;
    };

    const w = parseLen(svgRoot.getAttribute('width'));
    const h = parseLen(svgRoot.getAttribute('height'));
    if (Number.isFinite(w) && Number.isFinite(h)) {
      vb = { x: 0, y: 0, width: w, height: h };
    }
  }

  if (!vb) {
    throw new Error('SVG is missing a valid viewBox');
  }

  svgRoot.setAttribute('data-artwork-svg', 'true');
  svgRoot.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svgRoot.setAttribute('viewBox', `0 0 ${vb.width} ${vb.height}`);
  svgRoot.setAttribute('width', String(vb.width));
  svgRoot.setAttribute('height', String(vb.height));
  svgRoot.style.position = 'absolute';
  svgRoot.style.left = '0';
  svgRoot.style.top = '0';
  svgRoot.style.display = 'block';

  const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('id', 'SVG_NORMALIZED_ROOT');
  g.setAttribute('transform', `translate(${-vb.x} ${-vb.y})`);
  while (svgRoot.firstChild) {
    g.appendChild(svgRoot.firstChild);
  }
  svgRoot.appendChild(g);

  return svgRoot;
};

export const InlineSvgViewer: React.FC<{
  svgContent: string;
  onRegionDetected?: (regions: DetectedRegion[]) => void;
  disableAutoCenter?: boolean;
  onSvgLoaded?: (size: { width: number; height: number }) => void;
}> = ({ svgContent, onRegionDetected, disableAutoCenter, onSvgLoaded }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastSvgContentRef = useRef<string | null>(null);
  const loadedOnceRef = useRef(false);

  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!svgContent) return;
    const host = hostRef.current;
    if (!host) return;

    try {
      if (lastSvgContentRef.current !== svgContent) {
        lastSvgContentRef.current = svgContent;
        svgRef.current = null;
        host.replaceChildren();
      }

      // Canonical SVG ownership: create + mount exactly once per component lifecycle.
      if (!svgRef.current) {
        const svg = buildA4SvgElement(svgContent);
        host.replaceChildren(svg);
        svgRef.current = svg;
      }

      const svg = svgRef.current;
      void svg;

      if (!loadedOnceRef.current) {
        const vb = svg.viewBox?.baseVal;
        if (!vb || vb.width <= 0 || vb.height <= 0) {
          throw new Error('SVG is missing a valid viewBox');
        }
        loadedOnceRef.current = true;
        onSvgLoaded?.({ width: vb.width, height: vb.height });
      }

      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'SVG contains no printable vector objects';
      setError(msg);
      svgRef.current = null;
      lastSvgContentRef.current = null;
      loadedOnceRef.current = false;
      host.replaceChildren();
    }
  }, [disableAutoCenter, onSvgLoaded, svgContent]);

  return (
    <div className="absolute inset-0 pointer-events-none" aria-label="SVG Preview">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-destructive px-6 text-center">
          {error}
        </div>
      ) : null}
      <div ref={hostRef} className="w-full h-full pointer-events-none" />
    </div>
  );
};
