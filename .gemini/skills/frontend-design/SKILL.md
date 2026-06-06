---
name: frontend-design
description: Design systems, typography hierarchies, layout alignment, and visual contrast rules for clean interfaces.
---

# Frontend Design Guidelines

Use this skill when styling layout containers, grids, inputs, buttons, and typography.

---

## 1. Visual Hierarchy & Contrast
- **Clean Borders over Shadows:** Rely on thin, light borders (`1px solid var(--border-color)`) for structural sections instead of heavy shadows.
- **Micro-Copy Typography:** Label inputs and status badges clearly using uppercase, high-contrast, smaller-size text (e.g. `10px` to `12px` font size, bold).
- **Harmonious Accents:** Use a single primary accent color sparingly to guide focus, keeping background surfaces neutral.

---

## 2. Layout & Spacing Rules
- **Spacing Scale:** Align components using geometric spacing (e.g., 4px, 8px, 12px, 16px, 24px, 32px, 48px).
- **Flex and Grid:** Prefer standard CSS Flexbox or CSS Grid. Avoid fixed dimensions (width/height) on containers to maintain responsiveness.
- **Focus States:** Every interactive button and input must have a clear `:focus` outline or border-color transition to guarantee accessibility.
