# Dependabot security overrides (2026-10-14)

The four overrides added for this alert batch are listed below. They address dependencies whose current parent ranges do not resolve to patched versions. Where an existing parent range allows a patched release, the lockfile selects that release without an override.

| Override | Alert fixed | Why the parent cannot fix it |
| --- | --- | --- |
| `@vercel/routing-utils>path-to-regexp` 6.3.0 | path-to-regexp < 6.3.0 (high) | `@vercel/routing-utils` 6.6.0 (latest) pins 6.1.0 exactly. |
| `storybook>esbuild` 0.28.1 | esbuild < 0.28.1 (low) | Storybook accepts esbuild through 0.27, while other consumers accept 0.28.1. tsx is upgraded to 4.23.15, which accepts esbuild ~0.28.0. |
| `tmp@<0.2.6`, `uuid@^8` | matching alerts | These parents do not currently select a patched compatible release. |

The patched `fflate`, `proxy-addr`, `compression`, `js-yaml` 3, `ip-address`, and `ws` 7 releases are selected through their existing parent ranges. Lighthouse CI's Express and body-parser dependencies resolve to patched releases through their declared ranges, which also allows patched `qs` without an override.

The October alert batch also tracked `sprintf-js` and `extract-zip` as having no patched release at that time.

## Audit exception (2026-11-17)

`GHSA-fc5q-39xc-vjpf` affects `picomatch` through `astro > unstorage > anymatch > picomatch`. As of 2026-11-17, the newest `picomatch` release is 4.0.7, and the advisory covers versions through 4.0.7, so no patched version is available.

This is a build-time dependency of the static site; visitor requests do not reach it. The production audit ignores only this GHSA through `pnpm.auditConfig.ignoreGhsas` in `package.json`. Remove the exception when `picomatch` ships a patched version. Other high-severity production advisories remain blocking.
