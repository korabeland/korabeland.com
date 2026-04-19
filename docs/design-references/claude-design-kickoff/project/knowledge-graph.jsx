// Interactive knowledge graph — 2D with subtle parallax, expandable overlay mode

const GRAPH_NODES = [
  { id: 'current',    label: 'this note',            x: 0.50, y: 0.50, depth: 0.0, r: 8, kind: 'self' },
  { id: 'maps',       label: 'borrowed maps',        x: 0.72, y: 0.26, depth: 0.3, r: 5 },
  { id: 'afford',     label: 'affordances',          x: 0.78, y: 0.54, depth: 0.6, r: 6 },
  { id: 'clearings',  label: 'clearings',            x: 0.68, y: 0.78, depth: 0.2, r: 5 },
  { id: 'teach',      label: "teach, don't perform", x: 0.92, y: 0.38, depth: 0.8, r: 7 },
  { id: 'myco',       label: 'mycorrhiza',           x: 0.88, y: 0.68, depth: 0.5, r: 6 },
  { id: 'simard',     label: 'simard, 1997',         x: 0.22, y: 0.28, depth: 0.15,r: 4 },
  { id: 'literacy',   label: 'systems literacy',     x: 0.26, y: 0.74, depth: 0.65,r: 5 },
  { id: 'permission', label: 'permission structures',x: 0.08, y: 0.52, depth: 0.4, r: 5 },
];

const GRAPH_EDGES = [
  ['current','maps'], ['current','afford'], ['current','clearings'],
  ['current','simard'], ['current','literacy'], ['current','permission'],
  ['afford','teach'], ['afford','myco'], ['maps','teach'],
  ['clearings','myco'], ['simard','myco'], ['permission','afford'],
  ['literacy','permission'],
];

const KnowledgeGraph = () => {
  const [expanded, setExpanded] = React.useState(false);
  const [hover, setHover] = React.useState(null);
  const [parallax, setParallax] = React.useState({ x: 0, y: 0 });
  const wrapRef = React.useRef(null);
  const rafRef = React.useRef(null);

  // Close on escape
  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const onMove = (e) => {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width  - 0.5;
    const ny = (e.clientY - r.top)  / r.height - 0.5;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setParallax({ x: nx, y: ny });
    });
  };
  const onLeave = () => {
    setParallax({ x: 0, y: 0 });
    setHover(null);
  };

  // deeper nodes drift more with cursor — gives parallax without breaking layout
  const project = (n, w, h) => {
    const baseX = n.x * w, baseY = n.y * h;
    const drift = 18 * n.depth;
    const px = baseX + parallax.x * drift;
    const py = baseY + parallax.y * drift;
    return { px, py };
  };

  const graphInner = (w, h) => {
    const pts = Object.fromEntries(
      GRAPH_NODES.map(n => [n.id, { ...n, ...project(n, w, h) }])
    );
    const ordered = [...GRAPH_NODES].sort((a, b) => a.depth - b.depth);
    const hoveredNeighbors = hover
      ? new Set(GRAPH_EDGES
          .filter(([a, b]) => a === hover || b === hover)
          .flat())
      : null;

    return (
      <>
        {/* ground plane — faint radial grid */}
        <svg width={w} height={h} style={{position:'absolute', inset:0, pointerEvents:'none'}}>
          <defs>
            <radialGradient id="kg-ground" cx="0.5" cy="0.5" r="0.55">
              <stop offset="0"   stopColor="var(--moss)"  stopOpacity="0.10"/>
              <stop offset="1"   stopColor="var(--moss)"  stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill="url(#kg-ground)"/>
          {[0.18, 0.30, 0.42, 0.54].map((f, i) => (
            <ellipse key={i}
              cx={w/2 + parallax.x * 8}
              cy={h/2 + parallax.y * 8}
              rx={w*f} ry={h*f*0.85}
              fill="none" stroke="var(--moss-soft)"
              strokeWidth="0.5" opacity={0.35 - i*0.06}/>
          ))}
        </svg>

        {/* edges */}
        <svg width={w} height={h} style={{position:'absolute', inset:0, pointerEvents:'none'}}>
          {GRAPH_EDGES.map(([a, b], i) => {
            const A = pts[a], B = pts[b];
            const active = hover && (hover === a || hover === b);
            const faded  = hover && !active;
            return (
              <line key={i}
                x1={A.px} y1={A.py} x2={B.px} y2={B.py}
                stroke={active ? 'var(--moss)' : 'var(--ink-soft)'}
                strokeWidth={active ? 1.2 : 0.7}
                strokeDasharray={active ? '0' : '2 4'}
                opacity={faded ? 0.12 : (active ? 0.95 : 0.55)}
                style={{transition:'opacity .2s ease, stroke .2s ease'}}
              />
            );
          })}
        </svg>

        {/* nodes */}
        {ordered.map(n => {
          const p = pts[n.id];
          const isSelf = n.kind === 'self';
          const isHover = hover === n.id;
          const isNeighbor = hoveredNeighbors && hoveredNeighbors.has(n.id) && !isHover;
          const faded = hover && !isHover && !isNeighbor;
          return (
            <div key={n.id}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                position:'absolute',
                left: p.px, top: p.py,
                transform: 'translate(-50%, -50%)',
                opacity: faded ? 0.3 : 1,
                transition: 'opacity .2s ease',
                cursor: 'pointer',
                zIndex: isSelf ? 5 : (isHover ? 4 : 2),
              }}>
              {/* dot */}
              <div style={{
                width: n.r * 2, height: n.r * 2,
                borderRadius: '50%',
                background: isSelf ? 'var(--moss)'
                          : isHover ? 'var(--ink)'
                          : 'var(--paper)',
                border: `1px solid ${isSelf || isHover ? 'var(--ink)' : 'var(--ink-soft)'}`,
                boxShadow: isSelf
                  ? '0 0 0 5px color-mix(in oklch, var(--moss) 20%, transparent)'
                  : isHover ? '0 2px 10px rgba(0,0,0,0.18)' : 'none',
                transition: 'all .18s ease',
              }}/>
              {/* label */}
              <div style={{
                position:'absolute',
                left: n.r + 8, top: '50%',
                transform: 'translateY(-50%)',
                whiteSpace: 'nowrap',
                fontFamily:'var(--font-display)',
                fontStyle:'italic',
                fontWeight: isSelf ? 500 : 400,
                fontSize: expanded ? (isSelf ? 18 : 14) : (isSelf ? 13 : 11),
                color: isSelf || isHover ? 'var(--ink)' : 'var(--ink-soft)',
                letterSpacing: '-0.01em',
                pointerEvents: 'none',
              }}>{n.label}</div>
            </div>
          );
        })}
      </>
    );
  };

  // ── COLLAPSED: inline in margin column ──
  const collapsed = (
    <div style={{
      marginTop:'var(--s-8)',
      border:'1px solid var(--rule)',
      background:'var(--paper-2)',
    }}>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'baseline',
        padding: '10px 12px 6px',
      }}>
        <div className="t-label">↳ connects to</div>
        <button onClick={() => setExpanded(true)}
          style={{
            fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'0.12em',
            textTransform:'uppercase', color:'var(--moss)',
            background:'transparent', border:'none', cursor:'pointer', padding:0,
          }}>expand ↗</button>
      </div>
      <div
        ref={!expanded ? wrapRef : null}
        onMouseMove={!expanded ? onMove : undefined}
        onMouseLeave={!expanded ? onLeave : undefined}
        onClick={() => setExpanded(true)}
        style={{
          position:'relative',
          width:'100%', height: 200,
          overflow:'hidden',
          cursor: 'zoom-in',
        }}>
        {!expanded && graphInner(260, 200)}
      </div>
      <div style={{
        padding:'6px 12px 10px',
        fontFamily:'var(--font-mono)', fontSize:9,
        color:'var(--ink-mute)', letterSpacing:'0.06em',
        borderTop:'1px solid var(--rule)',
      }}>
        9 nodes · 13 edges · click to explore
      </div>
    </div>
  );

  // ── EXPANDED: overlay scoped to the blog page .frame (portal'd there so
  // it escapes the margin column but stays inside the artboard). Avoids
  // position:fixed because the DesignCanvas applies a transform on its
  // world element, which would rebase fixed positioning to the canvas.
  const [frameEl, setFrameEl] = React.useState(null);
  const rootRef = React.useRef(null);

  React.useEffect(() => {
    if (!expanded || !rootRef.current) return;
    // walk up to the nearest .frame (the artboard's scroll container)
    let el = rootRef.current;
    while (el && !el.classList?.contains('frame')) el = el.parentElement;
    if (el) {
      // ensure the frame is a positioning ancestor for our absolute overlay
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      setFrameEl(el);
    }
  }, [expanded]);

  const overlayNode = expanded && frameEl && (
    <div
      style={{
        position: 'absolute',
        // cover the visible viewport of the frame regardless of scroll
        top: frameEl.scrollTop,
        left: 0,
        width: '100%',
        height: frameEl.clientHeight,
        background: 'color-mix(in oklch, var(--paper) 88%, transparent)',
        backdropFilter: 'blur(6px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
    >
      <div
        ref={wrapRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          position:'relative',
          width: '92%',
          maxWidth: 1200,
          height: 'min(720px, 84%)',
          background:'var(--paper)',
          border:'1px solid var(--ink)',
          boxShadow:'0 20px 80px rgba(0,0,0,0.18)',
          overflow:'hidden',
        }}>
        {/* chrome */}
        <div style={{
          position:'absolute', top:0, left:0, right:0,
          padding:'14px 20px', zIndex: 20,
          display:'flex', justifyContent:'space-between', alignItems:'baseline',
          borderBottom:'1px solid var(--rule)',
          background:'color-mix(in oklch, var(--paper) 95%, transparent)',
        }}>
          <div>
            <div className="t-label" style={{color:'var(--moss)'}}>↳ trail map of ideas</div>
            <div style={{fontFamily:'var(--font-display)', fontStyle:'italic',
                 fontSize:20, marginTop:2}}>
              how this note connects
            </div>
          </div>
          <div style={{display:'flex', gap:20, alignItems:'baseline'}}>
            <div className="t-mono" style={{fontSize:10}}>
              {hover
                ? `→ ${GRAPH_NODES.find(n => n.id === hover)?.label}`
                : 'hover a node · move cursor to parallax'}
            </div>
            <button
              onClick={() => setExpanded(false)}
              style={{
                fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.12em',
                textTransform:'uppercase', color:'var(--ink)',
                background:'transparent', border:'1px solid var(--ink)',
                padding:'6px 10px', cursor:'pointer',
              }}>close · esc</button>
          </div>
        </div>

        {/* graph stage — fills the box below the chrome */}
        <div style={{
          position:'absolute',
          top: 74, left: 0, right: 0, bottom: 36,
        }}>
          {/* render against the measured stage size — fall back to 1100×560 */}
          <GraphStage parallax={parallax} hover={hover} setHover={setHover}/>
        </div>

        {/* footer legend */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          padding:'9px 20px', borderTop:'1px solid var(--rule)',
          display:'flex', justifyContent:'space-between',
          fontFamily:'var(--font-mono)', fontSize:9,
          color:'var(--ink-mute)', letterSpacing:'0.08em',
        }}>
          <span>9 nodes · 13 edges · press esc to close</span>
          <span>
            <span style={{display:'inline-block', width:8, height:8, borderRadius:'50%',
                   background:'var(--moss)', marginRight:6, verticalAlign:'middle'}}/>
            current note
            <span style={{display:'inline-block', width:8, height:8, borderRadius:'50%',
                   background:'var(--paper)', border:'1px solid var(--ink-soft)',
                   marginLeft:16, marginRight:6, verticalAlign:'middle'}}/>
            related
          </span>
        </div>
      </div>
    </div>
  );

  return <div ref={rootRef}>{collapsed}{overlayNode && ReactDOM.createPortal(overlayNode, frameEl)}</div>;
};

// Separate component so it can measure its own container
const GraphStage = ({ parallax, hover, setHover }) => {
  const stageRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 1100, h: 560 });

  React.useEffect(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setSize({ w: width, h: height });
      }
    });
    ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const pts = Object.fromEntries(GRAPH_NODES.map(n => {
    const drift = 28 * n.depth;
    return [n.id, {
      ...n,
      px: n.x * w + parallax.x * drift,
      py: n.y * h + parallax.y * drift,
    }];
  }));
  const ordered = [...GRAPH_NODES].sort((a, b) => a.depth - b.depth);
  const hoveredNeighbors = hover
    ? new Set(GRAPH_EDGES.filter(([a,b]) => a===hover || b===hover).flat())
    : null;

  return (
    <div ref={stageRef} style={{position:'absolute', inset:0}}>
      {/* ground */}
      <svg width={w} height={h} style={{position:'absolute', inset:0}}>
        <defs>
          <radialGradient id="kg-ground-xl" cx="0.5" cy="0.5" r="0.55">
            <stop offset="0" stopColor="var(--moss)" stopOpacity="0.12"/>
            <stop offset="1" stopColor="var(--moss)" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill="url(#kg-ground-xl)"/>
        {[0.16, 0.26, 0.36, 0.46, 0.56].map((f, i) => (
          <ellipse key={i}
            cx={w/2 + parallax.x * 14}
            cy={h/2 + parallax.y * 14}
            rx={w*f} ry={h*f*0.82}
            fill="none" stroke="var(--moss-soft)"
            strokeWidth="0.6" opacity={0.4 - i*0.06}/>
        ))}
        {/* cardinal guides */}
        <line x1="0" y1={h/2} x2={w} y2={h/2}
              stroke="var(--rule)" strokeWidth="0.5" opacity="0.5"/>
        <line x1={w/2} y1="0" x2={w/2} y2={h}
              stroke="var(--rule)" strokeWidth="0.5" opacity="0.5"/>
      </svg>

      {/* edges */}
      <svg width={w} height={h} style={{position:'absolute', inset:0, pointerEvents:'none'}}>
        {GRAPH_EDGES.map(([a, b], i) => {
          const A = pts[a], B = pts[b];
          const active = hover && (hover === a || hover === b);
          const faded = hover && !active;
          const midX = (A.px + B.px) / 2;
          const midY = (A.py + B.py) / 2;
          return (
            <g key={i}>
              <line x1={A.px} y1={A.py} x2={B.px} y2={B.py}
                stroke={active ? 'var(--moss)' : 'var(--ink-soft)'}
                strokeWidth={active ? 1.4 : 0.8}
                strokeDasharray={active ? '0' : '3 5'}
                opacity={faded ? 0.08 : (active ? 0.95 : 0.45)}
                style={{transition:'opacity .2s, stroke .2s'}}
              />
              {active && (
                <text x={midX} y={midY - 4} textAnchor="middle"
                  fontSize="10" fill="var(--moss)"
                  fontFamily="var(--font-mono)" letterSpacing="0.1em">
                  —
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* nodes */}
      {ordered.map(n => {
        const p = pts[n.id];
        const isSelf = n.kind === 'self';
        const isHover = hover === n.id;
        const isNeighbor = hoveredNeighbors && hoveredNeighbors.has(n.id) && !isHover;
        const faded = hover && !isHover && !isNeighbor;
        const r = n.r * 1.5; // larger in expanded mode
        return (
          <div key={n.id}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            style={{
              position:'absolute',
              left: p.px, top: p.py,
              transform: 'translate(-50%, -50%)',
              opacity: faded ? 0.25 : 1,
              transition: 'opacity .2s ease',
              cursor: 'pointer',
              zIndex: isSelf ? 5 : (isHover ? 4 : 2),
            }}>
            <div style={{
              width: r * 2, height: r * 2,
              borderRadius: '50%',
              background: isSelf ? 'var(--moss)'
                        : isHover ? 'var(--ink)' : 'var(--paper)',
              border: `1.5px solid ${isSelf || isHover ? 'var(--ink)' : 'var(--ink-soft)'}`,
              boxShadow: isSelf
                ? '0 0 0 8px color-mix(in oklch, var(--moss) 18%, transparent)'
                : isHover ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
              transition: 'all .18s ease',
            }}/>
            <div style={{
              position:'absolute',
              left: r + 10, top: '50%',
              transform: 'translateY(-50%)',
              whiteSpace: 'nowrap',
              fontFamily:'var(--font-display)',
              fontStyle:'italic',
              fontWeight: isSelf ? 500 : 400,
              fontSize: isSelf ? 22 : 15,
              color: isSelf || isHover ? 'var(--ink)' : 'var(--ink-soft)',
              letterSpacing: '-0.01em',
              pointerEvents: 'none',
            }}>{n.label}</div>
          </div>
        );
      })}
    </div>
  );
};

window.KnowledgeGraph = KnowledgeGraph;
