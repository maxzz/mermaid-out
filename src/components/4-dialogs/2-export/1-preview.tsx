import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type ExportFormat, type PngScale } from "@/store/2-mermaid-settings";
import { type RenderResult } from "@/store/5-render";
import { getSvgNaturalSize, svgToPngBlob } from "@/components/4-dialogs/2-export/8-export-utils";
import { BarsLoaderIcon } from "@/ui/local-ui";
import { DiagramText } from "@/components/2-main/2-editor-page/3-preview/7-diagram-text";

export function ExportPreview({ format, result, pngUrl, pngSize }: { format: ExportFormat; result: RenderResult; pngUrl: string | null; pngSize: { w: number; h: number; } | null; }) {
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
                                : <div className="m-auto"><BarsLoaderIcon /></div>
                            )
                            : (
                                <div className="p-4 size-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:m-auto flex" dangerouslySetInnerHTML={{ __html: result.output }} />
                            )
            }
        </div>
    );
}

/** Rasterize the SVG result for PNG preview; keeps the object URL alive while shown. */
export function usePngPreview(result: RenderResult | null, scale: PngScale) {
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

export function describeOutput(format: ExportFormat, result: RenderResult, pngSize: { w: number; h: number; } | null): string {
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
