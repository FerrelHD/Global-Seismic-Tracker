# Anti-AI Slop Design System & Architecture Rules

This repository strictly enforces an **Editorial Swiss / Modernist Liquid Glass** design aesthetic (inspired by *Baseline — Tennis Club & Academy*, Dieter Rams, and high-end technical observatories). **Generic "AI Slop" patterns are strictly prohibited.**

---

## 1. Prohibited AI-Slop Anti-Patterns (BANNED)

1. **Multi-Color Neon Gradients**:
   - ❌ `bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500`
   - ❌ Neon text gradients (`bg-clip-text text-transparent bg-gradient-to-r ...`)
2. **Neon Glows & Drop Shadows**:
   - ❌ `shadow-[0_0_25px_#00f0ff]`, `drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]`
   - ❌ Canvas oscilloscope lines with `shadowBlur > 0` neon glow.
3. **Gratuitous Pulsing Dots & Badges**:
   - ❌ `animate-ping` or `animate-pulse` on every card, icon, or badge.
   - ❌ Neon green/cyan gamer status pills (`bg-cyan-950 border-cyan-500 text-cyan-300`).
4. **Dark Gamer / Cyberpunk Modals**:
   - ❌ Pitch-black backgrounds (`bg-slate-950`) combined with neon cyan/yellow/green telemetry text.
5. **Cheesy Decorative Icons**:
   - ❌ Floating sparkles (`SparklesIcon`), stars, or unmotivated animated icons.
6. **Viewport Telemetry Overlap**:
   - ❌ Fixed HUD telemetry text overlapping editorial headline copy.

---

## 2. Approved Editorial Design Standards

### A. Color Discipline (Monochrome + Deep Navy + Functional Alerts)
- **Base Surfaces**: Pure White (`#ffffff`), Clean Neutral Surface (`#f4f4f4`), Light Neutral Cards (`#ffffff` / `#fafafa`).
- **Typography & Inks**: Ink Primary (`#0a0a0a`), Ink Secondary (`#717784`), Muted / Ghost (`#94a3b8`, `#d7dae1`).
- **Hairlines**: Crisp 1px hairlines (`border-neutral-200/80` or `border-black/[0.06]`).
- **Editorial Brand Accent**: Deep Navy (`#0f2f63`), used sparingly for badges, active states, and emphasis.
- **Functional Alerts Only**: Rose / Amber (`#e11d48`, `#d97706`) are **ONLY** permitted when real seismic/fire threat data warrants it (e.g. Magnitude $\ge$ 6.0 or active Tsunami Warning). Never use them as decorative accents.

### B. Material & Liquid Glass
- **Surface**: `bg-white/80` or `bg-neutral-100/90` with `backdrop-blur-md`.
- **Borders**: Hairline `border border-neutral-200/80` or `border-white/80`.
- **Shadows**: Subtle diffuse shadows (`shadow-xs` or `shadow-sm`, opacity $< 6\%$), never colored neon glow.

### C. Typography
- **Display & Headlines**: `font-sans` (`Onest` / `Inter`), bold/extrabold, tight tracking (`tracking-tight`), uppercase clip-mask reveals.
- **Technical Telemetry**: `font-mono` (`JetBrains Mono`), `tabular-nums`, uppercase, spaced tracking (`tracking-wider` / `tracking-widest`).

### D. Motion & Interaction
- **Cubic Bezier Timing**: `cubic-bezier(0.65, 0, 0.35, 1)` or `ease-out`.
- **Hover Micro-Interactions**: Subtle vertical lift (`hover:-translate-y-1` to `-translate-y-1.5`) with border highlight (`hover:border-neutral-300`).
- **Zero Incessant Looping**: No continuous spinning or pulsing unless explicitly actively transmitting or loading.

---

## 3. Checklist for Component Reviews
Before committing or creating any component:
- [ ] Are colors strictly neutral white/gray/slate with deep-navy `#0f2f63`?
- [ ] Is all neon cyan/green/yellow text removed?
- [ ] Are all `animate-ping` and `animate-pulse` loops eliminated?
- [ ] Does the component respect architectural corner marks and hairlines?
- [ ] Does the component look like a high-end Swiss scientific instrument rather than a sci-fi video game?
