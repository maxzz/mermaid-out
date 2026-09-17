/**
 * Post-process beautiful-mermaid SVG to fix two stroke artifacts:
 *
 * 1. Subgraph header band is a second stroked <rect> on the same origin as the
 *    outer box, so the top corners and header-side verticals are drawn twice.
 * 2. Subroutine (`[[text]]`) inner bars are <line>s from the outer edge to the
 *    outer edge; at 0.75px they do not join the box and look broken or overlapping.
 *
 * The library is not patched; this runs on the SVG string after render.
 * Returns the original markup if DOMParser is missing or parsing fails.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const DIVIDER_CLASS = 'subgraph-header-divider';

export function fixMermaidSvgStrokes(svg: string): string {
    if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
        return svg;
    }
    if (!svg.includes('class="subgraph"') && !svg.includes('data-shape="subroutine"')) {
        return svg;
    }

    try {
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        const root = doc.documentElement;
        if (!root || root.localName !== 'svg' || root.querySelector('parsererror')) {
            return svg;
        }

        fixSubgraphHeaders(doc, root);
        fixSubroutineBars(root);

        return new XMLSerializer().serializeToString(root);
    } catch {
        return svg;
    }
}

function fixSubgraphHeaders(doc: Document, root: Element) {
    for (const group of root.querySelectorAll('g.subgraph')) {
        const rects: Element[] = [];
        for (const child of group.children) {
            if (child.localName === 'rect') {
                rects.push(child);
            }
            if (rects.length === 2) {
                break;
            }
        }
        if (rects.length < 2) {
            continue;
        }

        const outer = rects[0];
        const header = rects[1];
        const ox = num(outer, 'x');
        const oy = num(outer, 'y');
        const ow = num(outer, 'width');
        const oh = num(outer, 'height');
        const hx = num(header, 'x');
        const hy = num(header, 'y');
        const hw = num(header, 'width');
        const hh = num(header, 'height');
        if (ox === null || oy === null || ow === null || oh === null || hx === null || hy === null || hw === null || hh === null) {
            continue;
        }
        if (hx !== ox || hy !== oy || hw !== ow || hh <= 0 || hh >= oh) {
            continue;
        }

        header.setAttribute('stroke', 'none');
        header.removeAttribute('stroke-width');

        const next = header.nextElementSibling;
        if (next?.localName === 'line' && next.getAttribute('class')?.split(/\s+/).includes(DIVIDER_CLASS)) {
            continue;
        }

        const stroke = outer.getAttribute('stroke') || 'var(--_node-stroke)';
        const strokeWidth = outer.getAttribute('stroke-width') || '1';
        const inset = (parseFloat(strokeWidth) || 1) / 2;

        const line = doc.createElementNS(SVG_NS, 'line');
        line.setAttribute('class', DIVIDER_CLASS);
        line.setAttribute('x1', String(ox + inset));
        line.setAttribute('y1', String(oy + hh));
        line.setAttribute('x2', String(ox + ow - inset));
        line.setAttribute('y2', String(oy + hh));
        line.setAttribute('stroke', stroke);
        line.setAttribute('stroke-width', strokeWidth);
        header.after(line);
    }
}

function fixSubroutineBars(root: Element) {
    for (const group of root.querySelectorAll('g.node[data-shape="subroutine"]')) {
        const rect = firstChildByName(group, 'rect');
        if (!rect) {
            continue;
        }

        const y = num(rect, 'y');
        const h = num(rect, 'height');
        if (y === null || h === null || h <= 0) {
            continue;
        }

        for (const line of [...group.children].filter((el) => el.localName === 'line')) {
            const y1 = num(line, 'y1');
            const y2 = num(line, 'y2');
            if (y1 === null || y2 === null) {
                continue;
            }
            const top = Math.min(y1, y2);
            const bottom = Math.max(y1, y2);
            if (top !== y || bottom !== y + h) {
                continue;
            }

            const sw = parseFloat(line.getAttribute('stroke-width') || rect.getAttribute('stroke-width') || '0.75') || 0.75;
            const inset = sw / 2;
            const lo = y + inset;
            const hi = y + h - inset;
            if (y1 <= y2) {
                line.setAttribute('y1', String(lo));
                line.setAttribute('y2', String(hi));
            } else {
                line.setAttribute('y1', String(hi));
                line.setAttribute('y2', String(lo));
            }
        }
    }
}

function firstChildByName(parent: Element, name: string): Element | null {
    for (const child of parent.children) {
        if (child.localName === name) {
            return child;
        }
    }
    return null;
}

function num(el: Element, attr: string): number | null {
    const raw = el.getAttribute(attr);
    if (raw === null || raw === '') {
        return null;
    }
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : null;
}
