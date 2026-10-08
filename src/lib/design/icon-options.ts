/**
 * The icon names an editor may attach to a feature, without the icons
 * themselves — so the section registry (also used by scripts) stays free of
 * React. The renderer maps each name to its icon in icons.tsx.
 */
export const FEATURE_ICON_OPTIONS = [
  { value: "auto", label: "Number (01, 02…)" },
  { value: "portfolio", label: "Equipment portfolio" },
  { value: "delivery", label: "Delivery / supply" },
  { value: "procurement", label: "Procurement" },
  { value: "installation", label: "Installation" },
  { value: "documents", label: "Documentation" },
  { value: "support", label: "Support" },
  { value: "coverage", label: "Coverage / locations" },
  { value: "assurance", label: "Assurance" },
  { value: "training", label: "Training" },
  { value: "consultation", label: "Consultation" },
  { value: "facility", label: "Facility / hospital" },
  { value: "clinical", label: "Clinical" },
  { value: "configuration", label: "Configuration" },
  { value: "quality", label: "Quality check" },
  { value: "performance", label: "Performance" },
] as const;
