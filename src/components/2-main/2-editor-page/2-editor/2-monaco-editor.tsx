import { useSnapshot } from "valtio";
import Editor, { type EditorProps } from "@monaco-editor/react";
import { appSettings } from "@/store/1-ui-settings";
import { mermaidSettings } from "@/store/2-mermaid-settings";
import { isThemeDark } from "@/utils/theme-utils";
import { BarsLoader } from "@/ui/local-ui";
import { MONACO_LANGUAGE_MERMAID, MONACO_THEME_DARK, MONACO_THEME_LIGHT } from "./3-monaco-setup";

/**
 * Lazy chunk: default export is consumed by React.lazy() in 1-editor-panel.tsx.
 * Importing this file pulls Monaco + monaco-mermaid (see 3-monaco-setup.ts).
 */
export default function MonacoMermaidEditor() {
    const { source } = useSnapshot(mermaidSettings);
    const { theme } = useSnapshot(appSettings);
    const isDark = isThemeDark(theme);

    return (
        <Editor
            className="h-full"
            language={MONACO_LANGUAGE_MERMAID}
            theme={isDark ? MONACO_THEME_DARK : MONACO_THEME_LIGHT}
            value={source}
            onChange={(value) => { mermaidSettings.source = value ?? ''; }}
            options={editorOptions}
            loading={<BarsLoader />}
        />
    );
}

const editorOptions: EditorProps['options'] = {
    fontSize: 11,
    fontFamily: "'Geist Mono Variable', monospace",
    fontLigatures: true,
    lineNumbersMinChars: 3,
    minimap: { enabled: false },
    wordWrap: 'on',
    tabSize: 4,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    renderLineHighlight: 'line',
    padding: { top: 8, bottom: 8 },
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    bracketPairColorization: { enabled: true },
    scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
};
