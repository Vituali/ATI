# Plano Interno de Implementação — Integração SGP (ATI V2)

## 1. Dependências Externas (TI)

- [ ] SGBD e versão dos dois SGPs
- [ ] Usuário SQL read-only
- [ ] Host/IP e porta de acesso
- [ ] Regras de firewall / whitelist

---

## 2. Backend (Cloud Function)

- [ ] Criar endpoint `consultarSgp`
- [ ] Validar Firebase Auth (JWT)
- [ ] Implementar conexão com banco via credenciais seguras
- [ ] Criar queries parametrizadas
- [ ] Implementar fechamento de conexão

---

## 3. Frontend (Painel Web)

- [ ] Serviço de API para SGP
- [ ] Tela de consulta por OLT/PON
- [ ] Tabela de clientes e ONU
- [ ] Cache simples de requisições recentes

---

## 4. Extensão Chrome

- [ ] Integração com endpoint SGP
- [ ] Uso de token via storage.session
- [ ] Ações rápidas no ChatMix

---

## 5. Validação

- [ ] Teste funcional (consulta básica)
- [ ] Teste de permissão (read-only real)
- [ ] Teste de carga leve
