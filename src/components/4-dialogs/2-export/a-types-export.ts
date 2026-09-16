import { atom } from "jotai";
import { type ExportFormat } from "@/store/2-mermaid-settings";

export const isOpenExportDialogAtom = atom(false);

export const EXPORT_FORMATS: { value: ExportFormat; label: string; ext: string; mime: string; }[] = [
    { value: 'svg', label: 'SVG', ext: 'svg', mime: 'image/svg+xml' },
    { value: 'text', label: 'Text', ext: 'txt', mime: 'text/plain' },
    { value: 'png', label: 'PNG', ext: 'png', mime: 'image/png' },
];

export const EXPORT_FILENAME = 'diagram';
