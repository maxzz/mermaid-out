import { type CSSProperties, type HTMLAttributes } from "react";
import { classNames } from "@/utils";

type DiagramTextProps = {
    text: string;
    className?: string;
    style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLPreElement>, "children">;

/**
 * Courier New keeps latin and box-drawing in one face. One block per row
 * still pins every line to the same em grid so `│` ink does not overlap.
 */
export function DiagramText({ text, className, style, ...rest }: DiagramTextProps) {
    const lines = text.split("\n");
    return (
        <pre
            {...rest}
            className={classNames("text-xs font-diagram text-foreground [font-variant-ligatures:none] [font-kerning:none]", className)}
            style={style}
        >
            {lines.map((line, i) => (
                <span key={i} className="whitespace-pre h-[1em] block leading-[1em]">
                    {line.length === 0 ? "\u00a0" : line}
                </span>
            ))}
        </pre>
    );
}
