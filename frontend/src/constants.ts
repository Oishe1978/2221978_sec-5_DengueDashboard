export const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Barishal",
  "Sylhet",
  "Rajshahi",
  "Rangpur",
  "Khulna",
  "Mymensingh",
] as const;

export type Division = (typeof DIVISIONS)[number];
