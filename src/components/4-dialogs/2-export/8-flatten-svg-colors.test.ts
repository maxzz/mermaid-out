import { describe, expect, it } from 'vitest';
import { flattenSvgColors, rewriteCssColorFunctions } from './8-flatten-svg-colors';

describe('rewriteCssColorFunctions', () => {
    it('does not treat var(--_text) as a prefix of var(--_text-sec)', () => {
        const out = rewriteCssColorFunctions(
            'fill="var(--_text)" stroke="var(--_text-sec)"',
            (expr) => {
                if (expr === 'var(--_text)') {
                    return '#111111';
                }
                if (expr === 'var(--_text-sec)') {
                    return '#666666';
                }
                return expr;
            },
        );
        expect(out).toBe('fill="#111111" stroke="#666666"');
    });

    it('resolves nested var() and color-mix() innermost first', () => {
        const out = rewriteCssColorFunctions(
            'var(--accent, color-mix(in srgb, var(--fg) 85%, var(--bg)))',
            (expr) => {
                if (expr === 'var(--fg)') {
                    return '#ffffff';
                }
                if (expr === 'var(--bg)') {
                    return '#000000';
                }
                if (expr === 'color-mix(in srgb, #ffffff 85%, #000000)') {
                    return '#d9d9d9';
                }
                if (expr === 'var(--accent, #d9d9d9)') {
                    return '#d9d9d9';
                }
                return expr;
            },
        );
        expect(out).toBe('#d9d9d9');
    });

    it('leaves non-color text and url() imports alone', () => {
        const css = "@import url('https://fonts.googleapis.com/css2?family=Inter'); text { font-family: Inter; }";
        expect(rewriteCssColorFunctions(css, () => '#ff0000')).toBe(css);
    });
});

describe('flattenSvgColors', () => {
    it('returns markup unchanged when there is nothing to flatten', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#111111"/></svg>';
        expect(flattenSvgColors(svg)).toBe(svg);
    });
});
