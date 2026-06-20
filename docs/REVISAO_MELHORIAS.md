# Revisão e Melhorias - ATI V2

> Data: 20/06/2026 | Versão: v2.2.0
> Itens concluídos foram removidos — apenas pendentes abaixo.

---

## Prioritários — Risco Alto

| # | Item | Esforço | Onde |
|---|---|---|---|
| 1 | **Adaptador de seletores do ChatMix** — centralizar seletores CSS com fallback + notificação. Se o ChatMix atualizar o DOM, a extensão quebra silenciosamente. | **3-5 dias** | `state.ts`, `getClientData.ts` |
| 2 | **Criptografar `chrome.storage.local`** — tokens Firebase + credenciais SGP em texto puro. | **3 dias** | `Popup.tsx`, `firebase.ts` |
| 3 | **Revisar regras do Firebase RTDB** — testar regras de segurança do banco. | **2 dias** | Console Firebase |

## Médios — Risco Médio

| # | Item | Esforço | Onde |
|---|---|---|---|
| 4 | **Restringir `externally_connectable` no manifest** | **1 dia** | `manifest.ts` |
| 5 | **Desabilitar CORS permissivo (`cors: true`)** nas Cloud Functions | **1 dia** | `functions/index.js` |
| 6 | **GitHub Actions** — pipeline lint + typecheck + build | **1-2 dias** | Novo `.github/` |
| 7 | **Atualizar pdfjs-dist para v4** — breaking changes na API | **1 dia** | `Site/` |
| 8 | **Migrar `@types/chrome` para 0.1.x** — 88 callsites pendentes, wrapper `storageGet<T>()` já criado | **2-3 dias** | `Extensao/src/` |

## Baixos / Features Futuras

| # | Item | Esforço |
|---|---|---|
| 9 | **Testes automatizados (Vitest)** — começar pela lógica de background | 3-5 dias |
| 10 | **Monitoramento de erros (Sentry/GlitchTip)** | 1-2 dias |
| 11 | **Exportar / Backup do Chat** | 1 dia |
| 12 | **Presença Online em Tempo Real** | 1 dia |
| 13 | **Modo Escuro Automático** | 1 dia |
| 14 | **Dashboard de Métricas na Home** | 2-3 dias |
| 15 | **Comando npm para gerar Changelog** | 1 dia |
| 16 | **Indicador de Versão da Extensão** | 1 dia |
| 17 | **Cache Local com SW no Site** | 2 dias |
| 18 | **Modo Quiosque / Atendimento Rápido** | 2-3 dias |
| 19 | **Remover `'unsafe-inline'` do CSP (nonce/hash)** | 2 dias |
