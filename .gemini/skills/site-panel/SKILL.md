---
name: site-panel
description: Architecture, coding patterns, and guidelines for the ATI V2 Administrative Web Panel.
---

# Web Panel Development Guidelines (Site)

Use these guidelines when creating or modifying components under the `Site/` directory.

---

## 🏛️ Project Stack & Structure

- **Core Stack**: React 19 + TypeScript + Vite 6
- **Backend / Auth**: Firebase 12 SDK (Authentication + Realtime DB)
- **Styling**: Vanilla CSS (CSS files co-located with their corresponding React components)

---

## 🤝 Site ↔️ Extension Communication (SSO & Message Bridge)

The web panel and extension synchronize user sessions via HTML5 `window.postMessage`:

1. **Bridge Handshake:** The extension injects a bridge and fires `BRIDGE_READY`.
2. **Site → Extension Sync:** When the bridge is ready and the site has an active Firebase session (`auth.currentUser`), it triggers `syncWithExtension()` to sync credentials.
3. **Extension → Site SSO:** If the site is logged out and receives `SSO_SESSION_DATA` from the extension, it executes `performSSOLogin(session)` to automatically authenticate.
4. **Embedded Mode:** When loaded inside an iframe query param `mode=embed`, the layout activates compact styles (`layout-embed`), displaying only the chat window and hiding sidebars/footers.

---

## 📝 Code Conventions & Patterns

1. **Props in Portuguese:** Always name React props in Portuguese.
   - Examples: `aberto`, `onFechar`, `largura`, `aoRemover`, `notificacoes`.
2. **Component File Naming:** PascalCase for components (e.g. `Modal.tsx`) with a default export.
3. **Hooks:** `use` prefix + camelCase (e.g., `useUser.ts`), located in `src/hooks/`.
4. **No Native Modals:** Do NOT use `window.alert()` or `window.confirm()`. Instead, use the custom `useNotification` hook.
5. **Theme Management:** Themes are managed by toggling `"light-theme"` on `document.body` and persisted in `localStorage("ati-theme")`.

---

## 🛡️ Key Utilities & Global Components

- `useUser()`: Validates and loads user state.
- `useNotification()`: Manages custom alerts, notifications, and prompts.
- `canAccess(role, setor, section)`: Verifies permissions based on roles (`usuario`, `moderador`, `supervisor`, `admin`).
- `LoadingOverlay`: Reusable loader.
- `permissions.ts`: Handles permission logic, role mappings, and sector displays.
- `pdfjs-dist`: Utilized inside `Conversor.tsx` for PDF text extraction.
