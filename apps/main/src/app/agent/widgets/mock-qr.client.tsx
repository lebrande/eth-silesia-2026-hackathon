"use client";

export function MockQr({
  size = 120,
  seed = "tauron-demo-2026",
}: {
  size?: number;
  seed?: string;
}) {
  const N = 21;
  const cell = size / N;

  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  function rng() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  const finders = [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ] as const;

  function isFinder(x: number, y: number) {
    for (const [fx, fy] of finders) {
      const dx = x - fx;
      const dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) {
        const ring = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        return ring || core;
      }
    }
    return false;
  }

  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (isFinder(x, y) || rng() < 0.5) cells.push({ x, y });
    }
  }

  return (
    <svg
      role="img"
      aria-label="Mock QR code"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-sm bg-white"
    >
      {cells.map((c, i) => (
        <rect
          key={i}
          x={c.x * cell}
          y={c.y * cell}
          width={cell}
          height={cell}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
