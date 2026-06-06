---
name: code-simplifier
description: Coding patterns for simplifying logic, reducing nesting, extracting helpers, and keeping files compact.
---

# Code Simplifier Guidelines

Use this skill when refactoring components, cleaning up files, or reducing code complexity.

---

## 1. Guard Clauses & Early Exits
- Avoid deeply nested `if-else` blocks.
- Use early exits (guard clauses) at the start of functions to handle invalid states immediately.

```typescript
// Avoid this:
function process(user) {
  if (user) {
    if (user.isActive) {
      // business logic...
    }
  }
}

// Prefer this:
function process(user) {
  if (!user || !user.isActive) return;
  // business logic...
}
```

---

## 2. Function Extraction
- If a function contains more than 30 lines or handles multiple tasks, extract logical blocks into dedicated helper functions.
- Move pure utility functions (which do not depend on component state) outside the component body or into utility files.

---

## 3. Minimizing Local State
- Do not store state that can be derived from existing props or state.
- Compute derivations on-the-fly during render time to avoid state synchronization bugs.
