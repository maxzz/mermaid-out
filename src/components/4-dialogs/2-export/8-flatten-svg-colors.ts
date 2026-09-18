/**
 * Make exported SVG self-contained for viewers that do not support CSS
 * variables, color-mix(), or oklch() (Windows Photos, older browsers, etc.).
 * Those features paint correctly in the in-app preview and fail to black
 * rectangles when the same markup is opened as a file.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Innermost CSS color functions (no nested parentheses). `color-mix` / `oklch` before `color` / `lch`. */
const INNERMOST_COLOR_FN = /(?:color-mix|oklch|oklab|hwb|lch|lab|color|var)\([^()]*\)/gi;

const NEEDS_FLATTEN = /var\(|color-mix\(|oklch\(|oklab\(|hwb\(|\blch\(|\blab\(|\bcolor\(/i;

/**
 * Replace nested CSS color functions innermost-first using `resolve`.
 * `resolve` must return a value without color functions, or the original expr
 * to leave it unchanged.
 */
export function rewriteCssColorFunctions(text: string, resolve: (expr: string) => string): string {
    let current = text;
    for (let pass = 0; pass < 24; pass++) {
        INNERMOST_COLOR_FN.lastIndex = 0;
        if (!INNERMOST_COLOR_FN.test(current)) {
            break;
        }
        INNERMOST_COLOR_FN.lastIndex = 0;
        let changed = false;
        current = current.replace(INNERMOST_COLOR_FN, (expr) => {
            const next = resolve(expr);
            if (next && next !== expr) {
                changed = true;
                return next;
            }
            return expr;
        });
        if (!changed) {
            break;
        }
    }
    return current;
}

/** Convert any CSS color the current browser understands to #rrggbb or rgba(). */
export function cssColorToSrgb(color: string): string {
    const trimmed = color.trim();
    if (!trimmed || trimmed === 'none') {
        return trimmed;
    }
    if (trimmed === 'transparent') {
        return 'transparent';
    }
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
        return trimmed.toLowerCase();
    }
    if (typeof document === 'undefined') {
        return trimmed;
    }

    const ctx = getColorCtx();
    if (!ctx) {
        return trimmed;
    }

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillStyle = trimmed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) {
        return 'transparent';
    }
    if (a === 255) {
        return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`;
}

/**
 * Bake var() / color-mix() / oklch() in SVG markup to sRGB so the file
 * matches the in-browser preview when opened on its own.
 */
export function flattenSvgColors(svgText: string): string {
    if (typeof document === 'undefined' || !document.body || !NEEDS_FLATTEN.test(svgText)) {
        return svgText;
    }

    const mounted = mountSvg(svgText);
    if (!mounted) {
        return svgText;
    }

    const cache = new Map<string, string>();
    try {
        return rewriteCssColorFunctions(svgText, (expr) => {
            const hit = cache.get(expr);
            if (hit) {
                return hit;
            }
            const resolved = resolveColorOnSvg(mounted.svg, expr);
            cache.set(expr, resolved);
            return resolved;
        });
    } catch {
        return svgText;
    } finally {
        mounted.host.remove();
    }
}

function resolveColorOnSvg(svg: SVGSVGElement, expr: string): string {
    const probe = document.createElementNS(SVG_NS, 'rect');
    probe.setAttribute('width', '1');
    probe.setAttribute('height', '1');
    probe.setAttribute('fill', expr);
    svg.appendChild(probe);
    try {
        const fill = getComputedStyle(probe).fill.trim();
        if (!fill || fill === 'none') {
            return expr;
        }
        const srgb = cssColorToSrgb(fill);
        return srgb && srgb !== 'none' ? srgb : expr;
    } finally {
        probe.remove();
    }
}

function mountSvg(svgText: string): { host: HTMLElement; svg: SVGSVGElement; } | null {
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;pointer-events:none;';
    host.innerHTML = svgText;
    document.body.appendChild(host);

    const svg = host.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) {
        host.remove();
        return null;
    }
    return { host, svg };
}

let colorCtx: CanvasRenderingContext2D | null | undefined;

function getColorCtx(): CanvasRenderingContext2D | null {
    if (colorCtx !== undefined) {
        return colorCtx;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    colorCtx = canvas.getContext('2d', { willReadFrequently: true });
    return colorCtx;
}

function hex2(n: number): string {
    return n.toString(16).padStart(2, '0');
}
