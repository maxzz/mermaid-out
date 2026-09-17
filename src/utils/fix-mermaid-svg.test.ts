/** @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { fixMermaidSvgStrokes } from './fix-mermaid-svg';

const FIXTURE = `\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
<g class="subgraph" data-id="box" data-label="Box">
  <rect x="10" y="10" width="180" height="100" rx="0" ry="0" fill="var(--_group-fill)" stroke="var(--_node-stroke)" stroke-width="1" />
  <rect x="10" y="10" width="180" height="28" rx="0" ry="0" fill="var(--_group-hdr)" stroke="var(--_node-stroke)" stroke-width="1" />
  <g class="node" data-id="n1" data-label="index.ts" data-shape="subroutine">
    <rect x="30" y="50" width="80" height="36" rx="0" ry="0" fill="var(--_node-fill)" stroke="var(--_node-stroke)" stroke-width="0.75" />
    <line x1="38" y1="50" x2="38" y2="86" stroke="var(--_node-stroke)" stroke-width="0.75" />
    <line x1="102" y1="50" x2="102" y2="86" stroke="var(--_node-stroke)" stroke-width="0.75" />
  </g>
</g>
</svg>`;

describe('fixMermaidSvgStrokes', () => {
    it('strips the subgraph header stroke and inserts a divider', () => {
        const out = fixMermaidSvgStrokes(FIXTURE);
        const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
        const header = doc.querySelectorAll('g.subgraph > rect')[1];
        const divider = doc.querySelector('g.subgraph > line.subgraph-header-divider');

        expect(header?.getAttribute('stroke')).toBe('none');
        expect(divider).not.toBeNull();
        expect(divider?.getAttribute('y1')).toBe('38');
        expect(divider?.getAttribute('y2')).toBe('38');
        expect(divider?.getAttribute('x1')).toBe('10.5');
        expect(divider?.getAttribute('x2')).toBe('189.5');
    });

    it('insets subroutine inner bars by half the stroke width', () => {
        const out = fixMermaidSvgStrokes(FIXTURE);
        const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
        const lines = [...doc.querySelectorAll('g.node[data-shape="subroutine"] > line')];

        expect(lines).toHaveLength(2);
        for (const line of lines) {
            expect(line.getAttribute('y1')).toBe('50.375');
            expect(line.getAttribute('y2')).toBe('85.625');
        }
    });

    it('is idempotent', () => {
        const once = fixMermaidSvgStrokes(FIXTURE);
        const twice = fixMermaidSvgStrokes(once);
        expect(twice).toBe(once);
        expect(once.match(/subgraph-header-divider/g)?.length).toBe(1);
    });

    it('leaves unrelated SVG unchanged', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10"/></svg>';
        expect(fixMermaidSvgStrokes(svg)).toBe(svg);
    });
});
