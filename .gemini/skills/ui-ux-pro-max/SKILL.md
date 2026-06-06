---
name: ui-ux-pro-max
description: Guidelines, CSS templates, and design tokens for building premium, modern, and visually stunning user interfaces.
---

# UI/UX Pro Max Guidelines

This skill provides the design system, CSS patterns, and aesthetic principles required to build state-of-the-art user interfaces. Use this whenever designing or updating web pages, extension popups, or application components.

---

## 1. Harmonious Color Palettes (Dark Mode First)

Avoid plain, high-contrast colors (e.g., pure black `#000000` or pure blue `#0000ff`). Instead, use rich HSL-based palettes with custom depth.

### Design Tokens (CSS Variables)
```css
:root {
  /* Dark Theme Palette */
  --bg-main: hsl(224, 25%, 12%);
  --bg-card: hsla(224, 25%, 16%, 0.7);
  --bg-card-hover: hsla(224, 25%, 22%, 0.8);
  
  /* Brand/Accent Colors */
  --accent-primary: hsl(250, 85%, 65%);
  --accent-primary-glow: hsla(250, 85%, 65%, 0.3);
  --accent-secondary: hsl(320, 80%, 60%);
  --accent-secondary-glow: hsla(320, 80%, 60%, 0.3);
  
  /* Status Colors */
  --color-success: hsl(145, 80%, 45%);
  --color-warning: hsl(40, 90%, 55%);
  --color-error: hsl(0, 85%, 60%);
  
  /* Text Hierarchy */
  --text-primary: hsl(210, 40%, 98%);
  --text-secondary: hsl(215, 20%, 75%);
  --text-muted: hsl(215, 15%, 55%);
  
  /* Borders and Dividers */
  --border-subtle: hsla(215, 20%, 80%, 0.1);
  --border-focus: hsla(250, 85%, 65%, 0.5);

  /* Blur Effect */
  --blur-radius: 12px;
}
```

---

## 2. Glassmorphism & Depth

To create a premium, layered UI feel, use frosted-glass components with subtle borders and shadows.

### Glass Card Template
```css
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(var(--blur-radius));
  -webkit-backdrop-filter: blur(var(--blur-radius));
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.glass-card:hover {
  background: var(--bg-card-hover);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}
```

---

## 3. Typography Hierarchy

Utilize modern sans-serif typefaces (e.g., `Outfit`, `Inter`, or `Roboto`) and define a clean, legible hierarchy.

```css
body {
  font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-primary);
  line-height: 1.6;
}

h1 {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, var(--text-primary) 30%, var(--accent-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 4. Interactive Micro-Animations

Every button, link, and interactive container must respond to user input with fluid, organic animations.

### Premium Button Template
```css
.btn-primary {
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px var(--accent-primary-glow);
}

.btn-primary:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 20px var(--accent-primary-glow), 0 0 10px var(--accent-secondary-glow);
}

.btn-primary:active {
  transform: scale(0.98);
}
```

---

## 5. UI Layout Rules
- **Margins & Paddings:** Use consistent geometric scales (e.g., 4px, 8px, 12px, 16px, 24px, 32px, 48px).
- **Responsive Flex/Grid:** Always use CSS Grid or Flexbox. Avoid absolute positioning unless building overlays.
- **Scrollbars:** Customize scrollbars to fit the dark theme so they don't break the design.
  ```css
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: var(--bg-main);
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border-subtle);
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
  ```
