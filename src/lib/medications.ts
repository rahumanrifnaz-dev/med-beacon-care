// Elder-friendly medication catalog: common name + brand + color + shape
export interface MedCatalogEntry {
  common: string;          // big friendly name elders recognize
  brand: string;           // small medical/brand name
  color: string;           // visual pill color (CSS hex)
  colorLabel: string;      // spoken color label
  shape: "round" | "oval" | "capsule" | "triangle";
  category: string;
}

export const MED_CATALOG: MedCatalogEntry[] = [
  { common: "Heart pill", brand: "Lisinopril 10mg", color: "#a78bfa", colorLabel: "Purple", shape: "round", category: "Blood pressure" },
  { common: "Cholesterol pill", brand: "Atorvastatin 20mg", color: "#f59e0b", colorLabel: "Yellow", shape: "oval", category: "Cholesterol" },
  { common: "Sugar pill", brand: "Metformin 500mg", color: "#ffffff", colorLabel: "White", shape: "round", category: "Diabetes" },
  { common: "Sunshine vitamin", brand: "Vitamin D3 1000IU", color: "#fde047", colorLabel: "Gold", shape: "capsule", category: "Vitamin" },
  { common: "Pain reliever", brand: "Paracetamol 500mg", color: "#ffffff", colorLabel: "White", shape: "round", category: "Pain" },
  { common: "Blood thinner", brand: "Aspirin 75mg", color: "#fb7185", colorLabel: "Pink", shape: "round", category: "Heart" },
  { common: "Stomach pill", brand: "Omeprazole 20mg", color: "#8b5cf6", colorLabel: "Violet", shape: "capsule", category: "Stomach" },
  { common: "Thyroid pill", brand: "Levothyroxine 50mcg", color: "#22d3ee", colorLabel: "Cyan", shape: "round", category: "Thyroid" },
  { common: "Antibiotic", brand: "Amoxicillin 500mg", color: "#f97316", colorLabel: "Orange", shape: "capsule", category: "Infection" },
  { common: "Sleep aid", brand: "Melatonin 3mg", color: "#6366f1", colorLabel: "Indigo", shape: "round", category: "Sleep" },
];

export const PILL_COLORS = [
  { value: "#a78bfa", label: "Purple" },
  { value: "#f59e0b", label: "Yellow" },
  { value: "#ffffff", label: "White" },
  { value: "#fb7185", label: "Pink" },
  { value: "#22d3ee", label: "Cyan" },
  { value: "#22c55e", label: "Green" },
  { value: "#f97316", label: "Orange" },
  { value: "#6366f1", label: "Indigo" },
];
