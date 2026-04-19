// Blog post page — wide measure + margin notes (reading room)

const BlogChrome = () => (
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
      <a className="active">field notes</a>
      <a>projects</a>
      <a>colophon</a>
    </nav>
    <div className="weather">
      <span className="dot"></span>
      <span>overcast · reading</span>
    </div>
  </header>
);

const BlogPage = () => (
  <div className="frame" data-page="blog">
    <BlogChrome/>

    {/* Return path */}
    <div style={{padding:'var(--s-5) var(--s-8) 0'}}>
      <a className="t-mono" style={{color:'var(--ink-mute)'}}>← back to the grove</a>
    </div>

    {/* Article meta */}
    <article style={{display:'grid', gridTemplateColumns:'220px 1fr 260px', gap:'var(--s-7)',
                     padding:'var(--s-8) var(--s-8) var(--s-9)', maxWidth:1320, margin:'0 auto'}}>

      {/* LEFT rail — persistent meta */}
      <aside style={{position:'sticky', top:100, alignSelf:'start'}}>
        <div style={{marginBottom:'var(--s-5)'}}>
          <MiniMap active="notes" title="↳ you are here"/>
        </div>
        <div className="t-mono" style={{marginBottom:'var(--s-5)'}}>
          field note nº 042<br/>
          <span style={{color:'var(--ink)'}}>04.12.26</span>
        </div>
        <div style={{marginBottom:'var(--s-5)'}}>
          <div className="t-label" style={{marginBottom:6}}>reading depth</div>
          <div style={{display:'flex', gap:3}}>
            {[1,1,1,1,0,0].map((f,i)=>(
              <div key={i} style={{height:14, width:8, background: f ? 'var(--ink)' : 'var(--rule)'}}/>
            ))}
          </div>
          <div className="t-mono" style={{marginTop:6}}>12 min · 2,340 words</div>
        </div>
        <div style={{marginBottom:'var(--s-5)'}}>
          <div className="t-label" style={{marginBottom:6}}>filed under</div>
          <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
            <span className="tag">systems</span>
            <span className="tag">forests</span>
            <span className="tag">ai</span>
          </div>
        </div>
        <div>
          <div className="t-label" style={{marginBottom:8}}>contents</div>
          <ol style={{listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:6}}>
            {['The mycelial view','A small wager','On giving tools','Clearings, not cathedrals'].map((t,i)=>(
              <li key={i} style={{fontSize:12.5, color:'var(--ink-soft)', display:'flex', gap:8}}>
                <span className="t-mono" style={{color:'var(--ink-mute)'}}>§{String(i+1).padStart(2,'0')}</span>
                <span style={{color: i===1 ? 'var(--ink)' : 'var(--ink-soft)'}}>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </aside>

      {/* CENTER — reading column */}
      <div style={{maxWidth:620}}>
        <div className="t-label" style={{color:'var(--moss)', marginBottom:'var(--s-4)'}}>§ field notes</div>
        <h1 className="t-display" style={{fontSize:56, margin:'0 0 var(--s-5)', fontWeight:400}}>
          Forests <span className="italic-serif" style={{fontWeight:300}}>that scale.</span>
        </h1>
        <p className="t-serif" style={{fontSize:19, color:'var(--ink-soft)', margin:'0 0 var(--s-7)'}}>
          A field note on mycelial networks, interface design, and why the
          healthiest systems are the ones that share nutrients in the dark.
        </p>

        <div className="rule-soft" style={{margin:'var(--s-6) 0 var(--s-7)'}}/>

        <p style={{fontSize:17, lineHeight:1.7, margin:'0 0 var(--s-5)'}}>
          <span className="t-display" style={{fontSize:52, float:'left', lineHeight:0.9,
                 paddingRight:10, paddingTop:6, color:'var(--moss)'}}>T</span>
          he first thing you notice about an old forest is how little of it is
          actually visible. A canopy, yes — but most of the weight of the
          thing lives underground, in the <em>mycelial net</em><span className="fn">¹</span>,
          a wet embroidery of fungal threads stitching root to root, sharing
          sugars between the oak that has light and the spruce that has none.
          This is the part I keep circling back to.
        </p>
        <p style={{fontSize:17, lineHeight:1.7, margin:'0 0 var(--s-5)'}}>
          For the last six years I've been building tools for people who don't
          think of themselves as builders. What I keep finding is that the
          best interfaces work like mycelium<span className="fn">²</span> — they
          don't announce themselves, they don't compete for attention, but
          they redistribute capacity. They take what a user already knows and
          pass it quietly to the place it's needed.
        </p>

        <div className="pullquote">
          The healthiest systems share in the dark, where no one is watching
          for credit.
        </div>

        <h2 className="t-display" style={{fontSize:32, margin:'var(--s-8) 0 var(--s-4)', fontWeight:400}}>
          A small wager
        </h2>
        <p style={{fontSize:17, lineHeight:1.7, margin:'0 0 var(--s-5)'}}>
          Here's the bet I keep placing: that a good interface is not a
          display. It's a permission structure. It tells the user — through
          tiny, repeated invitations — <em>you already have what you need</em>.
          Most software does the opposite. It says, <em>we have what you need,
          and you are the petitioner.</em>
        </p>

        {/* inline figure */}
        <figure style={{margin:'var(--s-7) 0'}}>
          <div className="fig" style={{height:240}}>plate ii · fig. A — root diagram</div>
          <figcaption className="t-mono" style={{marginTop:'var(--s-2)'}}>
            fig. A — two species, one network. after simard (1997).
          </figcaption>
        </figure>

        <p style={{fontSize:17, lineHeight:1.7, margin:'0 0 var(--s-5)'}}>
          I think this is why tools that <em>teach</em><span className="fn">³</span> tend
          to outlive tools that <em>perform</em>. The performing tool is
          impressive; the teaching tool is adopted. The performing tool must
          be present to be useful; the teaching tool leaves something behind
          when it's gone — a little extra capacity in the person who used it.
        </p>
        <p style={{fontSize:17, lineHeight:1.7, margin:'0 0 var(--s-5)'}}>
          This is all I've ever wanted to build. A forest, not a statue.
        </p>

        <div className="rule-soft" style={{margin:'var(--s-8) 0 var(--s-6)'}}/>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
          <div className="t-mono">next ↝</div>
          <div className="t-serif italic-serif" style={{fontSize:20}}>On borrowed maps</div>
        </div>
      </div>

      {/* RIGHT rail — margin notes & footnotes */}
      <aside style={{paddingTop:140}}>
        <div className="mnote" style={{marginBottom:'var(--s-7)', paddingLeft:'var(--s-3)',
             borderLeft:'1px solid var(--moss-soft)'}}>
          <sup>1</sup>Suzanne Simard's 1997 Nature paper is the canonical
          reference — though Indigenous forestry traditions describe this far
          earlier and with more grace.
        </div>
        <div className="mnote" style={{marginBottom:'var(--s-7)', paddingLeft:'var(--s-3)',
             borderLeft:'1px solid var(--moss-soft)'}}>
          <sup>2</sup>Compare: the difference between a command line that
          gatekeeps, and one that autocompletes. One performs; the other
          teaches.
        </div>
        <div className="mnote" style={{marginBottom:'var(--s-7)', paddingLeft:'var(--s-3)',
             borderLeft:'1px solid var(--moss-soft)'}}>
          <sup>3</sup>I mean this literally. The best tool I've shipped
          measurably raised the non-technical users' ability to read schemas.
          That's the win.
        </div>

        <KnowledgeGraph/>
      </aside>
    </article>
  </div>
);

window.BlogPage = BlogPage;
