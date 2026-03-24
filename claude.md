# Projeto ATI V2 - Portal de Gestão

## Visão Geral
O **Projeto ATI V2** é uma plataforma de gestão e suporte interna desenvolvida com **React**, **TypeScript** e **Firebase**. O sistema oferece funcionalidades de autenticação segura, controle de permissões baseado em cargos (*roles*) e setores, gerenciamento de modelos de ordens de serviço (O.S.), chat interno, painel administrativo e ferramentas de utilidade como conversores e gerenciadores de senhas. A interface utiliza um sistema de temas dinâmico (Dark/Light) e é estruturada de forma modular para facilitar a manutenção e expansão.

## Estrutura do Código
- **`src/App.tsx`**: Ponto de entrada principal da aplicação. Gerencia o roteamento entre as seções, o estado global do usuário via hook e a persistência do tema (claro/escuro).
- **`src/services/firebase.ts`**: Centraliza a configuração e inicialização do Firebase (Authentication e Realtime Database), exportando as instâncias para o restante do projeto.
- **`src/services/permissions.ts`**: Define os tipos de usuários (`Role`), setores (`Setor`) e seções. Contém a lógica de controle de acesso para garantir que cada usuário veja apenas o que lhe é permitido.
- **`src/services/auth.ts`**: Encapsula as funções de autenticação (login, registro, logout) e as interações iniciais com o banco de dados para perfis de usuários.
- **`src/hooks/useUser.ts`**: Hook personalizado que monitora o estado de autenticação do Firebase e busca o perfil detalhado do usuário no banco de dados.
- **`src/pages/`**: Contém os componentes de página principais:
  - `Home.tsx`: Dashboard inicial com informações rápidas.
  - `OS.tsx`: Gerenciamento de templates de Ordens de Serviço com filtros por categoria e keywords.
  - `Admin.tsx`: Painel para gerenciamento de usuários, cargos e setores.
  - `Chat.tsx`: Interface de comunicação interna.
  - `Login.tsx` / `Register.tsx`: Fluxos de acesso ao sistema.
- **`src/components/`**: Componentes reutilizáveis como `Sidebar`, `Footer` e `Modal`.

## Principais Funções/Classes

### `useUser` (Hook)
- **Parâmetros**: Nenhum.
- **Retorno**: `{ user: UserProfile | null, loading: boolean, error: string | null }`
- **Descrição**: Centraliza o estado do usuário logado. Ele escuta mudanças na autenticação do Firebase e carrega automaticamente os dados complementares (cargo, setor, status) do Realtime Database.

### `canAccess`
- **Parâmetros**: `role: Role`, `setor: Setor`, `section: Section`
- **Retorno**: `boolean`
- **Descrição**: Função fundamental de segurança que verifica se uma combinação de cargo e setor tem permissão para acessar uma seção específica da aplicação.

### `register`
- **Parâmetros**: `details: RegisterDetails` (username, fullName, email, password)
- **Retorno**: `Promise<void>`
- **Descrição**: Realiza o cadastro do usuário no Firebase Auth e cria o nó correspondente no Realtime Database. Novos usuários começam automaticamente no setor "geral" (pendente) e cargo "usuario".

### `login`
- **Parâmetros**: `usernameOrEmail: string, password: string`
- **Retorno**: `Promise<User>`
- **Descrição**: Tenta autenticar o usuário. Aceita tanto o e-mail quanto o nome de usuário (buscando o e-mail vinculado no banco de dados primeiro).

### `processarPdf` (em Conversor.tsx)
- **Parâmetros**: `file: File`
- **Retorno**: `Promise<void>`
- **Descrição**: Utiliza a biblioteca `pdfjs-dist` para extrair texto de arquivos PDF de aditivos contratuais, automatizando o preenchimento de dados de mudança de endereço.

### `salvarModelo` (em OS.tsx)
- **Parâmetros**: `modelo: ModeloOS`
- **Retorno**: `Promise<void>`
- **Descrição**: Persiste um modelo de ordem de serviço no banco de dados, vinculado ao nome de usuário do atendente logado.

## Dependências
- **React 19**: Biblioteca principal para construção da interface.
- **Firebase 12**: Gerenciamento de banco de dados (Realtime DB) e autenticação.
- **Vite 6**: Ferramenta de build e servidor de desenvolvimento.
- **TypeScript**: Superset de JavaScript para tipagem estática e segurança de código.
- **pdfjs-dist**: Biblioteca para manipulação e visualização de arquivos PDF (usada no Conversor).

## Exemplo de Uso

### Verificação de Permissão em Componente
```tsx
import { canAccess } from "./services/permissions";
import { useUser } from "./hooks/useUser";

const { user } = useUser();

if (user && canAccess(user.role, user.setor, "admin")) {
  // Renderiza o botão de acesso ao painel admin
  return <AdminButton />;
}
```

### Uso do Hook de Usuário
```tsx
import { useUser } from "../hooks/useUser";

export default function MyComponent() {
  const { user, loading } = useUser();

  if (loading) return <span>Carregando...</span>;
  if (!user) return <span>Por favor, faça login.</span>;

  return <h1>Bem-vindo, {user.nomeCompleto}!</h1>;
}
```

## Resumo
- **Segurança**: Fluxo de autenticação robusto com verificação de status (ativo/inativo) e restrições granulares por setor.
- **Extensibilidade**: A estrutura centralizada no `firebase.ts` e `permissions.ts` permite adicionar novos módulos ou trocar o provedor de backend com impacto mínimo.
- **UX/UI**: Sistema de temas integrado via CSS Variables (`data-theme`) e carregamento assíncrono de perfis com lógica de retry para estabilidade.
- **Performance**: Uso de hooks personalizados para evitar renderizações desnecessárias e manter o estado sincronizado com o Firebase.
