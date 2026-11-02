// Convert student-authored scene notes into an ordered, bounded prompt plan.
// Pure text transformation: no uploads, persistence, network calls or credits.
export function parseK4KScenePlan(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(?:scene\s*)?\d+\s*[:.)-]\s*/i, '')
      .trim()
      .slice(0, 160))
    .filter(Boolean)
    .slice(0, 5)
    .map((line, index) => `Scene ${index + 1}: ${line}`);
}
