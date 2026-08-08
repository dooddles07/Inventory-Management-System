/*
  Real Code 39, not a decorative bar pattern. Nine elements per character,
  three of them wide, wrapped in the * start and stop characters.
  A scanner pointed at this reads back the SKU.
*/

const PATTERNS: Record<string, string> = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
  "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
  "8": "100100100", "9": "001100100", A: "100001001", B: "001001001",
  C: "101001000", D: "000011001", E: "100011000", F: "001011000",
  G: "000001101", H: "100001100", I: "001001100", J: "000011100",
  K: "100000011", L: "001000011", M: "101000010", N: "000010011",
  O: "100010010", P: "001010010", Q: "000000111", R: "100000110",
  S: "001000110", T: "000010110", U: "110000001", V: "011000001",
  W: "111000000", X: "010010001", Y: "110010000", Z: "011010000",
  "-": "010000101", ".": "110000100", " ": "011000100", $: "010101000",
  "/": "010100010", "+": "010001010", "%": "000101010", "*": "010010100",
};

const NARROW = 1;
const WIDE = 3;
const GAP = 1;

export function Barcode({ value, height = 40 }: { value: string; height?: number }) {
  const text = value.toUpperCase();
  const encodable = [...text].every((character) => character in PATTERNS);
  if (!encodable) return null;

  const bars: Array<{ x: number; width: number }> = [];
  let cursor = 0;

  for (const character of `*${text}*`) {
    const pattern = PATTERNS[character];
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === "1" ? WIDE : NARROW;
      if (index % 2 === 0) bars.push({ x: cursor, width });
      cursor += width;
    }
    cursor += GAP;
  }

  const total = cursor - GAP;

  return (
    <svg
      viewBox={`0 0 ${total} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Code 39 barcode for ${text}`}
      className="h-10 w-full"
    >
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={0}
          width={bar.width}
          height={height}
          fill="var(--color-ink-900)"
        />
      ))}
    </svg>
  );
}
