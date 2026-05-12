export const medications = [
  { id: "1", name: "Atorvastatin", dose: "20mg", time: "08:00", taken: true, color: "chart-1" },
  { id: "2", name: "Metformin", dose: "500mg", time: "13:00", taken: true, color: "chart-2" },
  { id: "3", name: "Lisinopril", dose: "10mg", time: "19:00", taken: false, color: "chart-3" },
  { id: "4", name: "Vitamin D3", dose: "1000IU", time: "21:00", taken: false, color: "chart-4" },
];

export const adherenceWeek = [
  { day: "Mon", taken: 4, missed: 0 },
  { day: "Tue", taken: 3, missed: 1 },
  { day: "Wed", taken: 4, missed: 0 },
  { day: "Thu", taken: 4, missed: 0 },
  { day: "Fri", taken: 3, missed: 1 },
  { day: "Sat", taken: 4, missed: 0 },
  { day: "Sun", taken: 2, missed: 2 },
];

export const adherenceMonth = Array.from({ length: 30 }).map((_, i) => ({
  day: i + 1,
  adherence: 70 + Math.round(Math.sin(i / 3) * 15 + Math.random() * 10),
}));

export const patients = [
  { id: "p1", name: "Sarah Johnson", age: 64, condition: "Hypertension", adherence: 92, status: "stable" },
  { id: "p2", name: "Marcus Chen", age: 52, condition: "Type 2 Diabetes", adherence: 78, status: "watch" },
  { id: "p3", name: "Elena Rodriguez", age: 71, condition: "Cardiac", adherence: 65, status: "alert" },
  { id: "p4", name: "James O'Connor", age: 45, condition: "Cholesterol", adherence: 98, status: "stable" },
  { id: "p5", name: "Priya Patel", age: 38, condition: "Thyroid", adherence: 88, status: "stable" },
];

export const prescriptions = [
  { id: "rx-2049", patient: "Sarah Johnson", drug: "Lisinopril 10mg", status: "pending", date: "Today" },
  { id: "rx-2048", patient: "Marcus Chen", drug: "Metformin 500mg", status: "verified", date: "Today" },
  { id: "rx-2047", patient: "Elena Rodriguez", drug: "Atorvastatin 40mg", status: "ready", date: "Yesterday" },
  { id: "rx-2046", patient: "James O'Connor", drug: "Rosuvastatin 20mg", status: "dispensed", date: "Yesterday" },
];

export const inventory = [
  { name: "Atorvastatin 20mg", stock: 482, threshold: 100, status: "good" },
  { name: "Metformin 500mg", stock: 124, threshold: 200, status: "low" },
  { name: "Lisinopril 10mg", stock: 38, threshold: 100, status: "critical" },
  { name: "Vitamin D3 1000IU", stock: 956, threshold: 150, status: "good" },
  { name: "Amoxicillin 500mg", stock: 210, threshold: 100, status: "good" },
];