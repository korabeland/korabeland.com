// Case study — classic structure + field log entries

const CaseChrome = () => (
  <header className="chrome">
    <div className="mark">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1"/>
        <path d="M9 1 L11 9 L9 17 L7 9 Z" fill="currentColor" opacity="0.9"/>
      </svg>
      <span>korab eland</span>
    </div>
    <nav>
      <a>trailhead</a>
      <a>field notes</a>
      <a className="active">projects</a>
      <a>colophon</a>
    </nav>
    <div className="weather">
      <span className="dot"></span>
      <span>clear · shipped</span>
    </div>
  </header>
);

const CasePage = () => (
  <div className="frame" data-page="case">
    <CaseChrome/>

    <div style={{padding:'var(--s-5) var(--s-8) 0'}}>
      <a className="t-mono" style={{color:'var(--ink-mute)'}}>← all projects</a>
    </div>

    {/* HERO */}
    <section style={{padding:'var(--s-7) var(--s-8) var(--s-6)', maxWidth:1280, margin:'0 auto'}}>
      <div style={{display:'flex', gap:'var(--s-3)', marginBottom:'var(--s-4)'}}>
        <span className="tag">case study</span>
        <span className="tag" style={{borderColor:'var(--moss)', color:'var(--moss)'}}>shipped</span>
        <span className="t-mono" style={{marginLeft:'auto'}}>2025 — 2026 · 8 months</span>
      </div>

      <h1 className="t-display" style={{fontSize:88, lineHeight:0.95, margin:'0 0 var(--s-5)', fontWeight:400}}>
        Heron
      </h1>
      <p className="t-serif" style={{fontSize:24, color:'var(--ink-soft)', margin:'0 0 var(--s-7)',
           maxWidth:760, lineHeight:1.35}}>
        A self-serve analytics surface for operations teams at a fintech —
        turning a 40-person data bottleneck into something any PM could wade
        into without asking permission.
      </p>

      {/* Hero image */}
      <div className="fig" style={{height:460, marginBottom:'var(--s-4)'}}>
        plate iii · product hero
      </div>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <span className="t-mono">fig. 01 — the query surface, post-ship</span>
        <span className="t-mono">photo · in situ, march '26</span>
      </div>
    </section>

    {/* Fact strip */}
    <section style={{padding:'var(--s-6) var(--s-8)', borderTop:'1px solid var(--rule)',
                    borderBottom:'1px solid var(--rule)', background:'var(--paper-2)'}}>
      <div style={{maxWidth:1280, margin:'0 auto', display:'grid',
           gridTemplateColumns:'repeat(4, 1fr)', gap:'var(--s-6)'}}>
        {[
          ['role','design + eng lead'],
          ['team','3 (me, 1 pm, 1 eng)'],
          ['stack','astro · duckdb · react'],
          ['outcome','−72% tickets to data'],
        ].map(([k,v],i)=>(
          <div key={i}>
            <div className="t-label" style={{marginBottom:4}}>{k}</div>
            <div className="t-serif" style={{fontSize:18}}>{v}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Body — overview / problem / approach */}
    <section style={{padding:'var(--s-8)', maxWidth:1280, margin:'0 auto',
                     display:'grid', gridTemplateColumns:'240px 1fr', gap:'var(--s-8)'}}>
      <aside style={{position:'sticky', top:100, alignSelf:'start'}}>
        <div style={{marginBottom:'var(--s-5)'}}>
          <MiniMap active="projects" title="↳ you are here"/>
        </div>
        <div className="t-label" style={{marginBottom:'var(--s-4)'}}>sections</div>
        <ol style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10}}>
          {['Overview','The problem','Approach','Field log','Outcome','Reflection'].map((t,i)=>(
            <li key={i} style={{display:'flex', gap:10, fontSize:13, color:'var(--ink-soft)'}}>
              <span className="t-mono">§{String(i+1).padStart(2,'0')}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </aside>

      <div style={{maxWidth:780}}>
        <h2 className="t-display" style={{fontSize:32, margin:'0 0 var(--s-4)', fontWeight:400}}>
          Overview
        </h2>
        <p style={{fontSize:17, lineHeight:1.7, color:'var(--ink-soft)', margin:'0 0 var(--s-5)'}}>
          Heron grew out of a simple observation: the company's data team was
          running a help desk. A quarter of their week was spent pulling the
          same twelve queries for people who already knew what they wanted —
          they just didn't have a way to ask for it.
        </p>
        <p style={{fontSize:17, lineHeight:1.7, color:'var(--ink-soft)', margin:'0 0 var(--s-7)'}}>
          We built a surface where non-engineers could compose queries using
          a small grammar of verbs (<em>count</em>, <em>group</em>, <em>compare</em>),
          preview results inline, and — crucially — see the SQL we generated,
          because the goal was never to hide the machinery.
        </p>

        <h2 className="t-display" style={{fontSize:32, margin:'var(--s-7) 0 var(--s-4)', fontWeight:400}}>
          The problem
        </h2>
        <p style={{fontSize:17, lineHeight:1.7, color:'var(--ink-soft)', margin:'0 0 var(--s-5)'}}>
          Most "self-serve analytics" tools solve the wrong half of the
          problem. They make it easier to <em>see</em> dashboards that already
          exist. They do not make it easier to <em>ask a new question</em>.
          Heron is a question-asking tool.
        </p>

        <div className="pullquote">
          The goal was never to hide the machinery. It was to make the
          machinery teachable.
        </div>

        <h2 className="t-display" style={{fontSize:32, margin:'var(--s-7) 0 var(--s-4)', fontWeight:400}}>
          Approach
        </h2>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--s-5)',
             margin:'0 0 var(--s-6)'}}>
          <div className="fig" style={{height:200}}>fig. 02 — grammar sketch</div>
          <div className="fig" style={{height:200}}>fig. 03 — query preview</div>
        </div>
        <p style={{fontSize:17, lineHeight:1.7, color:'var(--ink-soft)', margin:'0 0 var(--s-7)'}}>
          Three moves: (1) a small, opinionated grammar of verbs; (2) a
          reveal-the-SQL panel that let any user <em>see</em> what they'd
          composed; (3) a save-and-share layer so that one good question
          became a template the next person could wade into.
        </p>

        {/* FIELD LOG */}
        <h2 className="t-display" style={{fontSize:32, margin:'var(--s-8) 0 var(--s-5)', fontWeight:400}}>
          Field log <span className="italic-serif" style={{color:'var(--ink-mute)', fontSize:22}}>— entries from the build</span>
        </h2>

        <div style={{display:'flex', flexDirection:'column', gap:'var(--s-6)'}}>
          {[
            ['wk 01','Found a help-desk queue, not a data team.',
              'First week on site. Shadowed three PMs asking for the same Monday-morning report. Confirmed the bottleneck is asking, not seeing.'],
            ['wk 03','The grammar survives first contact.',
              'Tested five verbs with non-engineers on paper. count/group/compare/filter/trend. Dropped "project"; nobody used it. Added "over", which everybody wanted.'],
            ['wk 07','Show the SQL.',
              'Big internal debate: do we show the generated SQL? Shipped it visible. Two weeks later three PMs had learned enough SQL to write their own.'],
            ['wk 12','Tickets down 61% (so far).',
              'First clean month of data. Adoption climbed slowly, then inflected when the templates started being shared peer-to-peer.'],
          ].map(([wk,title,body],i)=>(
            <div key={i} style={{display:'grid', gridTemplateColumns:'80px 1fr', gap:'var(--s-5)',
                 paddingBottom:'var(--s-5)', borderBottom:'1px solid var(--rule)'}}>
              <div className="t-mono" style={{color:'var(--moss)'}}>{wk}</div>
              <div>
                <div className="t-serif" style={{fontSize:20, marginBottom:4, fontStyle:'italic', fontWeight:300}}>
                  {title}
                </div>
                <div style={{fontSize:15, color:'var(--ink-soft)', lineHeight:1.6}}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="t-display" style={{fontSize:32, margin:'var(--s-8) 0 var(--s-4)', fontWeight:400}}>
          Outcome
        </h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'var(--s-5)',
             margin:'0 0 var(--s-6)'}}>
          {[
            ['−72%','tickets to the data team'],
            ['4.3×','weekly query volume'],
            ['14','templates shared peer-to-peer'],
          ].map(([v,l],i)=>(
            <div key={i} style={{padding:'var(--s-5)', border:'1px solid var(--rule)'}}>
              <div className="t-display" style={{fontSize:44, color:'var(--moss)', marginBottom:4}}>{v}</div>
              <div className="t-mono">{l}</div>
            </div>
          ))}
        </div>

        <h2 className="t-display" style={{fontSize:32, margin:'var(--s-7) 0 var(--s-4)', fontWeight:400}}>
          Reflection
        </h2>
        <p style={{fontSize:17, lineHeight:1.7, color:'var(--ink-soft)', margin:'0 0 var(--s-7)'}}>
          If I were starting again I'd cut a month from the discovery phase
          and a month from polish, and spend it watching people share
          templates. The peer-to-peer behaviour is the real product; we just
          happened to build the soil for it.
        </p>

        <div className="rule-soft" style={{margin:'var(--s-7) 0 var(--s-5)'}}/>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
          <div className="t-mono">next project ↝</div>
          <div className="t-serif italic-serif" style={{fontSize:22}}>Lichen · a book on systems literacy</div>
        </div>
      </div>
    </section>
  </div>
);

window.CasePage = CasePage;
