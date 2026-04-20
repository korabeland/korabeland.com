import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  depth: number;
  r: number;
  kind?: "self";
}
export type GraphEdge = [string, string];

const DEFAULT_NODES: GraphNode[] = [
  {
    id: "current",
    label: "this note",
    x: 0.5,
    y: 0.5,
    depth: 0.0,
    r: 8,
    kind: "self",
  },
  { id: "maps", label: "borrowed maps", x: 0.72, y: 0.26, depth: 0.3, r: 5 },
  { id: "afford", label: "affordances", x: 0.78, y: 0.54, depth: 0.6, r: 6 },
  { id: "clearings", label: "clearings", x: 0.68, y: 0.78, depth: 0.2, r: 5 },
  {
    id: "teach",
    label: "teach, don't perform",
    x: 0.92,
    y: 0.38,
    depth: 0.8,
    r: 7,
  },
  { id: "myco", label: "mycorrhiza", x: 0.88, y: 0.68, depth: 0.5, r: 6 },
  { id: "simard", label: "simard, 1997", x: 0.22, y: 0.28, depth: 0.15, r: 4 },
  {
    id: "literacy",
    label: "systems literacy",
    x: 0.26,
    y: 0.74,
    depth: 0.65,
    r: 5,
  },
  {
    id: "permission",
    label: "permission structures",
    x: 0.08,
    y: 0.52,
    depth: 0.4,
    r: 5,
  },
];

const DEFAULT_EDGES: GraphEdge[] = [
  ["current", "maps"],
  ["current", "afford"],
  ["current", "clearings"],
  ["current", "simard"],
  ["current", "literacy"],
  ["current", "permission"],
  ["afford", "teach"],
  ["afford", "myco"],
  ["maps", "teach"],
  ["clearings", "myco"],
  ["simard", "myco"],
  ["permission", "afford"],
  ["literacy", "permission"],
];

interface Props {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function KnowledgeGraph({
  nodes = DEFAULT_NODES,
  edges = DEFAULT_EDGES,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const wrapRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const id = "kg-overlay-root";
    let root = document.getElementById(id);
    if (!root) {
      root = document.createElement("div");
      root.id = id;
      document.body.appendChild(root);
    }
    setPortalTarget(root);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const reducedMotion = useMemo(prefersReducedMotion, []);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setParallax({ x: nx, y: ny });
    });
  };
  const onLeave = () => {
    setParallax({ x: 0, y: 0 });
    setHover(null);
  };

  const hoveredNeighbors = useMemo(() => {
    if (!hover) return null;
    return new Set(edges.filter(([a, b]) => a === hover || b === hover).flat());
  }, [hover, edges]);

  function project(n: GraphNode, w: number, h: number, drift: number) {
    const px = n.x * w + parallax.x * drift * n.depth;
    const py = n.y * h + parallax.y * drift * n.depth;
    return { px, py };
  }

  function renderGraph(w: number, h: number, scale: 1 | 1.5) {
    const drift = scale === 1 ? 18 : 28;
    const pts = Object.fromEntries(
      nodes.map((n) => [n.id, { ...n, ...project(n, w, h, drift) }]),
    );
    const ordered = [...nodes].sort((a, b) => a.depth - b.depth);

    return (
      <>
        <svg
          width={w}
          height={h}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          <defs>
            <radialGradient
              id={`kg-ground-${scale}`}
              cx="0.5"
              cy="0.5"
              r="0.55"
            >
              <stop
                offset="0"
                stopColor="var(--moss)"
                stopOpacity={scale === 1 ? "0.10" : "0.12"}
              />
              <stop offset="1" stopColor="var(--moss)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill={`url(#kg-ground-${scale})`} />
          {(scale === 1
            ? [0.18, 0.3, 0.42, 0.54]
            : [0.16, 0.26, 0.36, 0.46, 0.56]
          ).map((f, i) => (
            <ellipse
              key={`ring-${f}`}
              data-idx={i}
              cx={w / 2 + parallax.x * (scale === 1 ? 8 : 14)}
              cy={h / 2 + parallax.y * (scale === 1 ? 8 : 14)}
              rx={w * f}
              ry={h * f * (scale === 1 ? 0.85 : 0.82)}
              fill="none"
              stroke="var(--moss-soft)"
              strokeWidth={scale === 1 ? 0.5 : 0.6}
              opacity={(scale === 1 ? 0.35 : 0.4) - i * 0.06}
            />
          ))}
          {scale === 1.5 && (
            <>
              <line
                x1="0"
                y1={h / 2}
                x2={w}
                y2={h / 2}
                stroke="var(--rule)"
                strokeWidth="0.5"
                opacity="0.5"
              />
              <line
                x1={w / 2}
                y1="0"
                x2={w / 2}
                y2={h}
                stroke="var(--rule)"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </>
          )}
        </svg>

        <svg
          width={w}
          height={h}
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {edges.map(([a, b]) => {
            const A = pts[a];
            const B = pts[b];
            if (!A || !B) return null;
            const active = hover !== null && (hover === a || hover === b);
            const faded = hover !== null && !active;
            return (
              <line
                key={`edge-${a}-${b}`}
                x1={A.px}
                y1={A.py}
                x2={B.px}
                y2={B.py}
                stroke={active ? "var(--moss)" : "var(--ink-soft)"}
                strokeWidth={
                  active ? (scale === 1 ? 1.2 : 1.4) : scale === 1 ? 0.7 : 0.8
                }
                strokeDasharray={active ? "0" : scale === 1 ? "2 4" : "3 5"}
                opacity={
                  faded
                    ? scale === 1
                      ? 0.12
                      : 0.08
                    : active
                      ? 0.95
                      : scale === 1
                        ? 0.55
                        : 0.45
                }
                style={{ transition: "opacity .2s ease, stroke .2s ease" }}
              />
            );
          })}
        </svg>

        {ordered.map((n) => {
          const p = pts[n.id];
          if (!p) return null;
          const isSelf = n.kind === "self";
          const isHover = hover === n.id;
          const isNeighbor = hoveredNeighbors?.has(n.id) && !isHover;
          const faded = hover !== null && !isHover && !isNeighbor;
          const r = n.r * scale;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: node hover is a decorative highlight; the graph's semantic structure lives in the KG-overlay dialog where tabbable elements exist.
            <div
              key={n.id}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              style={{
                position: "absolute",
                left: p.px,
                top: p.py,
                transform: "translate(-50%, -50%)",
                opacity: faded ? (scale === 1 ? 0.3 : 0.25) : 1,
                transition: "opacity .2s ease",
                cursor: "pointer",
                zIndex: isSelf ? 5 : isHover ? 4 : 2,
              }}
            >
              <div
                style={{
                  width: r * 2,
                  height: r * 2,
                  borderRadius: "50%",
                  background: isSelf
                    ? "var(--moss)"
                    : isHover
                      ? "var(--ink)"
                      : "var(--paper)",
                  border: `${scale === 1 ? 1 : 1.5}px solid ${
                    isSelf || isHover ? "var(--ink)" : "var(--ink-soft)"
                  }`,
                  boxShadow: isSelf
                    ? scale === 1
                      ? "0 0 0 5px color-mix(in oklch, var(--moss) 20%, transparent)"
                      : "0 0 0 8px color-mix(in oklch, var(--moss) 18%, transparent)"
                    : isHover
                      ? scale === 1
                        ? "0 2px 10px rgba(0,0,0,0.18)"
                        : "0 4px 16px rgba(0,0,0,0.2)"
                      : "none",
                  transition: "all .18s ease",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: r + (scale === 1 ? 8 : 10),
                  top: "50%",
                  transform: "translateY(-50%)",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontWeight: isSelf ? 500 : 400,
                  fontSize: scale === 1 ? (isSelf ? 13 : 11) : isSelf ? 22 : 15,
                  color: isSelf || isHover ? "var(--ink)" : "var(--ink-soft)",
                  letterSpacing: "-0.01em",
                  pointerEvents: "none",
                }}
              >
                {n.label}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  const collapsed = (
    <div className="kg-collapsed">
      <div className="kg-collapsed-head">
        <span className="t-label">↳ connects to</span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="kg-expand-btn"
        >
          expand ↗
        </button>
      </div>
      <button
        type="button"
        ref={(el) => {
          if (!expanded) wrapRef.current = el;
        }}
        onMouseMove={!expanded ? onMove : undefined}
        onMouseLeave={!expanded ? onLeave : undefined}
        onClick={() => setExpanded(true)}
        aria-label="Expand knowledge graph"
        className="kg-collapsed-stage"
      >
        {!expanded && renderGraph(260, 200, 1)}
      </button>
      <div className="kg-collapsed-foot t-mono">
        {nodes.length} nodes · {edges.length} edges · click to explore
      </div>
    </div>
  );

  const overlay =
    expanded && portalTarget
      ? createPortal(
          // biome-ignore lint/a11y/useSemanticElements: native <dialog> can't easily click-through-to-close without extra wiring; role=dialog + aria-modal + Escape handler provides equivalent semantics.
          <div
            className="kg-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setExpanded(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setExpanded(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Knowledge graph"
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: parallax tracking is decorative; keyboard users interact via the labelled button and Escape on the outer dialog. */}
            <div
              ref={(el) => {
                if (expanded) wrapRef.current = el;
              }}
              onMouseMove={onMove}
              onMouseLeave={onLeave}
              className="kg-overlay-card"
            >
              <div className="kg-overlay-chrome">
                <div>
                  <div className="t-label" style={{ color: "var(--moss)" }}>
                    ↳ trail map of ideas
                  </div>
                  <div className="kg-overlay-title italic-serif">
                    how this note connects
                  </div>
                </div>
                <div className="kg-overlay-chrome-right">
                  <div className="t-mono kg-overlay-hint">
                    {hover
                      ? `→ ${nodes.find((n) => n.id === hover)?.label ?? ""}`
                      : "hover a node · move cursor to parallax"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="kg-close-btn t-mono"
                  >
                    close · esc
                  </button>
                </div>
              </div>

              <div className="kg-overlay-stage">
                <GraphStage
                  nodes={nodes}
                  edges={edges}
                  hover={hover}
                  setHover={setHover}
                  parallax={parallax}
                  hoveredNeighbors={hoveredNeighbors}
                />
              </div>

              <div className="kg-overlay-legend">
                <span>
                  {nodes.length} nodes · {edges.length} edges · press esc to
                  close
                </span>
                <span>
                  <span className="legend-dot legend-dot--self" />
                  current note
                  <span className="legend-dot legend-dot--other" />
                  related
                </span>
              </div>
            </div>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <div>
      {collapsed}
      {overlay}
    </div>
  );
}

interface StageProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hover: string | null;
  setHover: (id: string | null) => void;
  parallax: { x: number; y: number };
  hoveredNeighbors: Set<string> | null;
}

function GraphStage({
  nodes,
  edges,
  hover,
  setHover,
  parallax,
  hoveredNeighbors,
}: StageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1100, h: 560 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const drift = 28;
  const pts = Object.fromEntries(
    nodes.map((n) => [
      n.id,
      {
        ...n,
        px: n.x * w + parallax.x * drift * n.depth,
        py: n.y * h + parallax.y * drift * n.depth,
      },
    ]),
  );
  const ordered = [...nodes].sort((a, b) => a.depth - b.depth);

  return (
    <div ref={stageRef} style={{ position: "absolute", inset: 0 }}>
      <svg
        width={w}
        height={h}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="kg-ground-stage" cx="0.5" cy="0.5" r="0.55">
            <stop offset="0" stopColor="var(--moss)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--moss)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={w} height={h} fill="url(#kg-ground-stage)" />
        {[0.16, 0.26, 0.36, 0.46, 0.56].map((f, i) => (
          <ellipse
            key={`stage-ring-${f}`}
            data-idx={i}
            cx={w / 2 + parallax.x * 14}
            cy={h / 2 + parallax.y * 14}
            rx={w * f}
            ry={h * f * 0.82}
            fill="none"
            stroke="var(--moss-soft)"
            strokeWidth="0.6"
            opacity={0.4 - i * 0.06}
          />
        ))}
        <line
          x1="0"
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke="var(--rule)"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <line
          x1={w / 2}
          y1="0"
          x2={w / 2}
          y2={h}
          stroke="var(--rule)"
          strokeWidth="0.5"
          opacity="0.5"
        />
      </svg>

      <svg
        width={w}
        height={h}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {edges.map(([a, b]) => {
          const A = pts[a];
          const B = pts[b];
          if (!A || !B) return null;
          const active = hover !== null && (hover === a || hover === b);
          const faded = hover !== null && !active;
          return (
            <line
              key={`stage-edge-${a}-${b}`}
              x1={A.px}
              y1={A.py}
              x2={B.px}
              y2={B.py}
              stroke={active ? "var(--moss)" : "var(--ink-soft)"}
              strokeWidth={active ? 1.4 : 0.8}
              strokeDasharray={active ? "0" : "3 5"}
              opacity={faded ? 0.08 : active ? 0.95 : 0.45}
              style={{ transition: "opacity .2s, stroke .2s" }}
            />
          );
        })}
      </svg>

      {ordered.map((n) => {
        const p = pts[n.id];
        if (!p) return null;
        const isSelf = n.kind === "self";
        const isHover = hover === n.id;
        const isNeighbor = hoveredNeighbors?.has(n.id) && !isHover;
        const faded = hover !== null && !isHover && !isNeighbor;
        const r = n.r * 1.5;
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: node hover is a decorative highlight inside a larger dialog that is keyboard-dismissable.
          <div
            key={n.id}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover(null)}
            style={{
              position: "absolute",
              left: p.px,
              top: p.py,
              transform: "translate(-50%, -50%)",
              opacity: faded ? 0.25 : 1,
              transition: "opacity .2s ease",
              cursor: "pointer",
              zIndex: isSelf ? 5 : isHover ? 4 : 2,
            }}
          >
            <div
              style={{
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                background: isSelf
                  ? "var(--moss)"
                  : isHover
                    ? "var(--ink)"
                    : "var(--paper)",
                border: `1.5px solid ${isSelf || isHover ? "var(--ink)" : "var(--ink-soft)"}`,
                boxShadow: isSelf
                  ? "0 0 0 8px color-mix(in oklch, var(--moss) 18%, transparent)"
                  : isHover
                    ? "0 4px 16px rgba(0,0,0,0.2)"
                    : "none",
                transition: "all .18s ease",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: r + 10,
                top: "50%",
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: isSelf ? 500 : 400,
                fontSize: isSelf ? 22 : 15,
                color: isSelf || isHover ? "var(--ink)" : "var(--ink-soft)",
                letterSpacing: "-0.01em",
                pointerEvents: "none",
              }}
            >
              {n.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
