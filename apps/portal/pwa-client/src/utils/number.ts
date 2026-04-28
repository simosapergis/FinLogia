export const roundAmount = (value: number | null | undefined): number | null => {
  if (value == null || isNaN(value)) return null;
  // Use Math.round with epsilon to handle floating point precision issues
  // e.g. 2.545 * 100 = 254.49999999999997, which rounds to 254 instead of 255
  // Adding Number.EPSILON fixes this before rounding
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  // Preserve -0 if the original value was -0
  if (rounded === 0 && Object.is(value, -0)) return -0;
  return rounded;
};
