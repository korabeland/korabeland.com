// Trailhead-kiosk hero — the page IS the map.
// Full-bleed TrailMap with a left "field log / register" rail and a right
// "popular routes" rail pinned over the map. Bottom strip = legend + stats.

const TrailheadKiosk = ({ TrailMapCmp }) => {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 820,                 // almost full artboard
      background: 'var(--paper-2)',
      overflow: 'hidden',
      borderBottom: '1px solid var(--rule)',
    }}>
      {/* FULL-BLEED MAP — stretched behind everything */}
      <div style={{
        position:'absolute', inset:0,
        display:'flex', alignItems:'stretch', justifyContent:'stretch',
      }}>
        <div style={{width:'100%', transform:'scale(1.45)', transformOrigin:'center center'}}>
          <TrailMapCmp minimal/>
        </div>
      </div>

      {/* paper vignette over map edges so rails read cleanly */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, color-mix(in oklch, var(--paper) 50%, transparent) 100%)',
      }}/>

      {/* ────────── LEFT RAIL · trail register ────────── */}
      <aside style={{
        position:'absolute',
        top: 28, left: 28, bottom: 64,
        width: 244,
        display:'flex', flexDirection:'column', gap: 14,
      }}>
        {/* masthead / name */}
        <div style={{
          background:'var(--paper)',
          border:'1px solid var(--ink)',
          padding:'14px 16px 12px',
          boxShadow:'1px 2px 0 var(--moss-soft)',
          position:'relative',
        }}>
          <TapeCorner pos="tl"/>
          <TapeCorner pos="tr"/>
          <div className="t-mono" style={{fontSize:9, letterSpacing:'0.18em', color:'var(--ink-mute)'}}>
            TRAIL REGISTER · NO. 04
          </div>
          <div className="t-display" style={{fontSize:30, lineHeight:1.0, marginTop:6, letterSpacing:'-0.02em'}}>
            korab<span style={{color:'var(--moss)'}}>.</span>land
          </div>
          <div className="italic-serif" style={{fontSize:14, color:'var(--ink-soft)', marginTop:6}}>
            independent design &amp; research
            <br/>for the unusually curious.
          </div>
          <div style={{
            marginTop:12, paddingTop:10,
            borderTop:'1px dashed var(--rule)',
            display:'flex', justifyContent:'space-between',
            fontFamily:'var(--font-mono)', fontSize:9,
            color:'var(--ink-mute)', letterSpacing:'0.08em',
          }}>
            <span>est. 2019</span>
            <span>rev. 04.18.26</span>
          </div>
        </div>

        {/* weather / status */}
        <div style={{
          background:'var(--paper)',
          border:'1px solid var(--rule)',
          padding:'10px 14px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          gap: 10,
        }}>
          <div style={{display:'flex', alignItems:'center', gap: 8}}>
            <span className="weather" style={{width:8, height:8, display:'inline-block'}}>
              <span className="dot"/>
            </span>
            <span className="t-mono" style={{color:'var(--moss)', fontSize:10}}>
              TAKING 2 CLIENTS
            </span>
          </div>
          <span className="t-mono" style={{fontSize:9, color:'var(--ink-mute)'}}>
            clear · 52°
          </span>
        </div>

        {/* today's entry — typewriter */}
        <div style={{
          background:'var(--paper)',
          border:'1px solid var(--rule)',
          padding:'14px 16px 12px',
          position:'relative',
          flex: 1,
          overflow:'hidden',
        }}>
          <TapeCorner pos="tl" rotate={-8}/>
          <div className="t-label" style={{marginBottom: 8}}>
            § today's entry
          </div>
          <div className="italic-serif" style={{fontSize:13, color:'var(--ink-mute)', marginBottom: 10}}>
            thu · apr 18 · 9:42am
          </div>
          <p style={{
            fontFamily:'var(--font-mono)',
            fontSize: 11.5, lineHeight: 1.5,
            color:'var(--ink)', margin:0,
            whiteSpace:'pre-line',
          }}>{`reworking heron's onboarding.
the real problem isn't
the learning curve — it's
that nobody knows where
the curve ends.

drafted a piece on
permission structures.
maybe a footnote to
"borrowed maps."`}</p>
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop:'1px dashed var(--rule)',
            fontFamily:'var(--font-display)', fontStyle:'italic',
            fontSize: 13, color:'var(--ink-soft)',
          }}>
            — k.e.<span className="caret" style={{
              display:'inline-block', width:7, height:13,
              background:'var(--moss)', marginLeft:4, verticalAlign:'-2px',
              animation:'blink 1.1s step-end infinite',
            }}/>
          </div>
        </div>

        {/* foot — guestbook link */}
        <div style={{
          padding:'8px 10px',
          fontFamily:'var(--font-mono)', fontSize:9,
          letterSpacing:'0.12em', color:'var(--ink-mute)',
          display:'flex', justifyContent:'space-between',
        }}>
          <span>↳ sign the register</span>
          <span>guestbook →</span>
        </div>
      </aside>

      {/* ────────── RIGHT RAIL · popular routes ────────── */}
      <aside style={{
        position:'absolute',
        top: 28, right: 28, bottom: 64,
        width: 284,
        display:'flex', flexDirection:'column', gap: 12,
      }}>
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'baseline',
          padding:'0 4px',
        }}>
          <div className="t-label">↳ popular routes</div>
          <div className="t-mono" style={{fontSize:9, color:'var(--ink-mute)'}}>
            this month
          </div>
        </div>

        <RouteCard
          eyebrow="TO THE UPPER FOREST"
          title="field notes"
          sub="42 entries · essays, marginalia"
          stats={['5–20 min ea.', 'moss trail', '●●○']}
          tag="most walked"
          rotate={-0.4}
        />
        <RouteCard
          eyebrow="TO THE EAST RIDGE"
          title="projects"
          sub="9 case studies · tools &amp; systems"
          stats={['12–25 min ea.', 'stone path', '●●●']}
          tag="new · 2 added"
          rotate={0.6}
        />
        <RouteCard
          eyebrow="TO THE CLEARING"
          title="work with me"
          sub="2 slots open · q3 2026"
          stats={['30 min call', 'well graded', '●○○']}
          accent="moss"
          rotate={-0.3}
        />
        <RouteCard
          eyebrow="TO THE CREEK"
          title="about · bio"
          sub="one page · photograph · contact"
          stats={['2 min', 'flat', '●○○']}
          rotate={0.4}
          dim
        />

        {/* you-are-here hint */}
        <div style={{
          marginTop:'auto',
          padding:'10px 12px',
          border:'1px dashed var(--moss)',
          background:'color-mix(in oklch, var(--moss) 5%, var(--paper))',
          fontFamily:'var(--font-mono)', fontSize:9.5,
          color:'var(--ink-soft)', letterSpacing:'0.06em',
          display:'flex', alignItems:'baseline', justifyContent:'space-between',
        }}>
          <span>↑ you're at the trailhead</span>
          <span style={{color:'var(--moss)'}}>elev. 412m</span>
        </div>
      </aside>

      {/* ────────── BOTTOM STRIP · legend + stats ────────── */}
      <footer style={{
        position:'absolute', left:0, right:0, bottom:0,
        height: 48,
        background: 'color-mix(in oklch, var(--paper) 92%, transparent)',
        borderTop:'1px solid var(--ink)',
        backdropFilter: 'blur(3px)',
        display:'flex', alignItems:'center',
        padding:'0 28px',
        gap: 28,
        fontFamily:'var(--font-mono)', fontSize:10,
        letterSpacing:'0.08em', color:'var(--ink-soft)',
      }}>
        <span style={{color:'var(--ink)', letterSpacing:'0.16em'}}>
          KORAB.LAND — TRAILHEAD
        </span>
        <span style={{flex:1}}/>
        {/* legend chips */}
        <LegendChip swatch="var(--moss)" label="open"/>
        <LegendChip swatch="var(--ink-soft)" label="draft"/>
        <LegendChip swatch="var(--paper)" bordered label="archive"/>
        <span style={{flex:1}}/>
        <span>last walker: 2h ago</span>
        <span style={{color:'var(--ink-mute)'}}>·</span>
        <span>build 04.18.26</span>
        <span style={{color:'var(--ink-mute)'}}>·</span>
        <span style={{color:'var(--moss)'}}>press ~ for terminal</span>
      </footer>

      {/* local animations */}
      <style>{`
        @keyframes blink { 0%, 50% {opacity:1} 50.01%, 100% {opacity:0} }
      `}</style>
    </div>
  );
};

// ── small parts ──

// Real tape: translucent strip with ragged ends, inner highlight, soft shadow,
// subtle paper-fiber streaks. Sits over the card corner; its cast shadow lands
// on the paper beneath.
const TapeCorner = ({ pos = 'tl', rotate = 0, length = 44, color = 'amber' }) => {
  // two palettes: warm masking-tape (default) and cool moss washi
  const tone = color === 'moss'
    ? {
        fill: 'color-mix(in oklch, var(--moss) 32%, #f6efd9)',
        edge: 'color-mix(in oklch, var(--moss) 45%, var(--ink-mute))',
        hi:   'color-mix(in oklch, var(--moss) 12%, #fffbe9)',
      }
    : {
        fill: 'color-mix(in oklch, #d8b974 65%, #f3e7c3)',   // warm amber
        edge: 'color-mix(in oklch, #8a6d36 55%, var(--ink-mute))',
        hi:   '#fff6dd',
      };

  // Ragged torn-paper ends via polygon clip-path
  const ragged =
    'polygon(\
      3% 22%, 7% 10%, 14% 18%, 22% 6%, 31% 14%, 40% 4%, 52% 12%,\
      63% 2%, 74% 14%, 84% 8%, 92% 18%, 97% 6%, 98% 78%, 93% 92%,\
      85% 82%, 76% 96%, 65% 88%, 54% 98%, 43% 86%, 33% 96%, 22% 82%,\
      14% 94%, 7% 84%, 2% 92%)';

  const base = {
    position:'absolute',
    width: length, height: 18,
    pointerEvents:'none',
    // layered: base fill + faint diagonal fiber streaks + inner highlight band
    backgroundImage: `
      linear-gradient(180deg,
        ${tone.hi} 0%,
        ${tone.hi} 18%,
        transparent 22%,
        transparent 78%,
        color-mix(in oklch, ${tone.edge} 30%, transparent) 100%),
      repeating-linear-gradient(115deg,
        transparent 0 3px,
        color-mix(in oklch, ${tone.edge} 10%, transparent) 3px 4px),
      linear-gradient(180deg, ${tone.fill}, ${tone.fill})
    `,
    border: `0.5px solid color-mix(in oklch, ${tone.edge} 35%, transparent)`,
    opacity: 0.82,
    clipPath: ragged,
    WebkitClipPath: ragged,
    // cast shadow via filter so it respects the clip-path silhouette
    filter: 'drop-shadow(0 1.5px 1.2px rgba(40, 34, 20, 0.22))',
    mixBlendMode: 'multiply',
  };

  const placement = {
    tl: { top: -9, left: -12, transform: `rotate(${-18 + rotate}deg)`,
          transformOrigin: 'center' },
    tr: { top: -9, right: -12, transform: `rotate(${18 + rotate}deg)`,
          transformOrigin: 'center' },
    bl: { bottom: -9, left: -12, transform: `rotate(${18 + rotate}deg)`,
          transformOrigin: 'center' },
    br: { bottom: -9, right: -12, transform: `rotate(${-18 + rotate}deg)`,
          transformOrigin: 'center' },
  }[pos];

  return <span aria-hidden="true" style={{...base, ...placement}}/>;
};

const RouteCard = ({ eyebrow, title, sub, stats, tag, accent, rotate = 0, dim }) => {
  const isMoss = accent === 'moss';
  return (
    <div style={{
      position:'relative',
      background:'var(--paper)',
      border: `1px solid ${isMoss ? 'var(--moss)' : 'var(--ink)'}`,
      padding:'12px 14px 11px',
      transform: `rotate(${rotate}deg)`,
      boxShadow: isMoss
        ? '1px 2px 0 color-mix(in oklch, var(--moss) 22%, transparent)'
        : '1px 2px 0 var(--moss-soft)',
      opacity: dim ? 0.82 : 1,
    }}>
      <TapeCorner pos={rotate < 0 ? 'tr' : 'tl'}/>

      <div style={{
        display:'flex', justifyContent:'space-between',
        alignItems:'baseline', marginBottom: 4,
      }}>
        <span className="t-mono" style={{fontSize:9, letterSpacing:'0.14em',
              color: isMoss ? 'var(--moss)' : 'var(--ink-mute)'}}>
          {eyebrow}
        </span>
        {tag && (
          <span className="t-mono" style={{
            fontSize:8, letterSpacing:'0.12em',
            padding:'2px 6px',
            border: '1px solid var(--ink)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            textTransform:'uppercase',
          }}>{tag}</span>
        )}
      </div>

      <div style={{
        fontFamily:'var(--font-display)', fontStyle:'italic',
        fontSize: 24, lineHeight: 1.05,
        color: 'var(--ink)',
        marginBottom: 4,
      }}>
        {title} <span style={{color: isMoss ? 'var(--moss)' : 'var(--ink-soft)'}}>→</span>
      </div>
      <div style={{
        fontFamily:'var(--font-body)',
        fontSize: 12.5, color: 'var(--ink-soft)',
        marginBottom: 8,
      }} dangerouslySetInnerHTML={{__html: sub}}/>

      <div style={{
        display:'flex', justifyContent:'space-between',
        paddingTop: 8, borderTop: '1px dashed var(--rule)',
        fontFamily:'var(--font-mono)', fontSize:9.5,
        color: 'var(--ink-mute)', letterSpacing:'0.08em',
      }}>
        {stats.map((s, i) => <span key={i}>{s}</span>)}
      </div>
    </div>
  );
};

const LegendChip = ({ swatch, label, bordered }) => (
  <span style={{display:'inline-flex', alignItems:'center', gap: 6}}>
    <span style={{
      width: 10, height: 10, borderRadius: '50%',
      background: swatch,
      border: bordered ? '1px solid var(--ink-soft)' : 'none',
      display:'inline-block',
    }}/>
    <span>{label}</span>
  </span>
);

window.TrailheadKiosk = TrailheadKiosk;
