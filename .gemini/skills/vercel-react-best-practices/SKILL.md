---
name: vercel-react-best-practices
description: Best practices for React 18/19 components, hook modularity, state optimization, and performance standards.
---

# Vercel React Best Practices

Use these guidelines when developing or refactoring React components in both the Chrome Extension and the Web Panel.

---

## 1. Component Modularity & Design
- **Single Responsibility Principle:** Keep components small, reusable, and co-located with their styles (e.g. `Component.tsx` and `Component.css` in the same directory).
- **Separation of Concerns:** Keep business logic inside custom hooks (`src/hooks/`) and UI layout inside pure React components.
- **TypeScript Prop Contracts:** Explicitly type all component props. Use descriptive names (and default to Portuguese props for consistency in the Web Panel).

---

## 2. State Management & Hooks
- **Primitive State First:** Avoid placing complex objects in `useState` if fields can be computed dynamically during render time.
- **useCallback & useMemo:** Wrap event handlers in `useCallback` and expensive computations in `useMemo` when passing them down to nested child components to prevent redundant renders.
- **Clean Subscriptions:** Always clean up event listeners, timers, or Firebase database listeners (`onValue` unsubscribes) inside `useEffect` cleanup return functions.

---

## 3. React 19 Performance Standards
- **Use Transitions:** Utilize `useTransition` for state updates that trigger slow network or DB operations (e.g. searching the client database or submitting data).
- **Avoid Prop Drilling:** Use context providers or custom hooks for deep state sharing.
