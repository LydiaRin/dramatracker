// Decorative ink-wash background for the hero: sun, mountains, mist, birds, plum branch.
// Later you can replace this whole component with your own Krita painting as an <img>.

function Blossom({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const d = r * 1.4
  return (
    <g fill={color}>
      <circle cx={x} cy={y - d} r={r} />
      <circle cx={x + d} cy={y - d / 3} r={r} />
      <circle cx={x + d * 0.6} cy={y + d} r={r} />
      <circle cx={x - d * 0.6} cy={y + d} r={r} />
      <circle cx={x - d} cy={y - d / 3} r={r} />
      <circle cx={x} cy={y} r={r / 2} fill="#7A1F22" />
    </g>
  )
}

function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 1440 440" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx="1010" cy="110" r="58" fill="#D63B2F" />

      {/* far mountains */}
      <path d="M600 440 L640 300 Q660 220 690 260 L720 180 Q745 110 770 190 L790 240 Q815 200 830 250 L860 330 L900 280 Q930 230 950 290 L990 440 Z" fill="#2B2826" fillOpacity="0.16" />
      <path d="M1060 440 L1090 260 Q1110 140 1140 200 L1160 120 Q1185 40 1210 140 L1230 220 Q1255 170 1275 230 L1300 300 Q1330 250 1350 310 L1400 440 Z" fill="#2B2826" fillOpacity="0.22" />
      <rect x="560" y="330" width="900" height="40" fill="#F4EEE3" fillOpacity="0.55" />

      {/* near mountains */}
      <path d="M700 440 L740 330 Q760 270 790 320 L820 260 Q845 200 865 280 L900 360 Q925 320 945 370 L980 440 Z" fill="#2B2826" fillOpacity="0.45" />
      <path d="M1150 440 L1180 310 Q1200 230 1225 290 L1250 230 Q1270 170 1290 250 L1320 340 Q1345 300 1365 360 L1400 440 Z" fill="#2B2826" fillOpacity="0.6" />
      <rect x="560" y="395" width="900" height="20" fill="#F4EEE3" fillOpacity="0.5" />
      <path d="M860 440 Q900 400 950 410 Q1000 380 1060 405 Q1110 390 1160 415 L1200 440 Z" fill="#2B2826" fillOpacity="0.8" />

      {/* birds */}
      <g fill="none" stroke="#2B2826" strokeWidth="1.6" strokeLinecap="round">
        <path d="M880 150 q6 -6 12 0 q6 -6 12 0" />
        <path d="M915 170 q5 -5 10 0 q5 -5 10 0" />
        <path d="M860 185 q4 -4 8 0 q4 -4 8 0" />
      </g>

      {/* plum branch */}
      <g stroke="#2B2826" strokeLinecap="round" fill="none">
        <path d="M1440 40 C1380 70 1340 90 1290 150 C1260 185 1240 230 1236 280" strokeWidth="7" />
        <path d="M1330 105 C1360 120 1385 150 1392 190" strokeWidth="4" />
        <path d="M1280 165 C1250 160 1225 170 1200 195" strokeWidth="3.5" />
        <path d="M1252 230 C1275 245 1290 270 1296 300" strokeWidth="3" />
      </g>
      <Blossom x={1305} y={131} r={7} color="#E06A7A" />
      <Blossom x={1393} y={182} r={8} color="#C8323A" />
      <Blossom x={1214} y={189} r={6} color="#E06A7A" />
      <Blossom x={1295} y={294} r={7} color="#C8323A" />
      <Blossom x={1348} y={98} r={5} color="#E06A7A" />
    </svg>
  )
}

export default HeroArt
