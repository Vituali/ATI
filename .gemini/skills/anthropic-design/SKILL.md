---
name: anthropic-design
description: Guidelines and design tokens inspired by Anthropic's clean, minimalist, and highly-readable user interface philosophy.
---

# Anthropic Frontend Design Guidelines

Use this skill when designing clean, minimalist, high-readability interfaces that feel elegant, intellectual, and uncluttered (similar to the Claude UI).

---

## 1. Aesthetic Principles
- **Minimalist Sophistication:** Reduce cognitive load. Keep interfaces extremely clean with plenty of whitespace.
- **Warm & Natural Colors:** Avoid cold blues/grays. Use warm, natural colors (creams, warm sands, deep charcoals, and off-whites).
- **Subtle Borders over Heavy Shadows:** Use thin, sharp borders instead of deep shadows to demarcate sections.
- **High Readability Typography:** Large headings, generous line heights, and premium fonts (serifs for headings, clean sans-serifs for body text).

---

## 2. Design Tokens (CSS Variables)

```css
:root {
  /* Warm Light Mode */
  --anthropic-bg: hsl(36, 33%, 97%);        /* Creamy/sand background */
  --anthropic-surface: hsl(40, 20%, 99%);   /* Slightly lighter surface */
  --anthropic-text-main: hsl(20, 15%, 12%); /* Warm charcoal */
  --anthropic-text-subtle: hsl(20, 10%, 45%);
  --anthropic-border: hsl(36, 12%, 87%);    /* Warm subtle border */
  
  /* Warm Dark Mode (Adaptive) */
  --anthropic-dark-bg: hsl(210, 15%, 8%);
  --anthropic-dark-surface: hsl(210, 15%, 12%);
  --anthropic-dark-text-main: hsl(210, 15%, 95%);
  --anthropic-dark-text-subtle: hsl(210, 10%, 70%);
  --anthropic-dark-border: hsl(210, 10%, 20%);

  /* Accent Color (Warm Clay / Rust / Forest Green) */
  --anthropic-accent: hsl(24, 75%, 50%);    /* Soft rust/orange */
  --anthropic-accent-hover: hsl(24, 75%, 45%);
}
```

---

## 3. Minimalist Containers & Inputs

Avoid card styling that floats. Instead, anchor sections using thin borders.

```css
.minimalist-card {
  background-color: var(--anthropic-surface);
  border: 1px solid var(--anthropic-border);
  border-radius: 8px;
  padding: 24px;
  transition: border-color 0.2s ease;
}

.minimalist-card:focus-within {
  border-color: var(--anthropic-accent);
}

.input-text {
  background: transparent;
  border: 1px solid var(--anthropic-border);
  border-radius: 6px;
  color: var(--anthropic-text-main);
  padding: 10px 14px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.input-text:focus {
  outline: none;
  border-color: var(--anthropic-accent);
  box-shadow: 0 0 0 2px hsla(24, 75%, 50%, 0.15);
}
```

---

## 4. Minimalist Buttons

Buttons should feel flat but responsive, with crisp borders and clean backgrounds.

```css
.btn-anthropic {
  background-color: var(--anthropic-text-main);
  color: var(--anthropic-surface);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-anthropic:hover {
  background-color: hsl(20, 15%, 20%);
}

.btn-anthropic-secondary {
  background-color: transparent;
  color: var(--anthropic-text-main);
  border: 1px solid var(--anthropic-border);
  border-radius: 6px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-anthropic-secondary:hover {
  background-color: rgba(0, 0, 0, 0.03);
  border-color: var(--anthropic-text-subtle);
}
```
