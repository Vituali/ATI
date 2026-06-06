# Erros Comuns e Boas Práticas de Desenvolvimento (ATI)

Este documento registra erros comuns encontrados durante o desenvolvimento e refatoração do ecossistema ATI para servir de referência, guiar futuras implementações e evitar regressões.

---

## 1. Regra de Ouro dos Hooks (Erro Minificado do React #310)

### O Problema (Quebra da Ordem dos Hooks)
O React depende da ordem exata em que os hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) são chamados em cada renderização. Se o fluxo do código retornar mais cedo (Early Return), o número de hooks executados muda, quebrando a reconciliação de estado do React.

**Exemplo do erro que ocorria no `ChatInterno.tsx`:**
```tsx
// ❌ INCORRETO: Retorno precoce que pula a execução dos hooks abaixo se o usuário for nulo
if (!user) return null;

const salasVisiveis = useMemo(() => {
  return (Object.keys(ROOM_ICONS) as Setor[]).filter((s) => s === user.setor);
}, [user.setor]);
```

### Como Corrigir / Evitar
1. **Declare TODOS os Hooks no Topo:** Nunca declare hooks após condicionais ou retornos antecipados.
2. **Use Encadeamento Opcional (`?.`):** Para evitar erros de referência nula nos hooks declarados no topo, utilize `user?.setor` e trate os valores nulos internamente.
3. **Deixe os Early Returns para o final:** A validação de renderização final deve ficar após a inicialização de todos os hooks.

**Exemplo Correto:**
```tsx
//  CORRETO: Hooks declarados antes do retorno, usando encadeamento opcional para segurança
const salasVisiveis = useMemo(() => {
  return (Object.keys(ROOM_ICONS) as Setor[]).filter((s) => s === user?.setor);
}, [user?.setor]);

// Retorno condicional posicionado abaixo de todos os hooks do componente
if (!user) return null;
```

---

## 2. TypeScript Estrito: Parâmetros não Utilizados (`noUnusedParameters`)

### O Problema
Com as configurações estritas ativadas no `tsconfig.json` (`"noUnusedLocals": true`, `"noUnusedParameters": true`), qualquer parâmetro declarado em uma função que não seja lido causará erro de compilação.

### Como Corrigir / Evitar
Se você precisa declarar o parâmetro por causa de uma assinatura de callback (como em métodos de array), mas não vai usá-lo, prefixe o nome do parâmetro com um underline (`_`):

```typescript
// ❌ Causaria erro de compilação:
const novosModelos = lista.map((modelo, index) => {
  return modelo.nome; // index não foi lido
});

//  Forma Correta:
const novosModelos = lista.map((modelo, _index) => {
  return modelo.nome;
});
```

---

## 3. Diálogos Nativos em Páginas React (`window.confirm`)

### O Problema
Usar `window.confirm` ou `window.alert` bloqueia a thread principal do navegador e quebra o fluxo de UI fluida de um Single Page Application (SPA), além de não ser customizável visualmente.

### Como Corrigir / Evitar
Use o hook customizado `useNotification` que fornece o método promisificado `confirm` assíncrono.

```tsx
// ❌ Evite:
if (window.confirm("Deseja apagar?")) {
  apagar();
}

//  Use a alternativa assíncrona:
const { confirm } = useNotification();

const handleApagar = async () => {
  const confirmacao = await confirm("Deseja apagar?");
  if (confirmacao) {
    apagar();
  }
};
```
