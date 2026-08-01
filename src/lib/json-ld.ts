/**
 * Serialize JSON-LD for an inline script safely.
 *
 * JSON.stringify escapes JSON syntax but does not escape HTML-sensitive
 * characters. Replacing them keeps content-backed values from closing the
 * surrounding <script> element while preserving valid JSON for JSON.parse.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) {
    throw new TypeError("JSON-LD value must be serializable");
  }
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
