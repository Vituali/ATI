# Checklist de Tarefas: Integração Banco SGP 🚀

Este checklist descreve todas as etapas técnicas necessárias para realizar a integração segura do banco de dados do SGP com o ecossistema ATI.

---

## 📋 1. Alinhamento e Preparação com o TI
- [ ] Obter as definições do banco de dados (SGBD, Versão) para os dois servidores SGP:
  - `http://201.158.20.35:8000/`
  - `http://201.158.20.53:8000/`
- [ ] Definir a estratégia de rede (Firewall / IP Fixo / VPN / VPC).
- [ ] Solicitar a criação de um usuário SQL de leitura limitado (`ati_backend_reader`) nos bancos de dados de ambos os servidores.
- [ ] Definir as views SQL seguras no banco do SGP para expor apenas as informações necessárias (OLTs, PONs, ONU Potência, etc.).

---

## 🔒 2. Configurações de Segurança e Nuvem (Google Cloud)
- [ ] Ativar o **Google Cloud Secret Manager** no projeto do Firebase.
- [ ] Cadastrar as credenciais de ambos os bancos SGP no Secret Manager:
  - Host/Port/Name/User/Password para o SGP 35
  - Host/Port/Name/User/Password para o SGP 53
- [ ] *(Se necessário)* Configurar o **Serverless VPC Access** e o **Cloud NAT** para obter um IP de saída estático para whitelisting no firewall dos servidores SGP.

---

## 💻 3. Desenvolvimento no Backend (`functions/`)
- [ ] Instalar o driver do banco de dados adequado no diretório `functions/` (ex: `npm install pg` para PostgreSQL).
- [ ] Criar a Cloud Function `consultarSgp` em `functions/index.js`:
  - [ ] Validar o Firebase ID Token (`verifyIdToken`).
  - [ ] Validar se o atendente executor está ativo no Realtime Database (`uid_index/{uid}`).
  - [ ] Implementar a conexão segura utilizando as credenciais injetadas baseadas no SGP alvo (35 ou 53).
  - [ ] Executar queries estritamente parametrizadas (anti SQL Injection).
  - [ ] Implementar tratamento de erros e fechamento seguro das conexões (`client.end()`).
- [ ] Testar localmente a função com o Firebase Emulator Suite.
- [ ] Realizar o deploy da nova Cloud Function:
  ```bash
  npm run deploy
  ```

---

## 🖥️ 4. Desenvolvimento no Frontend (`Site/`)
- [ ] Criar o serviço de integração `Site/src/services/sgpDatabase.ts`:
  - [ ] Obter o token de autenticação atualizado via `auth.currentUser.getIdToken(true)`.
  - [ ] Fazer requisições HTTP enviando o token no header `Authorization: Bearer <TOKEN>`.
- [ ] Implementar a interface de visualização no painel administrativo:
  - [ ] Filtro por OLT/PON.
  - [ ] Tabela premium com a listagem de clientes ativos/inativos e potência da ONU.
  - [ ] Busca de dados cadastrais rápidos para auxílio técnico.
- [ ] Implementar cache local na interface para evitar requisições redundantes em curto espaço de tempo.

---

## 🔌 5. Integração na Extensão do Chrome (`Extensão/`)
- [ ] Integrar a chamada da API da Cloud Function no Service Worker da extensão.
- [ ] Sincronizar o ID Token usando o `storage.session` e injetá-lo nas chamadas automáticas.
- [ ] Adicionar atalhos contextuais no ChatMix para ler a potência da ONU ou status cadastral direto pela API segura do intermediário.

---

## 🧪 6. Homologação e Validação
- [ ] Realizar testes de carga/exaustão de conexões para monitorar o comportamento dos bancos de dados.
- [ ] Executar auditoria de segurança (verificar se usuários deslogados ou sem permissão conseguem bater no endpoint).
- [ ] Lançar em produção para um grupo restrito de técnicos antes da liberação geral.
