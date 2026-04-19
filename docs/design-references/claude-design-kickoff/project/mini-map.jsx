// MiniMap — compact trail overview for blog + case-study left rails.
// Shows the same three destinations as the home TrailMap with ONE pin
// highlighted (the page you're reading) and a soft ping.
//
// Usage: <MiniMap active="notes" /> — one of 'notes' | 'projects' | 'work'

const MINIMAP_DESTS = [
  { id: 'notes',    label: 'field notes',  angleDeg: -62, dist: 72, sub: 'peak · 42 entries' },
  { id: 'projects', label: 'projects',     angleDeg:  62, dist: 66, sub: 'ridge · 9 studies' },
  { id: 'work',     label: 'work with me', angleDeg: 168, dist: 54, sub: 'clearing · open' },
];

const MiniMap = ({ active = 'notes', title = '↳ you are here', hint = '' }) => {
  const W = 220, H = 170;
  const CX = W / 2, CY = H / 2 + 4;

  const polar = (deg, r) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r];
  };
  const trailD = (deg, dist, curve = 0.2) => {
    const [ex, ey] = polar(deg, dist);
    const rad = (deg - 90) * Math.PI / 180;
    const px = -Math.sin(rad), py = Math.cos(rad);
    const mx = (CX + ex) / 2, my = (CY + ey) / 2;
    const cx = mx + px * dist * curve, cy = my + py * dist * curve;
    return `M ${CX} ${CY} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  };

  // Concentric contour rings — simplified topo for the mini
  const rings = [18, 30, 42, 54, 66, 78];

  // Decoy satellite peaks (soft contour clumps) — very faint
  const peaks = [
    { cx: 54, cy: 40, rings: [8, 14, 20] },
    { cx: 170, cy: 46, rings: [7, 12, 18] },
    { cx: 60, cy: 128, rings: [6, 11] },
    { cx: 168, cy: 126, rings: [7, 13, 19] },
  ];

  const activeDest = MINIMAP_DESTS.find(d => d.id === active);

  return (
    <div style={{
      border: '1px solid var(--rule)',
      background: 'var(--paper-2)',
      padding: '10px 12px 8px',
      position: 'relative',
    }}>
      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'baseline', marginBottom: 6,
      }}>
        <span className="t-label" style={{color:'var(--moss)'}}>{title}</span>
        <span className="t-mono" style={{fontSize:8, color:'var(--ink-mute)'}}>
          plate i · mini
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:'block'}}>
        {/* ─ contours (central trailhead) ─ */}
        <g stroke="#d2d0cb" strokeWidth="0.5" fill="none">
          {rings.filter((_, i) => i % 2 !== 0).map((r, i) => (
            <circle key={`r-${i}`} cx={CX} cy={CY} r={r}
              transform={`rotate(${-6 + i*2} ${CX} ${CY}) scale(1 ${0.78 + i*0.02})`}
              style={{transformOrigin:`${CX}px ${CY}px`}}/>
          ))}
        </g>
        <g stroke="#9a9690" strokeWidth="0.75" fill="none">
          {rings.filter((_, i) => i % 2 === 0).map((r, i) => (
            <circle key={`ri-${i}`} cx={CX} cy={CY} r={r}
              transform={`rotate(${-6 + i*2} ${CX} ${CY}) scale(1 ${0.78 + i*0.02})`}
              style={{transformOrigin:`${CX}px ${CY}px`}}/>
          ))}
        </g>

        {/* ─ decoy peaks ─ */}
        <g stroke="#d2d0cb" strokeWidth="0.4" fill="none" opacity="0.75">
          {peaks.map((p, i) => (
            <g key={i}>
              {p.rings.map((r, j) => (
                <ellipse key={j} cx={p.cx} cy={p.cy} rx={r} ry={r*0.68}
                  transform={`rotate(${-10 + j*4} ${p.cx} ${p.cy})`}/>
              ))}
            </g>
          ))}
        </g>

        {/* ─ trails ─ */}
        <g fill="none" strokeLinecap="round">
          {MINIMAP_DESTS.map((d, i) => {
            const isActive = d.id === active;
            const isMoss = d.id === 'work';
            return (
              <path key={d.id}
                d={trailD(d.angleDeg, d.dist - 6, 0.16 + (i % 2) * 0.05)}
                stroke={isActive ? 'var(--moss)' : (isMoss ? 'var(--moss)' : 'var(--ink)')}
                strokeOpacity={isActive ? 0.95 : 0.45}
                strokeWidth={isActive ? 1.1 : 0.7}
                strokeDasharray="1.2 3.2"/>
            );
          })}
        </g>

        {/* ─ trailhead dot (center) ─ */}
        <g>
          <circle cx={CX} cy={CY} r="4.5" fill="var(--paper)"
                  stroke="var(--ink-soft)" strokeWidth="0.8"/>
          <circle cx={CX} cy={CY} r="1.8" fill="var(--ink-soft)"/>
        </g>

        {/* ─ destination pins ─ */}
        {MINIMAP_DESTS.map(d => {
          const [x, y] = polar(d.angleDeg, d.dist);
          const isActive = d.id === active;
          const isMoss = d.id === 'work';
          const stroke = isActive ? 'var(--moss)' : (isMoss ? 'var(--moss)' : 'var(--ink-soft)');
          return (
            <g key={d.id}>
              {isActive && (
                <>
                  <circle cx={x} cy={y} r="4" fill="none"
                          stroke="var(--moss)" strokeWidth="0.8" opacity="0.6">
                    <animate attributeName="r"       values="4;12;4" dur="2.4s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx={x} cy={y} r="8" fill="none"
                          stroke="var(--moss)" strokeWidth="0.6" opacity="0.3"/>
                </>
              )}
              <circle cx={x} cy={y} r={isActive ? 3.4 : 2.6}
                      fill={isActive ? 'var(--moss)' : (isMoss ? 'var(--moss)' : 'var(--ink)')}
                      stroke={isActive ? 'var(--ink)' : 'none'} strokeWidth="0.5"/>
              {isActive && <circle cx={x} cy={y} r="1.2" fill="var(--paper)"/>}

              {/* label — compact, positioned outside the pin away from center */}
              {(() => {
                const rad = (d.angleDeg - 90) * Math.PI / 180;
                const lx = x + Math.cos(rad) * 10;
                const ly = y + Math.sin(rad) * 10;
                const anchor = lx < CX ? 'end' : (Math.abs(lx - CX) < 6 ? 'middle' : 'start');
                return (
                  <text x={lx} y={ly + 3}
                    fontSize="8.5"
                    fill={isActive ? 'var(--ink)' : 'var(--ink-soft)'}
                    fontFamily="var(--font-display)"
                    fontStyle="italic"
                    textAnchor={anchor}
                    fontWeight={isActive ? 500 : 400}>
                    {d.label}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* ─ trailhead label ─ */}
        <text x={CX} y={CY + 16} textAnchor="middle"
              fontSize="6.5" fill="var(--ink-mute)"
              fontFamily="var(--font-mono)" letterSpacing="0.14em">
          TRAILHEAD
        </text>

        {/* ─ compass ─ */}
        <g transform={`translate(${W - 18} 14)`}>
          <circle r="9" fill="var(--paper)" stroke="var(--ink-mute)" strokeWidth="0.4" opacity="0.85"/>
          <path d="M0 -8 L2 0 L0 8 L-2 0 Z" fill="var(--ink)"/>
          <path d="M0 -8 L2 0 L0 0 Z" fill="var(--moss)"/>
          <text x="0" y="-11" textAnchor="middle" fontSize="5.5"
                fill="var(--ink)" fontFamily="var(--font-mono)" fontWeight="600">N</text>
        </g>
      </svg>

      {/* caption */}
      <div style={{
        paddingTop: 8, marginTop: 6,
        borderTop: '1px dashed var(--rule)',
        display:'flex', justifyContent:'space-between',
        fontFamily:'var(--font-mono)', fontSize:8.5,
        color:'var(--ink-mute)', letterSpacing:'0.08em',
      }}>
        <span style={{color:'var(--moss)'}}>
          ● {activeDest ? activeDest.sub : ''}
        </span>
        <a href="#" style={{color:'var(--ink-mute)', textDecoration:'none'}}>
          full map ↗
        </a>
      </div>
    </div>
  );
};

window.MiniMap = MiniMap;
