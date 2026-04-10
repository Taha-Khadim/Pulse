export const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360;

export const circularDiffDeg = (a: number, b: number) => {
  const d = Math.abs(normalizeDeg(a) - normalizeDeg(b));
  return Math.min(d, 360 - d);
};

export const checkAngularCollision = (
  newAngleDeg: number,
  existingAnglesDeg: number[],
  thresholdDeg: number
) => {
  const normalized = normalizeDeg(newAngleDeg);
  return existingAnglesDeg.some((arrow) => circularDiffDeg(normalized, arrow) < thresholdDeg);
};
