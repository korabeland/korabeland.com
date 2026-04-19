// Home page — trailhead map metaphor with a 'now' section below

const HomeChrome = () => (
  <header className="chrome">
    <div className="mark">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
        <path d="M9 1 L11 9 L9 17 L7 9 Z" fill="currentColor" opacity="0.9"/>
        <circle cx="9" cy="9" r="1.5" fill="var(--paper)" stroke="currentColor"/>
      </svg>
      <span>korab eland</span>
    </div>
    <nav>
      <a className="active">trailhead</a>
      <a>field notes</a>
      <a>projects</a>
      <a>colophon</a>
    </nav>
    <div className="weather">
      <span className="dot"></span>
      <span>clear · 52°f · taking clients</span>
    </div>
  </header>
);

// ──────────────────────────────────────────────────────────────
// TrailMap — full-bleed topographic texture with wayfinding overlay
//
// Base: flowing contour lines extracted via marching-squares from a
// 2D noise field (biased so the center reads as a trailhead plateau).
// Light strokes for ordinary contours, darker strokes for index lines
// every 4th level. No color wash — pure neutral grays, per reference.
//
// Overlay: YOU ARE HERE with radar ping at center, three trails
// radiating to destination pins (field notes / projects / work with me).
// ──────────────────────────────────────────────────────────────
const TrailMap = ({ minimal = false } = {}) => {
  // -------- tiny deterministic value-noise --------
  const hash = (x, y, seed) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.57) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  };
  const smoothNoise = (x, y, seed) => {
    // bilinear-smoothed value noise
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash(xi,     yi,     seed);
    const b = hash(xi + 1, yi,     seed);
    const c = hash(xi,     yi + 1, seed);
    const d = hash(xi + 1, yi + 1, seed);
    return (a * (1-u) + b * u) * (1-v) + (c * (1-u) + d * u) * v;
  };
  const fbm = (x, y, seed) => {
    let v = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < 5; i++) {
      v += amp * smoothNoise(x * f, y * f, seed + i * 11);
      norm += amp;
      amp *= 0.52;
      f *= 2.05;
    }
    return v / norm; // in [-1, 1]
  };

  // -------- build elevation grid --------
  // Map viewBox is 720 × 440. We work in a coarse grid for perf.
  const W = 720, H = 440;
  const CELL = 6; // grid cell size in px — smaller = denser contours
  const COLS = Math.ceil(W / CELL) + 1;
  const ROWS = Math.ceil(H / CELL) + 1;
  const CX = W / 2, CY = H / 2;
  const SEED = 7.3;

  // Precompute field[row][col] — cached in a ref so we only build once.
  const fieldRef = React.useRef(null);
  if (!fieldRef.current) {
    const field = new Float32Array(COLS * ROWS);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL, y = r * CELL;
        // FBM base, sampled at a nice frequency (~3 cycles across the map)
        const nx = (x / W) * 4.2;
        const ny = (y / H) * 2.6;
        let v = fbm(nx, ny, SEED);                  // [-1..1]
        // radial bias: slight rise toward the trailhead center so the
        // "you are here" sits on a gentle plateau rather than a random spot
        const dx = (x - CX) / (W * 0.55);
        const dy = (y - CY) / (H * 0.55);
        const d = Math.sqrt(dx*dx + dy*dy);
        v += (1 - Math.min(d, 1)) * 0.35;           // plateau up to +0.35
        // subtle secondary noise breaks up the plateau
        v += fbm(nx * 2.3, ny * 2.3, SEED + 33) * 0.18;
        field[r * COLS + c] = v;
      }
    }
    fieldRef.current = field;
  }
  const field = fieldRef.current;
  const elev = (r, c) => field[r * COLS + c];

  // -------- marching squares — extract iso-lines at a given threshold --------
  // Returns an array of line segments: [[x1,y1,x2,y2], ...]
  const buildContour = (threshold) => {
    const segs = [];
    const lerp = (p1, p2, v1, v2) => {
      const t = (threshold - v1) / (v2 - v1 || 1e-9);
      return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
    };
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        const x0 = c * CELL, y0 = r * CELL;
        const x1 = x0 + CELL, y1 = y0 + CELL;
        const v00 = elev(r,   c),   v10 = elev(r,   c+1);
        const v01 = elev(r+1, c),   v11 = elev(r+1, c+1);
        let idx = 0;
        if (v00 > threshold) idx |= 1;
        if (v10 > threshold) idx |= 2;
        if (v11 > threshold) idx |= 4;
        if (v01 > threshold) idx |= 8;
        if (idx === 0 || idx === 15) continue;
        // midpoints on each edge
        const top    = () => lerp([x0,y0], [x1,y0], v00, v10);
        const right  = () => lerp([x1,y0], [x1,y1], v10, v11);
        const bottom = () => lerp([x0,y1], [x1,y1], v01, v11);
        const left   = () => lerp([x0,y0], [x0,y1], v00, v01);
        switch (idx) {
          case 1: case 14: { const a = top(), b = left();   segs.push([a[0],a[1],b[0],b[1]]); break; }
          case 2: case 13: { const a = top(), b = right();  segs.push([a[0],a[1],b[0],b[1]]); break; }
          case 3: case 12: { const a = left(),b = right();  segs.push([a[0],a[1],b[0],b[1]]); break; }
          case 4: case 11: { const a = right(),b = bottom(); segs.push([a[0],a[1],b[0],b[1]]); break; }
          case 5:          { const a = top(), b = right(); segs.push([a[0],a[1],b[0],b[1]]);
                             const c = bottom(), d = left(); segs.push([c[0],c[1],d[0],d[1]]); break; }
          case 6: case 9:  { const a = top(), b = bottom(); segs.push([a[0],a[1],b[0],b[1]]); break; }
          case 7: case 8:  { const a = left(), b = bottom(); segs.push([a[0],a[1],b[0],b[1]]); break; }
          case 10:         { const a = top(), b = left(); segs.push([a[0],a[1],b[0],b[1]]);
                             const c = right(), d = bottom(); segs.push([c[0],c[1],d[0],d[1]]); break; }
        }
      }
    }
    return segs;
  };

  // Build contour levels — results cached per-mount
  const levelsRef = React.useRef(null);
  if (!levelsRef.current) {
    const LEVELS = [];
    // distribute thresholds across the actual range of the field
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < field.length; i++) {
      if (field[i] < lo) lo = field[i];
      if (field[i] > hi) hi = field[i];
    }
    const N = 14;
    for (let i = 1; i < N; i++) {
      const t = lo + (hi - lo) * (i / N);
      const isIndex = i % 4 === 0;
      LEVELS.push({ t, segs: buildContour(t), isIndex });
    }
    levelsRef.current = LEVELS;
  }
  const LEVELS = levelsRef.current;

  // -------- trail paths (radial from center) --------
  // Destinations. Angles measured like a clock (0° = up / north).
  const DESTS = [
    { id: 'notes',   label: 'field notes',   sub: 'peak · 42 entries',
      angleDeg: -62, dist: 240, arrow: '→', color: 'ink', kind: 'primary' },
    { id: 'projects',label: 'projects',      sub: 'ridge · 9 studies',
      angleDeg: 62,  dist: 220, arrow: '→', color: 'ink', kind: 'primary' },
    { id: 'work',    label: 'work with me',  sub: 'clearing · 2 slots open',
      angleDeg: 168, dist: 175, arrow: '→', color: 'moss', kind: 'moss' },
  ];
  // Convert clock-angle to cartesian (screen y grows downward)
  const polar = (deg, r) => {
    const rad = (deg - 90) * Math.PI / 180;
    return [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r];
  };
  // Build a gently meandering path from center to destination using
  // a quadratic bezier whose control point is perpendicular-offset.
  const trailPath = (deg, dist, curve = 0.22) => {
    const [ex, ey] = polar(deg, dist);
    const mid = [(CX + ex) / 2, (CY + ey) / 2];
    // perpendicular direction
    const rad = (deg - 90) * Math.PI / 180;
    const px = -Math.sin(rad), py = Math.cos(rad);
    const c = [mid[0] + px * dist * curve, mid[1] + py * dist * curve];
    return `M ${CX} ${CY} Q ${c[0].toFixed(1)} ${c[1].toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:'block'}}>
      <defs>
        <marker id="tm-arr" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)"/>
        </marker>
        <marker id="tm-arr-moss" viewBox="0 0 10 10" refX="8" refY="5"
                markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--moss)"/>
        </marker>
      </defs>

      {/* -------- CONTOUR BASE -------- */}
      {/* regular contours (light) */}
      <g stroke="#d2d0cb" strokeWidth="0.55" fill="none" strokeLinecap="round">
        {LEVELS.filter(l => !l.isIndex).map((lv, li) => (
          <g key={li}>
            {lv.segs.map(([x1,y1,x2,y2], si) => (
              <line key={si} x1={x1.toFixed(1)} y1={y1.toFixed(1)}
                            x2={x2.toFixed(1)} y2={y2.toFixed(1)}/>
            ))}
          </g>
        ))}
      </g>
      {/* index contours (darker, heavier) */}
      <g stroke="#9a9690" strokeWidth="0.85" fill="none" strokeLinecap="round">
        {LEVELS.filter(l => l.isIndex).map((lv, li) => (
          <g key={li}>
            {lv.segs.map(([x1,y1,x2,y2], si) => (
              <line key={si} x1={x1.toFixed(1)} y1={y1.toFixed(1)}
                            x2={x2.toFixed(1)} y2={y2.toFixed(1)}/>
            ))}
          </g>
        ))}
      </g>

      {/* -------- TRAILS (radial from trailhead) -------- */}
      <g fill="none" strokeLinecap="round">
        {DESTS.map((d, i) => {
          const isMoss = d.kind === 'moss';
          return (
            <path key={i}
              d={trailPath(d.angleDeg, d.dist - 20, 0.18 + (i % 2) * 0.06)}
              stroke={isMoss ? 'var(--moss)' : 'var(--ink)'}
              strokeOpacity={isMoss ? 0.9 : 0.85}
              strokeWidth={isMoss ? 1.2 : 1.1}
              strokeDasharray="1.5 4.5"
              markerEnd={isMoss ? 'url(#tm-arr-moss)' : 'url(#tm-arr)'}>
              <animate attributeName="stroke-dashoffset"
                       from="0" to={isMoss ? '-60' : '-60'}
                       dur={`${16 + i * 3}s`} repeatCount="indefinite"/>
            </path>
          );
        })}
      </g>

      {/* -------- DESTINATION PINS -------- */}
      {DESTS.map((d, i) => {
        const [x, y] = polar(d.angleDeg, d.dist);
        const isMoss = d.kind === 'moss';
        const stroke = isMoss ? 'var(--moss)' : 'var(--ink)';
        // place label box offset from the end-point, opposite the center
        const rad = (d.angleDeg - 90) * Math.PI / 180;
        const ox = Math.cos(rad) * 24;
        const oy = Math.sin(rad) * 24;
        const bx = x + ox, by = y + oy;
        // box dims
        const w = 160, h = 40;
        // horizontal alignment of the box relative to pin
        const boxX = Math.max(8, Math.min(W - w - 8, bx > CX ? bx : bx - w));
        const boxY = Math.max(8, Math.min(H - h - 8, by - h / 2));
        return (
          <g key={i}>
            {/* short stem from pin dot to box */}
            {!minimal && (
              <line x1={x} y1={y} x2={bx} y2={by}
                    stroke={stroke} strokeWidth="0.8" opacity="0.6"/>
            )}
            <circle cx={x} cy={y} r="3.2" fill={isMoss ? 'var(--moss)' : 'var(--ink)'}/>
            <circle cx={x} cy={y} r="1.3" fill="var(--paper)"/>
            {!minimal && (
              <>
                <rect x={boxX} y={boxY} width={w} height={h}
                      fill="var(--paper)" stroke={stroke} strokeWidth={isMoss ? 1 : 0.9}/>
                {isMoss && (
                  <circle cx={boxX + 12} cy={boxY + 14} r="2.6" fill="var(--moss)">
                    <animate attributeName="opacity" values="1;0.4;1"
                             dur="2.4s" repeatCount="indefinite"/>
                  </circle>
                )}
                <text x={boxX + (isMoss ? 22 : 12)} y={boxY + 17}
                      fontSize="13" fill="var(--ink)"
                      fontFamily="var(--font-display)" fontStyle="italic">
                  {d.label} {d.arrow}
                </text>
                <text x={boxX + 12} y={boxY + 31}
                      fontSize="9" fill="var(--ink-mute)"
                      fontFamily="var(--font-mono)" letterSpacing="0.06em">
                  {d.sub}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* -------- YOU ARE HERE (center, with radar ping) -------- */}
      <g transform={`translate(${CX} ${CY})`}>
        {/* radar ping rings */}
        <circle r="6" fill="none" stroke="var(--moss)" strokeWidth="1" opacity="0.7">
          <animate attributeName="r"       values="6;32;6"     dur="3.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0;0.7"  dur="3.2s" repeatCount="indefinite"/>
        </circle>
        <circle r="6" fill="none" stroke="var(--moss)" strokeWidth="0.8" opacity="0.5">
          <animate attributeName="r"       values="6;40;6"     dur="4.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0;0.5"  dur="4.8s" repeatCount="indefinite"/>
        </circle>
        {/* solid center */}
        <circle r="7" fill="var(--paper)" stroke="var(--moss)" strokeWidth="1.2"/>
        <circle r="3.2" fill="var(--moss)"/>
        {/* label */}
        <text x="0" y="-20" textAnchor="middle"
              fontSize="8" fill="var(--ink)"
              fontFamily="var(--font-mono)" letterSpacing="0.18em">TRAILHEAD</text>
        <text x="0" y="28" textAnchor="middle"
              fontSize="7.5" fill="var(--ink-mute)"
              fontFamily="var(--font-mono)" letterSpacing="0.1em">you are here</text>
      </g>

      {/* -------- LEGEND (bottom-left) -------- */}
      <g transform="translate(30 410)">
        <text x="0" y="0" fontSize="7.5" fill="var(--ink-mute)"
              fontFamily="var(--font-mono)" letterSpacing="0.16em">TOPOGRAPHIC · REV 04.18.26</text>
        <g transform="translate(0 12)">
          <line x1="0" y1="0" x2="64" y2="0" stroke="var(--ink)" strokeWidth="0.6"/>
          <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="var(--ink)" strokeWidth="0.6"/>
          <line x1="32" y1="-1.5" x2="32" y2="1.5" stroke="var(--ink)" strokeWidth="0.4"/>
          <line x1="64" y1="-2.5" x2="64" y2="2.5" stroke="var(--ink)" strokeWidth="0.6"/>
          <text x="60" y="11" fontSize="7" fill="var(--ink-mute)" fontFamily="var(--font-mono)">1 km</text>
        </g>
      </g>

      {/* -------- contour interval legend (bottom-right) -------- */}
      <g transform="translate(580 410)">
        <line x1="0" y1="0" x2="20" y2="0" stroke="#d2d0cb" strokeWidth="0.6"/>
        <text x="26" y="2.5" fontSize="7" fill="var(--ink-mute)" fontFamily="var(--font-mono)">contour · 20m</text>
        <line x1="0" y1="10" x2="20" y2="10" stroke="#9a9690" strokeWidth="0.9"/>
        <text x="26" y="12.5" fontSize="7" fill="var(--ink-mute)" fontFamily="var(--font-mono)">index · 100m</text>
      </g>
    </svg>
  );
};

const HomePage = ({ hero = 'map' }) => {
  const isKiosk = hero === 'kiosk' || hero === 'letter';
  return (
    <div className="frame" data-page="home">
      {!isKiosk && <HomeChrome />}

      {isKiosk ? (
        /* Full-bleed trailhead kiosk — the page IS the map */
        window.TrailheadKiosk
          ? <window.TrailheadKiosk TrailMapCmp={TrailMap}/>
          : <div style={{padding:40}}>loading kiosk…</div>
      ) : (
        /* HERO — trailhead (split layout) */
        <section style={{padding:'var(--s-9) var(--s-8) var(--s-7)'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'var(--s-8)', alignItems:'center'}}>
            <div>
              <div className="t-label" style={{marginBottom:'var(--s-4)'}}>§ 01 · trailhead</div>
              <h1 className="t-display" style={{fontSize:56, margin:0, maxWidth:560, lineHeight:1.02}}>
                Independent design and research <span className="italic-serif" style={{color:'var(--moss)'}}>for the unusually curious.</span>
              </h1>
              <p className="t-serif" style={{fontSize:19, color:'var(--ink-soft)', maxWidth:480, marginTop:'var(--s-6)'}}>
                I'm <strong style={{color:'var(--ink)', fontWeight:500}}>Korab Eland</strong>. I
                guide teams and customers by giving them the tools to solve
                their own problems. The rest of this site is a trail map.
                Follow whichever path finds you.
              </p>
              <div style={{display:'flex', gap:'var(--s-3)', marginTop:'var(--s-6)'}}>
                <a className="btn">Read the notes</a>
                <a className="btn ghost">See the projects</a>
              </div>
            </div>
            <div style={{padding:'var(--s-4)', border:'1px solid var(--rule)', background:'var(--paper-2)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'var(--s-3)'}}>
                <span className="t-mono">plate i · trail map</span>
                <span className="t-mono">rev. 04.18.26</span>
              </div>
              <TrailMap/>
            </div>
          </div>
        </section>
      )}

      <div className="rule-soft" style={{margin:'0 var(--s-8)'}}/>

      {/* NOW section */}
      <section style={{padding:'var(--s-8)'}}>
        <div style={{display:'flex', alignItems:'baseline', gap:'var(--s-5)', marginBottom:'var(--s-6)'}}>
          <div className="t-label">§ 02 · now</div>
          <div style={{flex:1, height:1, background:'var(--rule)'}}/>
          <div className="t-mono">updated 3 days ago</div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr 1fr', gap:'var(--s-7)'}}>
          {/* Current projects */}
          <div>
            <div className="t-label" style={{color:'var(--moss)', marginBottom:'var(--s-4)'}}>↳ in the field</div>
            <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'var(--s-4)'}}>
              {[
                ['Heron','a self-serve analytics surface for non-engineers','active · wk 6 of 12'],
                ['Lichen','writing a short book on systems literacy','draft · ch. 3'],
                ['Cedar','advising a pre-seed AI startup on evaluation','monthly'],
              ].map(([n, d, s], i) => (
                <li key={i} style={{display:'grid', gridTemplateColumns:'80px 1fr auto', gap:'var(--s-4)',
                     alignItems:'baseline', paddingBottom:'var(--s-4)', borderBottom:'1px solid var(--rule)'}}>
                  <span className="italic-serif" style={{fontSize:17}}>{n}</span>
                  <span style={{color:'var(--ink-soft)'}}>{d}</span>
                  <span className="t-mono">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent writing */}
          <div>
            <div className="t-label" style={{color:'var(--moss)', marginBottom:'var(--s-4)'}}>↳ recent notes</div>
            <ul style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:'var(--s-4)'}}>
              {[
                ['Forests that scale','04.12.26','12 min'],
                ['On borrowed maps','03.28.26','8 min'],
                ['The weight of affordances','03.14.26','6 min'],
                ['Clearings','02.27.26','4 min'],
              ].map(([t, d, r], i) => (
                <li key={i}>
                  <div className="t-mono" style={{marginBottom:2}}>{d} · {r}</div>
                  <div className="t-serif" style={{fontSize:16}}>{t}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Availability */}
          <div>
            <div className="t-label" style={{color:'var(--moss)', marginBottom:'var(--s-4)'}}>↳ availability</div>
            <div style={{padding:'var(--s-5)', border:'1px solid var(--moss)', background:'color-mix(in oklch, var(--moss) 4%, transparent)'}}>
              <div style={{display:'flex', alignItems:'center', gap:'var(--s-2)', marginBottom:'var(--s-3)'}}>
                <span className="weather"><span className="dot"></span></span>
                <span className="t-mono" style={{color:'var(--moss)'}}>2 of 3 slots open</span>
              </div>
              <p className="t-serif" style={{fontSize:15, margin:0, color:'var(--ink-soft)'}}>
                Taking on short engagements through Q3. Best fit: small teams
                building the scaffolding for AI or data products.
              </p>
              <a className="btn" style={{marginTop:'var(--s-4)', width:'100%', justifyContent:'center'}}>
                start a conversation
              </a>
            </div>
            <div className="t-mono" style={{marginTop:'var(--s-3)', textAlign:'center'}}>
              or — hello@korab.land
            </div>
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer style={{padding:'var(--s-7) var(--s-8)', borderTop:'1px solid var(--rule)',
                      display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
        <div className="italic-serif" style={{fontSize:18}}>
          <em>thanks for wandering through.</em>
        </div>
        <div className="t-mono">© mmxxvi · press <span style={{color:'var(--moss)'}}>~</span> for a terminal</div>
      </footer>
    </div>
  );
};

window.HomePage = HomePage;
window.TrailMap = TrailMap;
window.HomeChrome = HomeChrome;
