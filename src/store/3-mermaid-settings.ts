import { proxy, subscribe } from 'valtio';
import type { ThemeName } from 'beautiful-mermaid'; // `import type` only: must not pull the lazy chunk into the main bundle
import { debounceDevTools } from '@/utils/debounce';
import { DEFAULT_MERMAID_SOURCE } from '@/utils/mermaid-samples';

const STORE_KEY = "mermaid-out";
const STORE_VER = "v1.0";
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

export type OutputFormat = 'svg' | 'text';
export type ExportFormat = OutputFormat | 'png';
export type DiagramTheme = 'auto' | ThemeName;
export type PngScale = 1 | 2 | 4;

export interface AsciiSettings {
    useAscii: boolean;      // true = pure ASCII, false = Unicode box drawing
    paddingX: number;       // horizontal spacing between nodes
    paddingY: number;       // vertical spacing between nodes
}

export interface SvgLayoutSettings {
    padding: number;        // canvas padding in px
    nodeSpacing: number;    // horizontal spacing between sibling nodes
    layerSpacing: number;   // vertical spacing between layers
    font: string;           // font family for diagram text
}

export interface MermaidSettings {
    showWelcome: boolean;       // show the welcome page at startup
    source: string;             // mermaid diagram source
    outputFormat: OutputFormat; // preview output format
    zoom: number;               // preview zoom factor
    diagramTheme: DiagramTheme; // 'auto' follows app light/dark mode
    ascii: AsciiSettings;
    svg: SvgLayoutSettings;
    pngScale: PngScale;         // PNG export scale
}

export const DIAGRAM_FONTS = [
    { value: 'Geist Variable', label: 'Geist' },
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto Condensed Variable', label: 'Roboto Condensed' },
    { value: 'Yanone Kaffeesatz Variable', label: 'Yanone Kaffeesatz' },
    { value: 'Geist Mono Variable', label: 'Geist Mono' },
] as const;

const DEFAULT_SETTINGS: MermaidSettings = {
    showWelcome: true,
    source: DEFAULT_MERMAID_SOURCE,
    outputFormat: 'svg',
    zoom: 1,
    diagramTheme: 'auto',
    ascii: {
        useAscii: false,
        paddingX: 5,
        paddingY: 5,
    },
    svg: {
        padding: 40,
        nodeSpacing: 24,
        layerSpacing: 40,
        font: DIAGRAM_FONTS[0].value,
    },
    pngScale: 2,
};

function loadSettings(): MermaidSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<MermaidSettings>;

            // merge stored settings with defaults to ensure new fields are present
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                ascii: { ...DEFAULT_SETTINGS.ascii, ...parsed.ascii },
                svg: { ...DEFAULT_SETTINGS.svg, ...parsed.svg },
            };
        }
    } catch (e) {
        console.error("Failed to load mermaid settings", e);
    }
    return structuredClone(DEFAULT_SETTINGS);
}

export const mermaidSettings = proxy<MermaidSettings>(loadSettings());

const saveSettings = debounceDevTools(
    () => {
        try {
            localStorage.setItem(STORAGE_ID, JSON.stringify(mermaidSettings));
        } catch (e) {
            console.error("Failed to save mermaid settings", e);
        }
    },
    300, // source changes on every keystroke; coalesce writes
);

subscribe(mermaidSettings, saveSettings);

// Zoom helpers

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;
export const ZOOM_STEP = 1.25;

export function setZoom(zoom: number) {
    mermaidSettings.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

export function zoomIn() {
    setZoom(mermaidSettings.zoom * ZOOM_STEP);
}

export function zoomOut() {
    setZoom(mermaidSettings.zoom / ZOOM_STEP);
}

export function zoomReset() {
    setZoom(1);
}
