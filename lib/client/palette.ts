export const SEQUENTIAL_RAMP_LIGHT = [
  "#cde2fb",
  "#b7d3f6",
  "#9ec5f4",
  "#86b6ef",
  "#6da7ec",
  "#5598e7",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
  "#104281",
  "#0d366b",
];

export function masteryToSequentialColor(masteryProb: number): string {
  const clamped = Math.min(1, Math.max(0, masteryProb));
  const index = Math.round(clamped * (SEQUENTIAL_RAMP_LIGHT.length - 1));
  return SEQUENTIAL_RAMP_LIGHT[index];
}

export const CATEGORICAL_PALETTE: { light: string; dark: string }[] = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#008300", dark: "#008300" },
  { light: "#e87ba4", dark: "#d55181" },
  { light: "#eda100", dark: "#c98500" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#4a3aa7", dark: "#9085e9" },
  { light: "#e34948", dark: "#e66767" },
];

export function getCategoricalColor(index: number): { light: string; dark: string } {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length];
}
