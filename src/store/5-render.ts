import { useEffect, useState } from 'react';
import { proxy } from 'valtio';
import type { AsciiRenderOptions, DiagramColors, RenderOptions } from 'beautiful-mermaid'; // `import type` only: keep the lazy chunk lazy
import type { BeautifulMermaidModule } from '@/components/2-main/2-editor-page/2-editor/8-lazy-modules';
import { resolveCssVar } from '@/utils/export-utils';
import { fixMermaidAsciiBoxes } from '@/utils/fix-mermaid-ascii';
import { detectGraphDirection, routeDiamondEdges } from '@/utils/route-diamond-edges';
import { type DiagramTheme, type MermaidSettings, type OutputFormat } from './2-mermaid-settings';

export type RenderResult = {
    format: OutputFormat;
    output: string;         // SVG markup or plain text; empty when error or empty source
    error: string | null;
    ms: number;             // render time
};

export type RenderSettings = Pick<MermaidSettings, 'diagramTheme' | 'ascii' | 'svg'>;

const EMPTY_SOURCE_RESULT = (format: OutputFormat): RenderResult => ({ format, output: '', error: null, ms: 0 });

/**
 * Colors for the SVG renderer.
 * - 'auto' in the preview passes CSS variables so light/dark switches apply live without re-render.
 * - 'auto' for export resolves the current computed colors so the file is self-contained.
 * - A named theme uses beautiful-mermaid's THEMES palette.
 */
export function getDiagramColors(bm: BeautifulMermaidModule, theme: DiagramTheme, forExport: boolean): { colors: DiagramColors; transparent: boolean; } {
    if (theme === 'auto') {
        if (forExport) {
            return {
                colors: {
                    bg: resolveCssVar('--background', bm.DEFAULTS.bg),
                    fg: resolveCssVar('--foreground', bm.DEFAULTS.fg),
                },
                transparent: false,
            };
        }
        return {
            colors: { bg: 'var(--background)', fg: 'var(--foreground)' },
            transparent: true,
        };
    }

    const named = bm.THEMES[theme];
    return {
        colors: named ?? { bg: bm.DEFAULTS.bg, fg: bm.DEFAULTS.fg },
        transparent: false,
    };
}

export function buildSvgOptions(bm: BeautifulMermaidModule, settings: RenderSettings, forExport: boolean): RenderOptions {
    const { colors, transparent } = getDiagramColors(bm, settings.diagramTheme, forExport);
    return {
        ...colors,
        transparent,
        font: settings.svg.font,
        padding: settings.svg.padding,
        nodeSpacing: settings.svg.nodeSpacing,
        layerSpacing: settings.svg.layerSpacing,
        // Extra ELK fields: read by the Vite-patched beautiful-mermaid bundle.
        ...settings.svg.elk,
    };
}

export function buildAsciiOptions(settings: RenderSettings): AsciiRenderOptions {
    return {
        useAscii: settings.ascii.useAscii,
        paddingX: settings.ascii.paddingX,
        paddingY: settings.ascii.paddingY,
        colorMode: 'none', // plain text: no ANSI escape sequences
    };
}

/** Pure, synchronous render. Never throws; errors are returned in the result. */
export function renderDiagram(bm: BeautifulMermaidModule, source: string, settings: RenderSettings, format: OutputFormat, forExport = false): RenderResult {
    const text = source.trim();
    if (!text) {
        return EMPTY_SOURCE_RESULT(format);
    }

    const t0 = performance.now();
    try {
        const output = format === 'svg'
            ? routeDiamondEdges(bm.renderMermaidSVG(text, buildSvgOptions(bm, settings, forExport)), detectGraphDirection(text))
            : fixMermaidAsciiBoxes(bm.renderMermaidASCII(text, buildAsciiOptions(settings)));

        return { format, output, error: null, ms: performance.now() - t0 };
    } catch (err) {
        return { format, output: '', error: err instanceof Error ? err.message : String(err), ms: performance.now() - t0 };
    }
}

/** Last preview render outcome (not persisted); published by the preview, shown by the status bar. */
export const previewStatus = proxy<{ error: string | null; ms: number; empty: boolean; }>({
    error: null,
    ms: 0,
    empty: true,
});

export function publishPreviewStatus(result: RenderResult) {
    previewStatus.error = result.error;
    previewStatus.ms = result.ms;
    previewStatus.empty = !result.output && !result.error;
}

/** Debounced value: re-rendering the diagram on every keystroke is wasteful. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(
        () => {
            const id = setTimeout(() => setDebounced(value), delayMs);
            return () => clearTimeout(id);
        },
        [value, delayMs]);

    return debounced;
}
