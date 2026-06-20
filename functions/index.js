const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa a instância admin do Firebase para acessar o banco e autenticação locais/nuvem
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
admin.initializeApp({
  databaseURL: isEmulator
    ? "https://site-ati-75d83.firebaseio.com"
    : "https://site-ati-75d83-default-rtdb.firebaseio.com"
});

/**
 * 1. API HTTP de Exemplo (GET / POST)
 * Pode ser acessada via URL no navegador ou pelo fetch() no Site/Extensão.
 * Local URL: http://127.0.0.1:5001/site-ati-75d83/us-central1/olaMundo
 */
const ALLOWED_ORIGINS = [
  "https://vituali.github.io",
  "https://site-ati-75d83.web.app",
  "https://site-ati-75d83.firebaseapp.com",
  "http://201.158.20.35:8000",
  "http://201.158.20.53:8000",
];

exports.olaMundo = onRequest({ cors: ALLOWED_ORIGINS }, (req, res) => {
  logger.info("A API olaMundo foi chamada com sucesso!", { structuredData: true });
  res.json({
    ok: true,
    mensagem: "Olá do backend local do ATI!",
    timestamp: Date.now(),
  });
});

/**
 * 3. Rota para Receber Dados de Potência (POST)
 * Recebe a lista extraída pela extensão (ou script de teste) e salva no Firebase
 * Local URL: http://127.0.0.1:5001/site-ati-75d83/us-central1/receberDadosPotencia
 */
exports.receberDadosPotencia = onRequest({ cors: ALLOWED_ORIGINS }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido");
  }

  const { atendente, dados } = req.body;

  if (!dados || !Array.isArray(dados)) {
    return res.status(400).json({ error: "Dados inválidos ou vazios." });
  }

  const db = admin.database();
  const timestamp = Date.now();

  try {
    const updates = {};
    dados.forEach((cliente) => {
      // Garante que a chave do banco não tenha caracteres proibidos (como pontos ou barras)
      const uniqueId = `${cliente.olt}_${cliente.pon}_${cliente.id}`.replace(/[.$#[\]/]/g, "_");
      
      updates[`historico_potencias/${uniqueId}`] = {
        olt: cliente.olt ?? "",
        pon: cliente.pon ?? "",
        vlan: cliente.vlan ?? "",
        id: cliente.id ?? "",
        rx: cliente.rx ?? "",
        tx: cliente.tx ?? "",
        rxOlt: cliente.rxOlt ?? "",
        dataColeta: timestamp,
        login: cliente.login ?? "",
        contrato: cliente.contrato ?? "",
        nome: cliente.nome ?? "",
        bairro: cliente.bairro ?? "",
        endereco: cliente.endereco ?? "",
        status: cliente.status ?? "",
        coletadoPor: atendente ?? "sistema",
        servicoId: cliente.servicoId ?? "",
        contratoId: cliente.contratoId ?? "",
        serviceUrl: cliente.serviceUrl ?? ""
      };

      // Salva no cache de clientes permanente se tiver bairro ou endereço
      if (cliente.id && (cliente.bairro || cliente.endereco)) {
        updates[`clientes_cadastro/${cliente.id}`] = {
          bairro: cliente.bairro ?? "",
          endereco: cliente.endereco ?? "",
          nome: cliente.nome ?? "",
          login: cliente.login ?? "",
          contrato: cliente.contrato ?? "",
          servicoId: cliente.servicoId ?? "",
          contratoId: cliente.contratoId ?? "",
          serviceUrl: cliente.serviceUrl ?? "",
          updatedAt: timestamp
        };
      }
    });

    await db.ref().update(updates);
    logger.info(`Processados ${dados.length} registros de potência enviados por ${atendente}`);
    
    res.json({ ok: true, processados: dados.length });
  } catch (error) {
    logger.error("Erro ao salvar dados de potência:", error);
    res.status(500).json({ error: error.message });
  }
});
