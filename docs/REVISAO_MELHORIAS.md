# Revisão e Melhorias - ATI V2

> Data: 20/06/2026 | Versão: v2.2.0
> Itens concluídos foram removidos — apenas pendentes abaixo.

---

## Prioritários — Risco Alto

| #   | Item                                                                                                                                                           | Esforço          | Onde                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------ |
| 1   | **Adaptador de seletores do ChatMix** — centralizar seletores CSS com fallback + notificação. Se o ChatMix atualizar o DOM, a extensão quebra silenciosamente. | **3-5 dias**     | `state.ts`, `getClientData.ts` |
| 2   | **Criptografar `chrome.storage.local`** — tokens Firebase + credenciais SGP em texto puro.                                                                     | **3 dias**       | `Popup.tsx`, `firebase.ts`     |
| 3   | **Revisar regras do Firebase RTDB** — testar regras de segurança do banco.                                                                                     | ✅ **Concluído** | `docs/database.rules.json`     |

## Médios — Risco Médio

| #   | Item                                                                                                | Esforço                                           | Onde                 |
| --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------- |
| 4   | **Restringir `externally_connectable` no manifest**                                                 | ✅ Já estava configurado (3 origens).             | `manifest.ts`        |
| 5   | **Desabilitar CORS permissivo (`cors: true`)** nas Cloud Functions                                  | ✅ `ALLOWED_ORIGINS` com as 5 origens conhecidas. | `functions/index.js` |
| 6   | **GitHub Actions** — pipeline lint + typecheck + build                                              | **1-2 dias**                                      | Novo `.github/`      |
| 7 | **Atualizar pdfjs-dist para v4** — breaking changes na API | ✅ **Concluído** | `Site/` |
| 8   | **Migrar `@types/chrome` para 0.1.x** — 88 callsites pendentes, wrapper `storageGet<T>()` já criado | **2-3 dias**                                      | `Extensao/src/`      |

---

## 🔍 Item #3 — Revisão das Regras do Firebase RTDB (database.rules.json)

### Problemas Encontrados

| #   | Severidade | Path                          | Problema                                                                                         | Impacto                                                                                           |
| --- | ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| 3.1 | **Alto**   | `/atendentes`                 | `.read: true` — dados de todos os usuários expostos publicamente sem autenticação                | Vazamento de PII (nomes, emails, setores, roles).                                                 |
| 3.2 | —          | `/sgp_cache`, `/sgp_cache_53` | ✅ **Intencional** — extensão precisa atualizar daily check de ocorrências. Manter como está.    | —                                                                                                 |
| 3.3 | **Médio**  | `/historico_potencias`        | `.write: auth != null` aberto a qualquer user logado.                                            | Inserção de dados falsos. Restringir para `setor == 'ti' \|\| 'suporte'` ou `role >= supervisor`. |
| 3.4 | **Médio**  | `/clientes_cadastro`          | Mesmo problema do histórico — acoplado ao fluxo de potência.                                     | Mesma regra: só TI/Suporte/Supervisor+.                                                           |
| 3.5 | **Baixo**  | `/atendentes`                 | Faltam `.indexOn: ["uid"]` para queries por `uid` em `useUser.ts:30` e `credentials.ts:49`       | Queries lentas; warnings no console.                                                              |
| 3.6 | **Baixo**  | `/anotacoes/{username}`       | `.validate` exige apenas `titulo` + `timestamp`, mas o App armazena `corpo`, `tasks[]`, `status` | Validar schema real.                                                                              |

### O que foi implementado

| #   | Path                             | O que mudou                                                                                                                               | Arquivos alterados                                                                |
| --- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ✓   | `/atendentes`                    | Adicionado `.indexOn: ["uid"]`. `.read: true` mantido (necessário para login por username).                                               | `database.rules.json`                                                             |
| ✓   | `/sgp_cache`                     | 🔒 Mantido como está (intencional).                                                                                                       | —                                                                                 |
| ✓   | `/uid_index/{uid}`               | **Novo nó** — índice uid → `{ username, role }` para verificação em regras sem username no path. Populado por register, Admin, UserPanel. | `database.rules.json`, `auth.ts`, `Admin.tsx`, `UserPanel.tsx`, `import-users.js` |
| ✓   | `/historico_potencias`           | `.write` restrito: `role !== 'usuario'` (só supervisor+). Verifica via `/uid_index/{auth.uid}/role`.                                      | `database.rules.json`                                                             |
| ✓   | `/clientes_cadastro`             | Mesma regra do histórico.                                                                                                                 | `database.rules.json`                                                             |
| ✓   | `/anotacoes/{username}/{notaId}` | `.validate` atualizado: aceita `corpo`, `tasks[]`, `status` opcionais; valida `status` como `pendente/em andamento/concluido`.            | `database.rules.json`                                                             |

### Testes a Executar (pós-implementação)

- [ ] Rodar `npm run build` e verificar se não há erros de tipo
- [ ] Deploy das novas regras: `firebase deploy --only database`
- [ ] Verificar se um usuário `role=usuario` consegue escrever em `/historico_potencias.json` (deve negar)
- [ ] Verificar se um `supervisor` consegue escrever em `/historico_potencias.json` (deve permitir)
- [ ] Verificar se a Cloud Function `receberDadosPotencia` continua escrevendo (ignora regras via Admin SDK)
- [ ] Registrar novo usuário e verificar se `/uid_index/{uid}` é criado automaticamente
- [ ] Alterar role de um usuário no Admin e verificar se `/uid_index/{uid}/role` atualiza

---

## Baixos / Features Futuras

| #   | Item                                                                  | Esforço  |
| --- | --------------------------------------------------------------------- | -------- |
| 9   | **Testes automatizados (Vitest)** — começar pela lógica de background | 3-5 dias |
| 10  | **Monitoramento de erros (Sentry/GlitchTip)**                         | 1-2 dias |
| 11  | **Exportar / Backup do Chat**                                         | 1 dia    |
| 12  | **Presença Online em Tempo Real**                                     | 1 dia    |
| 13  | **Modo Escuro Automático**                                            | 1 dia    |
| 14  | **Dashboard de Métricas na Home**                                     | 2-3 dias |
| 15  | **Comando npm para gerar Changelog**                                  | 1 dia    |
| 16  | **Indicador de Versão da Extensão**                                   | 1 dia    |
| 17  | **Cache Local com SW no Site**                                        | 2 dias   |
| 18  | **Modo Quiosque / Atendimento Rápido**                                | 2-3 dias |
| 19  | **Remover `'unsafe-inline'` do CSP (nonce/hash)**                     | 2 dias   |
