/**
 * Post-process beautiful-mermaid text output.
 *
 * Flowchart ASCII draws every shape as a rectangle with a 4-corner lookup.
 * Subroutine (`[[text]]`) corners are ╟/╢ (Unicode) or `|` (pure ASCII), so the
 * inner bars exist only in the corner glyphs and look overlapped or broken.
 *
 * Rewrite those boxes to a real double border:
 *
 *   ╟───────────╢      ┌┬─────────┬┐         |-----------|      ++---------+
 *   │           │  →   ││         ││    and  |           |  →   ||         ||
 *   ╟───────────╢      └┴─────────┴┘         |-----------|      ++---------+
 */

type BoxAlphabet = {
    topLeft: string;
    topRight: string;
    h: string;
    v: string;
    outTopLeft: string;
    outTopJoin: string;
    outTopRight: string;
    outBottomLeft: string;
    outBottomJoin: string;
    outBottomRight: string;
};

const UNICODE: BoxAlphabet = {
    topLeft: '╟',
    topRight: '╢',
    h: '─',
    v: '│',
    outTopLeft: '┌',
    outTopJoin: '┬',
    outTopRight: '┐',
    outBottomLeft: '└',
    outBottomJoin: '┴',
    outBottomRight: '┘',
};

const ASCII: BoxAlphabet = {
    topLeft: '|',
    topRight: '|',
    h: '-',
    v: '|',
    outTopLeft: '+',
    outTopJoin: '+',
    outTopRight: '+',
    outBottomLeft: '+',
    outBottomJoin: '+',
    outBottomRight: '+',
};

export function fixMermaidAsciiBoxes(text: string): string {
    let rows = text.split('\n').map((line) => Array.from(line));
    const unicode = rewrite(rows, UNICODE);
    const ascii = rewrite(rows, ASCII);
    const crossings = fixThroughCrossings(rows);
    return unicode || ascii || crossings ? rows.map((row) => row.join('')).join('\n') : text;
}

function rewrite(rows: string[][], a: BoxAlphabet): boolean {
    let changed = false;
    for (let y1 = 0; y1 < rows.length; y1++) {
        const row = rows[y1]!;
        for (let x1 = 0; x1 < row.length; x1++) {
            if (row[x1] !== a.topLeft) {
                continue;
            }
            const x2 = findTopRight(row, x1, a);
            if (x2 < 0) {
                continue;
            }
            const y2 = findBottom(rows, x1, x2, y1, a);
            if (y2 < 0) {
                continue;
            }
            applyDoubleBorder(rows, x1, y1, x2, y2, a);
            changed = true;
            x1 = x2;
        }
    }
    return changed;
}

function findTopRight(row: string[], x1: number, a: BoxAlphabet): number {
    if (x1 + 3 >= row.length) {
        return -1;
    }
    let x = x1 + 1;
    while (x < row.length && row[x] === a.h) {
        x++;
    }
    if (x >= row.length || row[x] !== a.topRight || x - x1 < 3) {
        return -1;
    }
    return x;
}

function findBottom(rows: string[][], x1: number, x2: number, y1: number, a: BoxAlphabet): number {
    for (let y = y1 + 2; y < rows.length; y++) {
        const row = rows[y]!;
        if (row[x1] !== a.topLeft || row[x2] !== a.topRight) {
            continue;
        }
        let ok = true;
        for (let x = x1 + 1; x < x2; x++) {
            if (row[x] !== a.h) {
                ok = false;
                break;
            }
        }
        if (!ok) {
            continue;
        }
        for (let mid = y1 + 1; mid < y; mid++) {
            const chL = rows[mid]![x1];
            const chR = rows[mid]![x2];
            if (chL !== a.v && chL !== a.topLeft) {
                ok = false;
                break;
            }
            if (chR !== a.v && chR !== a.topRight) {
                ok = false;
                break;
            }
        }
        if (ok) {
            return y;
        }
    }
    return -1;
}

function applyDoubleBorder(rows: string[][], x1: number, y1: number, x2: number, y2: number, a: BoxAlphabet) {
    const top = rows[y1]!;
    top[x1] = a.outTopLeft;
    top[x1 + 1] = a.outTopJoin;
    top[x2 - 1] = a.outTopJoin;
    top[x2] = a.outTopRight;

    const bottom = rows[y2]!;
    bottom[x1] = a.outBottomLeft;
    bottom[x1 + 1] = a.outBottomJoin;
    bottom[x2 - 1] = a.outBottomJoin;
    bottom[x2] = a.outBottomRight;

    for (let y = y1 + 1; y < y2; y++) {
        const row = rows[y]!;
        if (isBarCell(row[x1], a)) {
            row[x1] = a.v;
        }
        if (isBarCell(row[x2], a)) {
            row[x2] = a.v;
        }
        if (isBarCell(row[x1 + 1], a)) {
            row[x1 + 1] = a.v;
        }
        if (isBarCell(row[x2 - 1], a)) {
            row[x2 - 1] = a.v;
        }
    }
}

function isBarCell(ch: string | undefined, a: BoxAlphabet): boolean {
    return ch === ' ' || ch === a.v || ch === a.topLeft || ch === a.topRight;
}

/** `|`/`│` sitting on a horizontal border is a through-crossing; use a T/cross join. */
function fixThroughCrossings(rows: string[][]): boolean {
    let changed = false;
    for (const row of rows) {
        for (let x = 1; x < row.length - 1; x++) {
            const left = row[x - 1]!;
            const right = row[x + 1]!;
            if (row[x] === '|' && isAsciiH(left) && isAsciiH(right)) {
                row[x] = '+';
                changed = true;
            } else if (row[x] === '│' && isUnicodeH(left) && isUnicodeH(right)) {
                row[x] = '┼';
                changed = true;
            }
        }
    }
    return changed;
}

function isAsciiH(ch: string): boolean {
    return ch === '-' || ch === '+' || ch === '=';
}

function isUnicodeH(ch: string): boolean {
    return ch === '─' || ch === '━' || ch === '┬' || ch === '┴' || ch === '┼' || ch === '├' || ch === '┤' || ch === '┌' || ch === '┐' || ch === '└' || ch === '┘';
}
