import { type ReactNode, Suspense, use, useId } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { DIAGRAM_FONTS, type DiagramTheme, mermaidSettings } from "@/store/3-mermaid-settings";
import { loadBeautifulMermaid } from "@/utils/lazy-modules";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { Slider } from "@/ui/shadcn/slider";
import { Switch } from "@/ui/shadcn/switch";
import { BarsLoader } from "@/ui/local-ui";
import { isOpenOptionsDialogAtom } from "./9-types-options";

export function OptionsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenOptionsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-md! gap-0!" aria-describedby={DESCRIPTION_ID}>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Options
                    </DialogTitle>
                    <DialogDescription id={DESCRIPTION_ID} className="sr-only">
                        Diagram rendering and startup options. Changes apply immediately.
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 max-h-[70vh] overflow-y-auto flex flex-col gap-5">
                    <Suspense fallback={<div className="py-6 flex justify-center"><BarsLoader /></div>}>
                        <DiagramThemeSection />
                    </Suspense>
                    <SvgLayoutSection />
                    <TextOutputSection />
                    <StartupSection />
                </div>
            </DialogContent>
        </Dialog>
    );
}

const DESCRIPTION_ID = "options-dialog-description";

// Sections

function DiagramThemeSection() {
    const bm = use(loadBeautifulMermaid()); // dialog opens from the editor page, so the chunk is already loaded
    const { diagramTheme } = useSnapshot(mermaidSettings);
    const themeNames = Object.keys(bm.THEMES);

    return (
        <Section title="Diagram theme">
            <Row label="Colors" hint="Auto follows the app light/dark mode">
                <Select value={diagramTheme} onValueChange={(v) => { mermaidSettings.diagramTheme = v as DiagramTheme; }}>
                    <SelectTrigger size="sm" className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                        <SelectItem value="auto">
                            <ThemeSwatch bg="var(--background)" fg="var(--foreground)" /> Auto (app theme)
                        </SelectItem>
                        {themeNames.map(
                            (name) => (
                                <SelectItem key={name} value={name}>
                                    <ThemeSwatch bg={bm.THEMES[name].bg} fg={bm.THEMES[name].accent ?? bm.THEMES[name].fg} /> {name}
                                </SelectItem>
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

    return (
        <Section title="SVG layout">
            <Row label="Font">
                <Select value={svg.font} onValueChange={(v) => { mermaidSettings.svg.font = v; }}>
                    <SelectTrigger size="sm" className="w-44">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="end">
                        {DIAGRAM_FONTS.map(
                            (font) => (
                                <SelectItem key={font.value} value={font.value}>
                                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                                </SelectItem>
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

function StartupSection() {
    const { showWelcome } = useSnapshot(mermaidSettings);

    return (
        <Section title="Startup">
            <Row label="Show welcome page at start">
                <Switch checked={showWelcome} onCheckedChange={(v) => { mermaidSettings.showWelcome = v; }} />
            </Row>
        </Section>
    );
}

// Building blocks

function Section({ title, children }: { title: string; children: ReactNode; }) {
    return (
        <section className="flex flex-col gap-3">
            <h3 className="font-semibold text-[.7rem] text-muted-foreground uppercase tracking-wider">
                {title}
            </h3>
            {children}
        </section>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode; }) {
    const id = useId();
    return (
        <div className="flex items-center justify-between gap-4">
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
                <span className="font-mono text-[.7rem] text-muted-foreground tabular-nums">{value}</span>
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
