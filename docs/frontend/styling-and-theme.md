# Styling & Theme Design System

The visual design of **Bug-Feed** is crafted around an elite Cyberpunk Security Operations Center (SOC) aesthetic, prioritizing readability, high contrast, and responsive data density.

---

## 1. CSS Design Tokens & Color Palette

The interface relies on CSS Custom Properties defined on the root:

```css
:root {
  --bg-primary: #090d16;
  --bg-card: rgba(15, 23, 42, 0.75);
  --border-color: rgba(255, 255, 255, 0.08);
  --text-primary: #f8fafc;
  --text-muted: #94a3b8;
  
  /* Cyber Accents */
  --accent-cyan: #06b6d4;
  --accent-amber: #f59e0b;
  --accent-rose: #f43f5e;
  --accent-emerald: #10b981;
  --accent-purple: #a855f7;

  /* Monospace Typography */
  --font-mono: 'JetBrains Mono', 'Fira Code', Menlo, monospace;
}
```

---

## 2. Category Color Identity

To allow analysts to immediately discern sources at a glance, each feed category possesses a distinct visual signature:

| Source / Category | Accent Color | Badge Style | Border Glow |
| :--- | :--- | :--- | :--- |
| **CVEs & PoCs** | Amber / Gold (`#fbbf24`) | `.badge-cve` | `rgba(245, 158, 11, 0.15)` |
| **Disclosures & Writeups** | Rose / Coral (`#fb7185`) | `.badge-hackerone` | `rgba(244, 63, 94, 0.15)` |
| **Infosec News** | Emerald (`#34d399`) | `.badge-news` | `rgba(16, 185, 129, 0.15)` |
| **Twitter / Bug Bounty Tips** | Cyan / Sky (`#38bdf8`) | `.badge-tips` | `rgba(6, 182, 212, 0.15)` |

---

## 3. Dark & Light Mode Support

- The application defaults to **Dark Mode**.
- Users can switch themes via the top header button (`☀️ / 🌙`).
- The selection is stored in `localStorage` (`bugfeed_theme`).
- When Light Mode is active, `document.body.classList.add('light')` overrides surface tokens with crisp, high-contrast daylight tones.

---

## 4. Cyber Interactive Controls

1. **Glow Effects**: Cards feature subtle ambient glow on hover (`box-shadow: 0 4px 20px rgba(...)`).
2. **Action Chips**:
   - `[ 📦 GitHub PoC ↗ ]`: Styled with amber glow.
   - `[ 🛡️ CVE.org Record ↗ ]`: Styled with cyan glow.
   - `[ 📑 NVD NIST ↗ ]`: Muted slate badge.
   - `[ 🔍 OSV Advisory ↗ ]`: Purple badge.
3. **Pill Navigation**: Rounded pill tabs with active cyan highlight and emoji indicators.
