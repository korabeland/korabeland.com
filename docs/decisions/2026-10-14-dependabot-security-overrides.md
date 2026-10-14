# Dependabot security overrides (2026-10-14)

Each pnpm override in `package.json` below clears a Dependabot alert. The parent package pins the vulnerable version and has no newer release that fixes it, so the override forces the patched version.

| Override | Alert fixed | Why the parent cannot fix it |
| --- | --- | --- |
| `@vercel/routing-utils>path-to-regexp` 6.3.0 | path-to-regexp < 6.3.0 (high) | `@vercel/routing-utils` 6.6.0 (latest) pins 6.1.0 exactly. |
| `@shuding/opentype.js>fflate` 0.7.5 | fflate < 0.7.5 (medium) | Pinned to 0.7.4 by the opentype.js fork that satori uses. |
| `esbuild@^0.27` 0.28.1 | esbuild < 0.28.1 (low) | vite, tsx and storybook still resolve 0.27.x. |
| `proxy-addr@^2`, `compression@^1`, `qs@^6`, `uuid@^8`, `ws@^7`, `tmp@<0.2.6`, `js-yaml@^3`, `ip-address@^10` | matching dev-only alerts | All come in through `@lhci/cli` 0.15.1 (latest), which pins old versions. |

Still open: http-cache-semantics (covered by the audit exception in CI), sprintf-js and extract-zip (no patched release exists).
