import { Suspense, use, useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon } from "lucide-react";
import { type ExportFormat, mermaidSettings, type PngScale } from "@/store/2-mermaid-settings";
import { renderDiagram, type RenderResult } from "@/store/5-render";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/2-editor/8-lazy-modules";
import { copyPngBlob, copyText, downloadBlob, downloadText, getSvgNaturalSize, svgToPngBlob } from "@/utils/export-utils";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/ui/shadcn/tabs";
import { BarsLoader } from "@/ui/local-ui";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { DiagramText } from "@/components/2-main/2-editor-page/3-preview/7-diagram-text";
import { EXPORT_FILENAME, EXPORT_FORMATS, isOpenExportDialogAtom } from "./a-types-export";

export function ExportDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenExportDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-2xl! gap-0!" aria-describedby={DESCRIPTION_ID}>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Export diagram
                    </DialogTitle>
                    <DialogDescription id={DESCRIPTION_ID} className="sr-only">
                        Choose a format, preview the result, then copy it to the clipboard or download it as a file.
                    </DialogDescription>
                </DialogHeader>

                <ErrorBoundary fallback={<div className="p-6 text-xs text-destructive">Failed to load the diagram renderer.</div>}>
                    <Suspense fallback={<div className="py-12 flex justify-center"><BarsLoader /></div>}>
                        <Body />
                    </Suspense>
                </ErrorBoundary>
            </DialogContent>
        </Dialog>
    );
}

const DESCRIPTION_ID = "export-dialog-description";

function Body() {
    const bm = use(loadBeautifulMermaid());
    const { source, outputFormat, diagramTheme, ascii, svg, pngScale } = useSnapshot(mermaidSettings);

    // Start from the format currently shown in the preview pane
    const [format, setFormat] = useState<ExportFormat>(outputFormat);

    // Export renders with resolved colors so the output is self-contained (no CSS variables)
    const result = useMemo(
        () => renderDiagram(bm, source, { diagramTheme, ascii, svg }, format === 'text' ? 'text' : 'svg', true),
        [bm, source, diagramTheme, ascii, svg, format],
    );

    const png = usePngPreview(format === 'png' ? result : null, pngScale);
    const [busy, setBusy] = useState(false);

    const canExport = !result.error && !!result.output && (format !== 'png' || !!png.blob);

    async function run(action: 'copy' | 'download') {
        setBusy(true);
        try {
            await exportResult(action, format, result, png.blob, pngScale);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    }

    return (<>
        <div className="px-4 py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <Tabs value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                    <TabsList className="h-7!">
                        {EXPORT_FORMATS.map(
                            (f) => (
                                <TabsTrigger key={f.value} value={f.value} className="px-3">
                                    {f.label}
                                </TabsTrigger>
                            )
                        )}
                    </TabsList>
                </Tabs>

                {format === 'png' && (
                    <PngScalePills value={pngScale} onChange={(v) => { mermaidSettings.pngScale = v; }} />
                )}
            </div>

            <ExportPreview format={format} result={result} pngUrl={png.url} pngSize={png.size} />

            <div className="text-[.7rem] text-muted-foreground">
                {describeOutput(format, result, png.size)}
            </div>
        </div>

        <DialogFooter className="px-4 py-3 mx-0! mb-0! flex flex-row items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => run('copy')} disabled={!canExport || busy} title="Copy to clipboard">
                <CopyIcon />
                Copy
            </Button>
            <Button size="sm" onClick={() => run('download')} disabled={!canExport || busy} title="Download file">
                <DownloadIcon />
                Download .{EXPORT_FORMATS.find((f) => f.value === format)?.ext}
            </Button>
        </DialogFooter>
    </>);
}

function ExportPreview({ format, result, pngUrl, pngSize }: { format: ExportFormat; result: RenderResult; pngUrl: string | null; pngSize: { w: number; h: number; } | null; }) {
    return (
        <div className="h-72 bg-muted/30 border border-border rounded-md overflow-auto flex">
            {result.error
                ? (
                    <pre className="m-auto px-4 py-3 max-w-full text-xs font-code text-destructive whitespace-pre-wrap">
                        {result.error}
                    </pre>
                )
                : !result.output
                    ? (
                        <div className="m-auto text-xs text-muted-foreground">
                            Nothing to export: the diagram is empty.
                        </div>
                    )
                    : format === 'text'
                        ? (
                            <DiagramText className="m-auto p-4" text={result.output} />
                        )
                        : format === 'png'
                            ? (pngUrl
                                ? <img className="m-auto p-4 max-w-full max-h-full object-contain" src={pngUrl} width={pngSize?.w} height={pngSize?.h} alt="PNG preview" />
                                : <div className="m-auto"><BarsLoader /></div>
                            )
                            : (
                                <div className="p-4 size-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:m-auto flex" dangerouslySetInnerHTML={{ __html: result.output }} />
                            )
            }
        </div>
    );
}

function PngScalePills({ value, onChange }: { value: PngScale; onChange: (v: PngScale) => void; }) {
    return (
        <div className="flex items-center gap-1">
            <span className="mr-1 text-[.7rem] text-muted-foreground">Size</span>
            {PNG_SCALES.map(
                (scale) => (
                    <Button
                        key={scale}
                        variant={scale === value ? 'secondary' : 'ghost'}
                        size="xs"
                        className="px-2 font-mono"
                        onClick={() => onChange(scale)}
                        aria-pressed={scale === value}
                    >
                        {scale}x
                    </Button>
                )
            )}
        </div>
    );
}

const PNG_SCALES: PngScale[] = [1, 2, 4];

/** Rasterize the SVG result for PNG preview; keeps the object URL alive while shown. */
function usePngPreview(result: RenderResult | null, scale: PngScale) {
    const [state, setState] = useState<{ blob: Blob | null; url: string | null; size: { w: number; h: number; } | null; }>({ blob: null, url: null, size: null });

    useEffect(() => {
        if (!result || result.error || !result.output) {
            setState({ blob: null, url: null, size: null });
            return;
        }

        let cancelled = false;
        let url: string | null = null;

        svgToPngBlob(result.output, scale)
            .then(({ blob, width, height }) => {
                if (cancelled) {
                    return;
                }
                url = URL.createObjectURL(blob);
                setState({ blob, url, size: { w: width, h: height } });
            })
            .catch((err) => {
                if (!cancelled) {
                    toast.error(`PNG rendering failed: ${err instanceof Error ? err.message : String(err)}`);
                    setState({ blob: null, url: null, size: null });
                }
            });

        return () => {
            cancelled = true;
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [result, scale]);

    return state;
}

async function exportResult(action: 'copy' | 'download', format: ExportFormat, result: RenderResult, pngBlob: Blob | null, pngScale: PngScale) {
    const def = EXPORT_FORMATS.find((f) => f.value === format)!;
    const filename = `${EXPORT_FILENAME}.${def.ext}`;

    if (format === 'png') {
        if (!pngBlob) {
            throw new Error('PNG is not ready yet.');
        }
        if (action === 'copy') {
            await copyPngBlob(pngBlob);
            toast.success(`PNG image copied to clipboard (${pngScale}x)`);
        } else {
            downloadBlob(pngBlob, filename);
            toast.success(`Saved ${filename} (${pngScale}x)`);
        }
        return;
    }

    if (action === 'copy') {
        await copyText(result.output);
        toast.success(format === 'svg' ? 'SVG markup copied to clipboard' : 'Text copied to clipboard');
    } else {
        downloadText(result.output, filename, def.mime);
        toast.success(`Saved ${filename}`);
    }
}

function describeOutput(format: ExportFormat, result: RenderResult, pngSize: { w: number; h: number; } | null): string {
    if (result.error || !result.output) {
        return '';
    }
    if (format === 'png') {
        return pngSize ? `PNG ${pngSize.w} x ${pngSize.h} px` : 'Rendering PNG...';
    }
    if (format === 'text') {
        const lines = result.output.split('\n').length;
        return `${lines} lines, ${formatBytes(result.output.length)}`;
    }
    const { w, h } = getSvgNaturalSize(result.output);
    return `SVG ${Math.round(w)} x ${Math.round(h)} px, ${formatBytes(result.output.length)}`;
}

function formatBytes(n: number): string {
    return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
}
