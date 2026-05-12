import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Droplet, HeartPulse, Apple, Moon, Activity, Smile, Shield, RefreshCw } from "lucide-react";

type Tip = { icon: any; category: string; title: string; body: string; accent: string };

const TIPS: Tip[] = [
  { icon: Droplet, category: "Hydration", title: "Drink 8 glasses of water", body: "Sip water through the day. It helps your kidneys, skin, and energy levels.", accent: "from-sky-400 to-cyan-500" },
  { icon: HeartPulse, category: "Heart health", title: "Walk 30 minutes daily", body: "A gentle walk lowers blood pressure and keeps your heart strong.", accent: "from-rose-400 to-red-500" },
  { icon: Apple, category: "Nutrition", title: "Half your plate = veggies", body: "Colorful vegetables give vitamins, fiber, and help control blood sugar.", accent: "from-emerald-400 to-green-500" },
  { icon: Moon, category: "Sleep", title: "Sleep 7–8 hours", body: "Good sleep helps your body heal and your mind stay sharp.", accent: "from-indigo-400 to-purple-500" },
  { icon: Activity, category: "Diabetes", title: "Check sugar before breakfast", body: "Morning readings give the clearest picture of your control.", accent: "from-amber-400 to-orange-500" },
  { icon: Shield, category: "Blood pressure", title: "Less salt, more potassium", body: "Bananas, spinach, and beans help balance sodium and lower pressure.", accent: "from-fuchsia-400 to-pink-500" },
  { icon: Smile, category: "Mental health", title: "Take 5 deep breaths", body: "Slow breathing calms the nervous system and reduces stress in minutes.", accent: "from-violet-400 to-purple-500" },
  { icon: Lightbulb, category: "Medication", title: "Take pills with a full glass of water", body: "It helps the medicine dissolve and protects your stomach.", accent: "from-yellow-400 to-amber-500" },
  { icon: HeartPulse, category: "Cholesterol", title: "Add oats to breakfast", body: "Oats contain fiber that helps lower bad cholesterol naturally.", accent: "from-teal-400 to-emerald-500" },
  { icon: Apple, category: "Bones", title: "Get morning sunlight", body: "10 minutes of sun gives vitamin D for strong bones.", accent: "from-orange-400 to-yellow-500" },
  { icon: Activity, category: "Joints", title: "Stretch when you wake up", body: "Gentle stretching keeps joints flexible and prevents stiffness.", accent: "from-cyan-400 to-blue-500" },
  { icon: Shield, category: "Immunity", title: "Wash hands for 20 seconds", body: "Simple, powerful protection from colds, flu, and infections.", accent: "from-lime-400 to-green-500" },
  { icon: Smile, category: "Wellbeing", title: "Call someone you love", body: "Social connection is medicine for your heart and your mood.", accent: "from-pink-400 to-rose-500" },
  { icon: Moon, category: "Evening", title: "No screens 30 min before bed", body: "Dim lights help your brain wind down for deeper sleep.", accent: "from-blue-400 to-indigo-500" },
];

function dayOfYear() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export function DailyHealthTip() {
  const startIdx = useMemo(() => dayOfYear() % TIPS.length, []);
  const [idx, setIdx] = useState(startIdx);
  const tip = TIPS[idx];
  const Icon = tip.icon;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-card/50 backdrop-blur p-5">
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br ${tip.accent} opacity-20 blur-2xl`} />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Tip of the day</span>
        </div>
        <button onClick={() => setIdx((i) => (i + 1) % TIPS.length)} title="Next tip"
          className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="w-3 h-3" /> Next
        </button>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
          className="flex items-start gap-4">
          <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${tip.accent} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary/80 font-semibold">{tip.category}</p>
            <p className="font-display font-bold text-lg leading-tight mt-0.5">{tip.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{tip.body}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-1 mt-4">
        {TIPS.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`Tip ${i + 1}`}
            className={`h-1 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-secondary/80 hover:bg-secondary"}`} />
        ))}
      </div>
    </div>
  );
}