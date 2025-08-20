# 📖 Manual do Usuário - ATI

## Bem-vindo ao ATI! 👋

Este manual vai te ajudar a usar todas as funcionalidades do sistema de forma eficiente.

## 🚀 Primeiros Passos

### 1. Acessando o Sistema
- Abra o navegador e acesse a URL do ATI
- O sistema carrega automaticamente no modo Chat
- Interface responsiva funciona em desktop, tablet e mobile

### 2. Selecionando seu Perfil
1. Clique no botão **👤 Selecionar Atendente** na barra lateral
2. Escolha seu nome na lista
3. Clique em **✅ Fechar**
4. Suas mensagens personalizadas serão carregadas

## 💬 Usando o Chat Automatizado

### Enviando Mensagens Rápidas

1. **Selecione uma Categoria**
   - Suporte Técnico
   - Financeiro  
   - Geral

2. **Escolha a Mensagem**
   - Lista organizada por categoria
   - Títulos descritivos para fácil identificação

3. **Personalize se Necessário**
   - Edite o texto na caixa de mensagem
   - Use `[saudacao]` e `[despedida]` para saudações automáticas

4. **Copie e Cole**
   - Clique em **📋 Copiar**
   - Cole no seu sistema de atendimento

### Marcadores Especiais

Os marcadores se ajustam automaticamente ao horário:

| Horário | [saudacao] | [despedida] |
|---------|------------|-------------|
| 05:00-11:59 | bom dia | tenha uma excelente manhã |
| 12:00-17:59 | boa tarde | tenha uma excelente tarde |
| 18:00-04:59 | boa noite | tenha uma excelente noite |

### Gerenciando Mensagens

#### ➕ Adicionar Nova Mensagem
1. Clique em **➕ Adicionar**
2. Digite o título (ex: "Problema de Internet")
3. Escolha a categoria (suporte/financeiro/geral)
4. A mensagem é criada com template padrão
5. Edite o conteúdo conforme necessário

#### ✏️ Editando Mensagens
1. Selecione a mensagem desejada
2. Modifique o texto na caixa
3. Clique em **💾 Salvar** para confirmar

#### 📁 Alterando Categoria
1. Selecione a mensagem
2. Clique em **📁 Alterar Categoria**
3. Digite a nova categoria
4. Confirme a alteração

#### 🗑️ Excluindo Mensagens
1. Selecione a mensagem
2. Clique em **🗑️ Apagar**
3. Confirme a exclusão

## 📄 Usando o Conversor de Aditivos

### Preparando o PDF
- **Formato**: PDF de aditivo contratual padrão
- **Qualidade**: Texto legível (não escaneado como imagem)
- **Conteúdo**: Deve conter dados de contrato, endereços e cliente

### Processo Passo a Passo

#### 1. Upload do Arquivo
1. Clique em **📄 Conversor de Aditivos**
2. Clique em **📎 Escolher Arquivo**
3. Selecione o PDF do aditivo
4. Clique em **🔍 Carregar e Extrair Dados**

#### 2. Verificação dos Dados
O sistema extrai automaticamente:
- **📄 Número do Contrato**
- **👤 Nome do Cliente**
- **📍 Endereço Antigo**
- **🆕 Endereço Novo**

#### 3. Configuração do Atendimento

**📞 Telefone**
- Digite no formato: (21) 99999-9999
- Sistema valida automaticamente

**📱 Tipo de Comodato**
- ALCL: Apenas linha telefônica
- PROPRIO: Cliente possui equipamento
- HUAWEI: Roteador Huawei
- TP LINK: Roteador TP-Link

#### 4. Agendamento da Retirada

**Retirada Própria**
- Marque se cliente fará retirada
- Pula configuração de agendamento

**Agendamento de Retirada**
- **📅 Data**: Mínimo dia seguinte
- **⏰ Período**: Manhã ou Tarde

#### 5. Agendamento da Instalação
- **📅 Data**: Não pode ser antes da retirada
- **⏰ Período**: Manhã ou Tarde

#### 6. Detalhes Contratuais

**💰 Taxa de Mudança**
- **Renovação**: Isento automaticamente
- **Migração**: Isento automaticamente  
- **Normal**: R$ 50, 65 ou 100

**✍️ Assinatura**
- **Digital**: Cliente assina remotamente
- **Local**: Técnico coleta assinatura presencial

#### 7. Geração da O.S
1. Clique em **⚡ Gerar O.S**
2. Revise os dados gerados
3. Use os botões de cópia específicos:
   - **📤 Copiar Retirada**: Linha para agenda de retirada
   - **📥 Copiar Instalação**: Linha para agenda de instalação  
   - **📋 Copiar O.S**: Ordem de serviço completa

## 🎨 Personalizando a Interface

### Acessando Personalizações
1. Clique no botão **🌙** na parte inferior da barra lateral
2. Popup de personalização abre

### Opções Disponíveis

**🌙 Modo Escuro**
- Liga/desliga tema escuro
- Salvo automaticamente

**✨ Bordas Neon**
- Ativa efeitos luminosos
- Dá visual mais moderno

**🎯 Cor dos Ícones**
- Personaliza cor dos ícones da sidebar
- Clique no quadrado colorido para escolher

**🔲 Cor das Bordas**
- Define cor de bordas e botões
- Harmoniza com identidade visual

### Salvando Configurações
- Clique **💾 Salvar** para aplicar mudanças
- **❌ Cancelar** desfaz alterações
- Configurações são lembradas entre sessões

## 📱 Interface Responsiva

### Desktop (1024px+)
- Barra lateral expansível
- Grid de duas colunas
- Todos os recursos disponíveis

### Tablet (768px-1023px)  
- Barra lateral compacta
- Alguns elementos empilhados
- Funcionalidade completa

### Mobile (até 767px)
- Layout em coluna única
- Botões empilhados verticalmente
- Texto otimizado para toque

## ⚠️ Solução de Problemas

### PDF não Carrega
**Possíveis Causas:**
- Arquivo corrompido
- PDF escaneado (apenas imagem)
- Formato não suportado

**Soluções:**
- Verifique se é PDF com texto selecionável
- Tente outro arquivo
- Recarregue a página

### Dados não Salvam
**Possíveis Causas:**
- Conexão com Firebase instável
- Atendente não selecionado

**Soluções:**
- Verifique conexão com internet
- Reselecione o atendente
- Recarregue a página

### Interface Quebrada
**Possíveis Causas:**
- Cache do navegador desatualizado
- JavaScript desabilitado

**Soluções:**
- Limpe cache: Ctrl+F5
- Verifique se JavaScript está ativo
- Teste em modo incógnito

### Telefone Inválido
**Formato Correto:**
- (21) 99999-9999 (celular)
- (21) 2222-2222 (fixo)

**Dicas:**
- Sempre inclua DDD
- Use parênteses e hifens
- Sistema formata automaticamente

## 🔄 Atualizações

### Changelog do Sistema
- O sistema atualiza automaticamente
- Novas funcionalidades aparecem na interface
- Suas configurações são preservadas

### Feedback
- Reporte bugs ou sugestões
- Use canais de suporte disponíveis
- Participe do desenvolvimento!

## 📞 Suporte Técnico

**Em caso de dúvidas:**
- 📧 Email: suporte@ati.com
- 💬 Chat interno da equipe
- 📱 WhatsApp: +55 (21) 99999-9999

**Horário de Atendimento:**
- Segunda a Sexta: 8h às 18h
- Sábado: 8h às 12h
- Emergências: 24/7

---

**🎯 Sucesso nos seus atendimentos com o ATI!** 🚀