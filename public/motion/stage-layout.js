// Keep the 1600 x 900 composition entirely inside the visible viewport.
// Position is calculated after scaling, without relying on Grid's static position
// for an absolutely positioned element (which can differ across browser engines).
export function calculateStageLayout(width, height, offsetLeft = 0, offsetTop = 0) {
 if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
 const scale = Math.min(width / 1600, height / 900);
 return {
  scale,
  left: offsetLeft + (width - 1600 * scale) / 2,
  top: offsetTop + (height - 900 * scale) / 2,
 };
}
