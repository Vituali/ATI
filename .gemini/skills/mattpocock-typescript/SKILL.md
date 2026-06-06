---
name: mattpocock-typescript
description: Guidelines for clean, structured, and advanced TypeScript patterns, strictly avoiding 'any' and ensuring type safety.
---

# TypeScript Guidelines (Matt Pocock Style)

Use this skill to design clean TypeScript architectures, write robust types, and satisfy the compiler without using type assertions.

---

## 1. Type Safety & Strictness
- **Strictly No 'any':** Use `unknown` for values from external sources (API payloads, DOM parsing) and narrow them down using type guards.
- **Type Guard Predicates:** Write explicit type guards (`x is Type`) to narrow down structures safely.
  ```typescript
  function isValidSession(data: unknown): data is UserSession {
    return !!data && typeof data === 'object' && 'idToken' in data;
  }
  ```
- **Utility Types:** Make active use of TypeScript helpers like `Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, and `Record<K, T>`.

---

## 2. Chrome Extension & Message Typing
- Always define explicit request and response types for Chrome runtime message handlers.
- Use discriminating unions to handle actions safely:
  ```typescript
  type MessageRequest = 
    | { action: 'getOsTemplates'; username: string }
    | { action: 'clearSgpCache'; cacheKey: string };
  ```
