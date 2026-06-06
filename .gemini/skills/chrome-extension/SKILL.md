---
name: chrome-extension
description: Guidelines, architectures, rules, and best practices for developing the ATI V2 Chrome Extension.
---

# Chrome Extension Development Guidelines (Manifest V3)

Use these guidelines when creating or modifying components under the `Extensao/` directory.

---

## 🏛️ Extension Architecture

The extension is structured under the `Extensao/` directory and follows the Chrome Manifest V3 specifications strictly.

```
Extensao/src/
├── background/         # Service Worker (Background script). Run in isolation without DOM access.
│   ├── sgp/            # SGP automation & data extraction logic via REST.
│   └── firebase.ts     # Firebase API wrapper (REST-only).
├── contentScript/      # Scripts injected into ChatMix pages (chatmix.com.br).
│   ├── chatmix/        # DOM observers, button injection, OS Modal (osModal.ts, etc.).
│   ├── auth/           # Firebase authentication UI overlays on top of ChatMix.
│   └── patterns/       # RegEx patterns for message identification.
└── popup/              # Chrome extension popup UI (icon action interface).
```

---

## ⚠️ Critical Architectural Rules

1. **NO DIRECT EXTERNAL CALLS FROM CONTENT SCRIPTS:**
   - The `contentScript` must **never** make direct network requests to the SGP, Firebase, or external APIs (to avoid CORS and maintain context security).
   - All network calls must go through the background service worker using `chrome.runtime.sendMessage`.

2. **REST-ONLY IN SERVICE WORKER (NO FIREBASE SDK):**
   - The background Service Worker does NOT run in a DOM/window context.
   - **NEVER** import the standard Firebase SDK (`@firebase/app`, etc.) inside `background/` as it causes infinite loops and initialization failures.
   - Use clean REST API requests (`fetch`) for Firebase interactions.

3. **DOM DEPENDENCY & STABILITY:**
   - The extension relies heavily on the ChatMix DOM layout. Ensure CSS selectors inside `src/contentScript/chatmix/state.ts` are checked and kept up-to-date.
   - Use `MutationObserver` in `index.ts` to detect page loads, URL shifts, and inject buttons.

---

## 🧠 Business Logic & State

1. **SGP Session Integration (Cookies):**
   - The extension does not store SGP credentials. It relies on active browser cookies from the SGP session.
   - Background requests to SGP endpoints must include `credentials: 'include'`.

2. **Caching & Rate Limits:**
   - Cache client data using `chatId` (from ChatMix URL) to avoid aggressive rate-limiting.
   - Use `chrome.storage.session` to cache occurrence types and client searches (ensuring session persistence even if the background worker suspends).

3. **Strict Firebase Key Mappings:**
   - Always follow the exact schema defined in `docs/FIREBASE_SCHEMA.md`.
   - The key for cached SGP occurrence types is **strictly** `occurrenceTypes`.
   - The key for occurrence type ID in OS templates is **strictly** `occurrenceTypeId`.

---

## 📝 Code Quality & Best Practices

1. **Strict TypeScript:** No `any` type. Define interfaces and types under appropriate `types.ts` files.
2. **DOM Injection Safety (XSS):** Never use `.innerHTML`. Construct nodes via the DOM API (`document.createElement`) or use `.textContent`.
3. **Memory Management:** Modals or dynamic event listeners attached to `document` or `body` must use an `AbortController` signal to clean up listeners and prevent leaks when the component is destroyed.
