// Padrões de mensagens de sistema para ignorar
export const SYSTEM_PATTERNS = [
  // Transferências e atribuições
  /atendimento transferido/i,
  /atendimento retornado/i,
  /atendimento atribuído/i,
  /transferiu manualmente/i,
  /atendimento está marcado de verde/i,
  // Automação — mensagens de bot
  /será gerenciado pela automação/i,
  /ação automática de encerramento/i,
  /percebi que você não selecionou/i,
  /bom.*vi que você ainda não selecionou/i,
  /nosso horário de atendimento/i,
  /nosso atendimento funciona de/i,
  /espero ter ajudado/i,
  /expediente encerrou/i,
  // Menu do bot
  /seja muito bem-vindo ao atendimento automatizado/i,
  /por favor, digite uma opção válida/i,
  /por favor informe o seu cpf/i,
  /digite o número da opção/i,
  /escolha uma das opções abaixo/i,
  /digite voltar ou encerrar/i,
  /retornar ao menu/i,
  // Respostas automáticas de suporte
  /no aparelho da fibra óptica/i,
  /se power estiver apagado/i,
  /se los estiver vermelho/i,
  // Outros
  /atendimento finalizado/i,
  /bom dia, (?!cliente)/i,
  /boa tarde, (?!cliente)/i,
  /boa noite, (?!cliente)/i,
]
