---
name: code-reviewer
description: Guidelines for automated code quality reviews, TypeScript safety checks, and critical security audits (Prototype Pollution, Path Traversal, XSS, and Secure Message Passing).
---

# Code Review & Security Guidelines

Use this skill when reviewing code, submitting pull requests, refactoring components, or performing security audits.

---

## 1. Code Quality & Clean Code Standards

- **TypeScript Strictness:** Always define interfaces, avoid `any`, and ensure proper types are exported in `types.ts`.
- **Component Size Limit:** Keep React components under 300 lines of code. If a component grows larger, modularize it into UI subcomponents, events, and hook services.
- **Memory Management:** Any dynamic event listeners (such as modal backdrops, global keydowns, or document listeners) must use an `AbortController` signal to guarantee they are cleaned up on component destruction.

---

## 2. Security Audits & Vulnerability Prevention

### A. Prototype Pollution Prevention
- **Rule:** Never perform dynamic lookups on objects using unchecked user input in bracket notation (e.g., `OBJECT[userInput]`).
- **Solution:** Use static mapping helper functions containing explicit `switch` cases.
- **File Reference:** See helper templates in [permissions.ts](file:///c:/Users/Dell/Documents/GitHub/ati/Site/src/services/permissions.ts) (such as `getSetorLabel` or `getRoleLabel`).

### B. Path Traversal Prevention
- **Rule:** Do not construct dynamic file paths based on command-line arguments (`process.argv`) or external parameters in scripts.
- **Solution:** Resolve paths as absolute constants via `path.resolve` and select files using strict boolean toggles.
- **File Reference:** See implementation patterns in [switch-env.cjs](file:///c:/Users/Dell/Documents/GitHub/ati/switch-env.cjs).

### C. Cross-Site Scripting (XSS) Prevention
- **Rule:** Never use `.innerHTML` inside content scripts or component files when injecting text.
- **Solution:** Use `.textContent` or programmatically build the elements using `document.createElement()` and `appendChild()`.

### D. Secure Window Message Passing
- **Rule:** Always validate the origin of incoming messages.
- **Solution:** Utilize a cryptographically secure, single-use token generated via `crypto.randomUUID()` when opening new windows or iframes, validating the token inside the event listener before processing payloads.
