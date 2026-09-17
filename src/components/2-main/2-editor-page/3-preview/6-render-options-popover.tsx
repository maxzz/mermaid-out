import { type ComponentProps, type ReactNode, Suspense, use, useEffect, useId, useRef, useState } from "react";
import { useSnapshot } from "valtio";
import { Settings2Icon } from "lucide-react";
import { DIAGRAM_FONTS, type DiagramTheme, mermaidSettings } from "@/store/2-mermaid-settings";
import { loadBeautifulMermaid } from "@/components/2-main/2-editor-page/2-editor/8-lazy-modules";
import { BarsLoader } from "@/ui/local-ui";
import { Button } from "@/ui/shadcn/button";
import { Label } from "@/ui/shadcn/label";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/ui/shadcn/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Slider } from "@/ui/shadcn/slider";
import { Switch } from "@/ui/shadcn/switch";

export function RenderOptionsPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="xs" title="Render options" type="button">
                    <Settings2Icon />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="p-3 w-80 max-h-[min(70vh,32rem)] overflow-y-auto"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={keepOpenForSelect}
            >
                <PopoverHeader>
                    <PopoverTitle>
                        Render options
                    </PopoverTitle>
                    <PopoverDescription>
                        Diagram theme, SVG layout, and text output. Changes apply immediately.
                    </PopoverDescription>
                </PopoverHeader>

                <div className="flex flex-col gap-4">
                    <Suspense fallback={<div className="py-6 flex justify-center"><BarsLoader /></div>}>
                        <DiagramThemeSection />
                    </Suspense>
                    <SvgLayoutSection />
                    <TextOutputSection />
                </div>
            </PopoverContent>
        </Popover>
    );
}

function keepOpenForSelect(event: { target: EventTarget | null; preventDefault: () => void; }) {
    const el = event.target as HTMLElement | null;
    if (el?.closest?.('[data-slot="select-content"]')) {
        event.preventDefault();
    }
}

function DiagramThemeSection() {
    const bm = use(loadBeautifulMermaid());
    const { diagramTheme } = useSnapshot(mermaidSettings);
    const themeNames = Object.keys(bm.THEMES);
    const select = useSelectPreview(diagramTheme, (v) => { mermaidSettings.diagramTheme = v as DiagramTheme; });

    return (
        <Section title="Diagram theme">
            <Row label="Colors" hint="Auto follows the app light/dark mode">
                <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange}>
                    <SelectTrigger size="sm" className="w-40">
                        <SelectValue>
                            <ThemeLabel name={diagramTheme} themes={bm.THEMES} />
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                        <PreviewSelectItem value="auto" onPreview={select.preview}>
                            <ThemeLabel name="auto" themes={bm.THEMES} />
                        </PreviewSelectItem>
                        {themeNames.map(
                            (name) => (
                                <PreviewSelectItem key={name} value={name} onPreview={select.preview}>
                                    <ThemeLabel name={name} themes={bm.THEMES} />
                                </PreviewSelectItem>
                            )
                        )}
                    </SelectContent>
                </Select>
            </Row>
        </Section>
    );
}

function SvgLayoutSection() {
    const { svg } = useSnapshot(mermaidSettings);
    const select = useSelectPreview(svg.font, (v) => { mermaidSettings.svg.font = v; });

    return (
        <Section title="SVG layout">
            <Row label="Font">
                <Select value={select.listValue} open={select.open} onOpenChange={select.onOpenChange} onValueChange={select.onValueChange}>
                    <SelectTrigger size="sm" className="w-40">
                        <SelectValue>
                            <FontLabel fontFamily={svg.font} />
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                        {DIAGRAM_FONTS.map(
                            (font) => (
                                <PreviewSelectItem key={font.value} value={font.value} onPreview={select.preview}>
                                    <FontLabel fontFamily={font.value} />
                                </PreviewSelectItem>
                            )
                        )}
                    </SelectContent>
                </Select>
            </Row>

            <SliderRow label="Padding" value={svg.padding} min={0} max={120} step={4} onChange={(v) => { mermaidSettings.svg.padding = v; }} />
            <SliderRow label="Node spacing" value={svg.nodeSpacing} min={4} max={120} step={4} onChange={(v) => { mermaidSettings.svg.nodeSpacing = v; }} />
            <SliderRow label="Layer spacing" value={svg.layerSpacing} min={4} max={160} step={4} onChange={(v) => { mermaidSettings.svg.layerSpacing = v; }} />
        </Section>
    );
}

function TextOutputSection() {
    const { ascii } = useSnapshot(mermaidSettings);

    return (
        <Section title="Text output">
            <Row label="Pure ASCII" hint="Off: Unicode box-drawing characters">
                <Switch checked={ascii.useAscii} onCheckedChange={(v) => { mermaidSettings.ascii.useAscii = v; }} />
            </Row>

            <SliderRow label="Horizontal spacing" value={ascii.paddingX} min={1} max={20} step={1} onChange={(v) => { mermaidSettings.ascii.paddingX = v; }} />
            <SliderRow label="Vertical spacing" value={ascii.paddingY} min={1} max={20} step={1} onChange={(v) => { mermaidSettings.ascii.paddingY = v; }} />
        </Section>
    );
}

function Section({ title, children }: { title: string; children: ReactNode; }) {
    return (
        <section className="flex flex-col gap-3">
            <h3 className="text-[.7rem] font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
            </h3>
            {children}
        </section>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode; }) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
                <Label htmlFor={id}>{label}</Label>
                {hint && <span className="text-[.7rem] text-muted-foreground">{hint}</span>}
            </div>
            <div id={id} className="shrink-0">
                {children}
            </div>
        </div>
    );
}

type SliderRowProps = {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
};

function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <span className="text-[.7rem] font-mono tabular-nums text-muted-foreground">{value}</span>
            </div>
            <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
        </div>
    );
}

function ThemeSwatch({ bg, fg }: { bg: string; fg: string; }) {
    return (
        <span className="size-3.5 border border-border rounded-sm overflow-hidden inline-flex" style={{ backgroundColor: bg }}>
            <span className="m-auto size-1.5 rounded-full" style={{ backgroundColor: fg }} />
        </span>
    );
}

function ThemeLabel({ name, themes }: { name: string; themes: Record<string, { bg: string; fg: string; accent?: string; }>; }) {
    if (name === "auto") {
        return (
            <>
                <ThemeSwatch bg="var(--background)" fg="var(--foreground)" /> Auto (app theme)
            </>
        );
    }

    const theme = themes[name];
    return (
        <>
            <ThemeSwatch bg={theme?.bg ?? "var(--background)"} fg={theme?.accent ?? theme?.fg ?? "var(--foreground)"} /> {name}
        </>
    );
}

function FontLabel({ fontFamily }: { fontFamily: string; }) {
    const label = DIAGRAM_FONTS.find((font) => font.value === fontFamily)?.label ?? fontFamily;
    return <span style={{ fontFamily }}>{label}</span>;
}

const PREVIEW_VALUE_ATTR = "data-preview-value";

/**
 * Highlighted options live-preview in the diagram; click/Enter commits;
 * closing without a selection (Escape) restores the value from before open.
 */
function useSelectPreview<T extends string>(live: T, apply: (value: T) => void) {
    const originRef = useRef(live);
    const didCommitRef = useRef(false);
    const liveRef = useRef(live);
    const applyRef = useRef(apply);
    const [open, setOpen] = useState(false);

    liveRef.current = live;
    applyRef.current = apply;

    function preview(value: string) {
        if (value !== liveRef.current) {
            applyRef.current(value as T);
        }
    }

    useEffect(
        () => {
            if (!open) {
                return;
            }

            function previewValue(value: string | null | undefined) {
                if (value) {
                    preview(value);
                }
            }

            function previewFromActive() {
                const el = document.activeElement as HTMLElement | null;
                previewValue(el?.getAttribute(PREVIEW_VALUE_ATTR) ?? el?.closest(`[${PREVIEW_VALUE_ATTR}]`)?.getAttribute(PREVIEW_VALUE_ATTR));
            }

            function onKeyDown(event: KeyboardEvent) {
                const items = [...document.querySelectorAll(`[${PREVIEW_VALUE_ATTR}]:not([data-disabled])`)];
                if (items.length === 0) {
                    return;
                }

                const index = items.indexOf(document.activeElement as Element);
                let nextIndex = index;

                if (event.key === "Home") {
                    nextIndex = 0;
                } else if (event.key === "End") {
                    nextIndex = items.length - 1;
                } else if (event.key === "ArrowDown") {
                    nextIndex = Math.min(index + 1, items.length - 1);
                } else if (event.key === "ArrowUp") {
                    nextIndex = Math.max((index < 0 ? items.length : index) - 1, 0);
                } else {
                    return;
                }

                previewValue(items[nextIndex]?.getAttribute(PREVIEW_VALUE_ATTR));
            }

            document.addEventListener("focusin", previewFromActive);
            document.addEventListener("keydown", onKeyDown, true);
            return () => {
                document.removeEventListener("focusin", previewFromActive);
                document.removeEventListener("keydown", onKeyDown, true);
            };
        },
        [open],
    );

    function onOpenChange(next: boolean) {
        if (next) {
            originRef.current = liveRef.current;
            didCommitRef.current = false;
        } else if (!didCommitRef.current) {
            applyRef.current(originRef.current);
        }
        setOpen(next);
    }

    function onValueChange(value: string) {
        didCommitRef.current = true;
        applyRef.current(value as T);
    }

    return {
        open,
        listValue: open ? originRef.current : live,
        onOpenChange,
        onValueChange,
        preview,
    };
}

function PreviewSelectItem({ value, onPreview, ...rest }: ComponentProps<typeof SelectItem> & { onPreview: (value: string) => void; }) {
    return (
        <SelectItem
            {...rest}
            value={value}
            data-preview-value={value}
            onFocus={() => onPreview(value)}
            onPointerMove={() => onPreview(value)}
        />
    );
}
