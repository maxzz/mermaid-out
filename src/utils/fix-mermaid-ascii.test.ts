import { describe, expect, it } from 'vitest';
import { fixMermaidAsciiBoxes } from './fix-mermaid-ascii';

const BROKEN = `\
┌───────────────┐
│   DevTools    │
│ ┌───────────┐ │
│ └─────┬─────┘ │
└───────┼───────┘
        │
┌───────┼───────┐
│       ▼       │
│ ╟───────────╢ │
│ │           │ │
│ │  index.ts │ │
│ │           │ │
│ ╟───────────╢ │
└───────────────┘`;

describe('fixMermaidAsciiBoxes', () => {
    it('rewrites subroutine ╟/╢ corners into a double border', () => {
        const out = fixMermaidAsciiBoxes(BROKEN);
        const lines = out.split('\n');
        expect(lines[8]).toBe('│ ┌┬─────────┬┐ │');
        expect(lines[9]).toBe('│ ││         ││ │');
        expect(lines[10]).toBe('│ ││ index.ts││ │');
        expect(lines[11]).toBe('│ ││         ││ │');
        expect(lines[12]).toBe('│ └┴─────────┴┘ │');
        expect(out).not.toContain('╟');
        expect(out).not.toContain('╢');
    });

    it('is idempotent', () => {
        const once = fixMermaidAsciiBoxes(BROKEN);
        expect(fixMermaidAsciiBoxes(once)).toBe(once);
    });

    it('rewrites pure-ASCII subroutine | corners into a double border', () => {
        const src = `\
+---------------+
| |-----------| |
| |           | |
| |  index.ts | |
| |           | |
| |-----------| |
+---------------+`;
        const lines = fixMermaidAsciiBoxes(src).split('\n');
        expect(lines[1]).toBe('| ++---------++ |');
        expect(lines[2]).toBe('| ||         || |');
        expect(lines[3]).toBe('| || index.ts|| |');
        expect(lines[4]).toBe('| ||         || |');
        expect(lines[5]).toBe('| ++---------++ |');
    });

    it('turns a vertical bar punching through a horizontal ASCII border into a join', () => {
        const src = '+-------|-------+\n        |        ';
        expect(fixMermaidAsciiBoxes(src).split('\n')[0]).toBe('+-------+-------+');
    });

    it('leaves diagrams without subroutine corners unchanged', () => {
        const src = '┌───┐\n│ A │\n└───┘';
        expect(fixMermaidAsciiBoxes(src)).toBe(src);
    });
});
