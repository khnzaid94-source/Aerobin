/**
 * Abstract, decorative-only accent art for each landing-page card.
 * Purely visual (aria-hidden, pointer-events:none via .ab-card-accent) —
 * never carries information a screen reader or colour-blind user would
 * need, so its opacity/contrast isn't part of the readability checklist.
 */

export function WaveArt({ color }) {
  // Citizen Alert — overlapping wave lines, standing in for air/wind.
  return (
    <svg viewBox="0 0 100 100" className="ab-card-accent" aria-hidden="true">
      <path d="M0 35 Q 20 20, 40 35 T 80 35 T 120 35" fill="none" stroke={color} strokeWidth="3" />
      <path d="M0 55 Q 20 40, 40 55 T 80 55 T 120 55" fill="none" stroke={color} strokeWidth="3" opacity="0.7" />
      <path d="M0 75 Q 20 60, 40 75 T 80 75 T 120 75" fill="none" stroke={color} strokeWidth="3" opacity="0.45" />
    </svg>
  )
}

export function NodeGridArt({ color }) {
  // PMC Dispatch — nodes connected by thin lines, standing in for data/routing.
  const nodes = [
    [22, 20], [62, 14], [88, 38], [40, 46], [70, 68], [18, 62], [50, 84],
  ]
  const edges = [
    [0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [3, 4], [3, 5], [4, 6], [5, 6],
  ]
  return (
    <svg viewBox="0 0 100 100" className="ab-card-accent" aria-hidden="true">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke={color} strokeWidth="1.5"
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 2 ? 5 : 3.5} fill={color} />
      ))}
    </svg>
  )
}

export function RingsArt({ color }) {
  // Impact Analyst — concentric rings, standing in for measurement/scale.
  return (
    <svg viewBox="0 0 100 100" className="ab-card-accent" aria-hidden="true">
      <circle cx="75" cy="25" r="10" fill="none" stroke={color} strokeWidth="3" />
      <circle cx="75" cy="25" r="22" fill="none" stroke={color} strokeWidth="3" opacity="0.7" />
      <circle cx="75" cy="25" r="34" fill="none" stroke={color} strokeWidth="3" opacity="0.45" />
      <circle cx="75" cy="25" r="46" fill="none" stroke={color} strokeWidth="3" opacity="0.25" />
    </svg>
  )
}
