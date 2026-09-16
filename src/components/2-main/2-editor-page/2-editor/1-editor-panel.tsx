import { lazy, Suspense } from "react";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { loadMonacoEditor } from "@/components/2-main/2-editor-page/2-editor/8-lazy-modules";
import { MERMAID_SAMPLES } from "@/utils/mermaid-samples";
import { BarsLoader } from "@/ui/local-ui";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";

// Monaco lives in its own chunk; the promise is shared with preloadEditorPageModules()
const MonacoMermaidEditor = lazy(loadMonacoEditor);

export function EditorPanel() {
    return (
        <div className="h-full flex flex-col">
            <EditorToolbar />

            <div className="flex-1 min-h-0">
                <ErrorBoundary fallback={<PanelMessage>Failed to load the editor.</PanelMessage>}>
                    <Suspense fallback={<PanelMessage><BarsLoader /></PanelMessage>}>
                        <MonacoMermaidEditor />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </div>
    );
}

function EditorToolbar() {
    return (
        <div className="px-3 h-9 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
                Editor
            </span>

            <Select value="" onValueChange={(name) => loadSample(name)}>
                <SelectTrigger size="sm" className="h-6! text-[.7rem]" title="Replace the source with a sample diagram">
                    <SelectValue placeholder="Samples" />
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                    {MERMAID_SAMPLES.map(
                        (sample) => (
                            <SelectItem key={sample.name} value={sample.name}>
                                {sample.name}
                            </SelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}

function loadSample(name: string) {
    const sample = MERMAID_SAMPLES.find((s) => s.name === name);
    if (sample) {
        mermaidSettings.source = sample.source;
    }
}

function PanelMessage({ children }: { children: React.ReactNode; }) {
    return (
        <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
            {children}
        </div>
    );
}
