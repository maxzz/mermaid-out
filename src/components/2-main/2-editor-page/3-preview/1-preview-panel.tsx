import { Suspense, useRef } from "react";
import { BarsLoader } from "@/ui/local-ui";
import { ErrorBoundary } from "@/ui/local-ui/8-error-boundary";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { PreviewToolbar } from "./2-preview-toolbar";
import { RenderView } from "./3-render-view";
import { ZoomControls } from "./4-zoom-controls";
import { StatusBar } from "./5-status-bar";

export function PreviewPanel() {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="h-full bg-muted/20 flex flex-col">
            <PreviewToolbar />

            <div className="relative flex-1 min-h-0">
                <div className="absolute inset-0 overflow-hidden">
                    <ScrollArea className="h-full" fullHeight fixedWidth viewportClassName="overflow-hidden!">
                        <ErrorBoundary fallback={<PanelMessage>Failed to load the diagram renderer.</PanelMessage>}>
                            <Suspense fallback={<PanelMessage><BarsLoader /></PanelMessage>}>
                                <RenderView scrollRef={scrollRef} />
                            </Suspense>
                        </ErrorBoundary>
                    </ScrollArea>

                    <ZoomControls scrollRef={scrollRef} className="absolute left-4 bottom-4" />
                </div>
            </div>

            <StatusBar />
        </div>
    );
}

function PanelMessage({ children }: { children: React.ReactNode; }) {
    return (
        <div className="h-full text-xs text-muted-foreground flex items-center justify-center">
            {children}
        </div>
    );
}
