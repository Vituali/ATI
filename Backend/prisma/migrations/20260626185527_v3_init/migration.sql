-- CreateTable
CREATE TABLE "Atendente" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'usuario',
    "setor" TEXT NOT NULL DEFAULT 'geral',
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "sgpUsername" TEXT,
    "avatarUrl" TEXT,
    "customBg" TEXT,
    "customAllowedSections" TEXT[],
    "ultimoAcesso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Atendente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoAtendente" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "ip" TEXT,

    CONSTRAINT "SessaoAtendente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeloOS" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT,
    "masterId" TEXT,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "occurrenceTypeId" TEXT,
    "occurrenceTypeName" TEXT,
    "occurrenceTypeId53" TEXT,
    "keywords" TEXT[],
    "usoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloOS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickReply" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT,
    "masterId" TEXT,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'quick_reply',
    "subCategory" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "usoCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaOrdem" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "ordem" TEXT[],

    CONSTRAINT "CategoriaOrdem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anotacao" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "titulo" TEXT,
    "texto" TEXT NOT NULL,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "ultimaMensagem" JSONB,
    "ultimaAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensagem" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorNome" TEXT NOT NULL,
    "autorSetor" TEXT,
    "autorAvatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeituraMensagem" (
    "mensagemId" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "lidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeituraMensagem_pkey" PRIMARY KEY ("mensagemId","atendenteId")
);

-- CreateTable
CREATE TABLE "HistoricoPotencia" (
    "id" TEXT NOT NULL,
    "olt" TEXT NOT NULL,
    "pon" TEXT NOT NULL,
    "vlan" TEXT,
    "clienteId" TEXT NOT NULL,
    "rx" TEXT,
    "tx" TEXT,
    "rxOlt" TEXT,
    "login" TEXT,
    "contrato" TEXT,
    "nome" TEXT,
    "bairro" TEXT,
    "endereco" TEXT,
    "servicoId" TEXT,
    "contratoId" TEXT,
    "serviceUrl" TEXT,
    "status" TEXT,
    "statusUpdatedAt" TIMESTAMP(3),
    "retornoData" TIMESTAMP(3),
    "coletadoPor" TEXT,
    "dataColeta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPotencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumoPotenciaDiario" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "totalRegistros" INTEGER NOT NULL,
    "statusNormal" INTEGER NOT NULL,
    "statusAlerta" INTEGER NOT NULL,
    "statusCritico" INTEGER NOT NULL,
    "coletadoPor" TEXT,

    CONSTRAINT "ResumoPotenciaDiario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsoTemplate" (
    "id" TEXT NOT NULL,
    "modeloOsId" TEXT,
    "quickReplyId" TEXT,
    "atendenteId" TEXT NOT NULL,
    "usadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "atendenteId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'info',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pagina" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Atendente_username_key" ON "Atendente"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Atendente_email_key" ON "Atendente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Atendente_uid_key" ON "Atendente"("uid");

-- CreateIndex
CREATE INDEX "Atendente_setor_status_idx" ON "Atendente"("setor", "status");

-- CreateIndex
CREATE INDEX "Atendente_role_idx" ON "Atendente"("role");

-- CreateIndex
CREATE INDEX "SessaoAtendente_atendenteId_loginAt_idx" ON "SessaoAtendente"("atendenteId", "loginAt");

-- CreateIndex
CREATE INDEX "SessaoAtendente_loginAt_idx" ON "SessaoAtendente"("loginAt");

-- CreateIndex
CREATE INDEX "ModeloOS_atendenteId_category_idx" ON "ModeloOS"("atendenteId", "category");

-- CreateIndex
CREATE INDEX "ModeloOS_isMaster_idx" ON "ModeloOS"("isMaster");

-- CreateIndex
CREATE INDEX "ModeloOS_masterId_idx" ON "ModeloOS"("masterId");

-- CreateIndex
CREATE INDEX "QuickReply_atendenteId_subCategory_idx" ON "QuickReply"("atendenteId", "subCategory");

-- CreateIndex
CREATE INDEX "QuickReply_isMaster_idx" ON "QuickReply"("isMaster");

-- CreateIndex
CREATE INDEX "QuickReply_masterId_idx" ON "QuickReply"("masterId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaOrdem_atendenteId_key" ON "CategoriaOrdem"("atendenteId");

-- CreateIndex
CREATE INDEX "Mensagem_chatRoomId_createdAt_idx" ON "Mensagem"("chatRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "Mensagem_atendenteId_createdAt_idx" ON "Mensagem"("atendenteId", "createdAt");

-- CreateIndex
CREATE INDEX "Mensagem_createdAt_idx" ON "Mensagem"("createdAt");

-- CreateIndex
CREATE INDEX "HistoricoPotencia_dataColeta_status_idx" ON "HistoricoPotencia"("dataColeta", "status");

-- CreateIndex
CREATE INDEX "HistoricoPotencia_clienteId_dataColeta_idx" ON "HistoricoPotencia"("clienteId", "dataColeta");

-- CreateIndex
CREATE INDEX "HistoricoPotencia_coletadoPor_dataColeta_idx" ON "HistoricoPotencia"("coletadoPor", "dataColeta");

-- CreateIndex
CREATE INDEX "HistoricoPotencia_dataColeta_idx" ON "HistoricoPotencia"("dataColeta");

-- CreateIndex
CREATE INDEX "ResumoPotenciaDiario_data_idx" ON "ResumoPotenciaDiario"("data");

-- CreateIndex
CREATE UNIQUE INDEX "ResumoPotenciaDiario_data_coletadoPor_key" ON "ResumoPotenciaDiario"("data", "coletadoPor");

-- CreateIndex
CREATE INDEX "UsoTemplate_usadoEm_idx" ON "UsoTemplate"("usadoEm");

-- CreateIndex
CREATE INDEX "UsoTemplate_modeloOsId_usadoEm_idx" ON "UsoTemplate"("modeloOsId", "usadoEm");

-- CreateIndex
CREATE INDEX "UsoTemplate_quickReplyId_usadoEm_idx" ON "UsoTemplate"("quickReplyId", "usadoEm");

-- CreateIndex
CREATE INDEX "AuditLog_atendenteId_createdAt_idx" ON "AuditLog"("atendenteId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_acao_createdAt_idx" ON "AuditLog"("acao", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Aviso_ativo_createdAt_idx" ON "Aviso"("ativo", "createdAt");

-- CreateIndex
CREATE INDEX "BugReport_status_createdAt_idx" ON "BugReport"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracao_chave_key" ON "Configuracao"("chave");

-- AddForeignKey
ALTER TABLE "SessaoAtendente" ADD CONSTRAINT "SessaoAtendente_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeloOS" ADD CONSTRAINT "ModeloOS_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickReply" ADD CONSTRAINT "QuickReply_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaOrdem" ADD CONSTRAINT "CategoriaOrdem_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anotacao" ADD CONSTRAINT "Anotacao_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraMensagem" ADD CONSTRAINT "LeituraMensagem_mensagemId_fkey" FOREIGN KEY ("mensagemId") REFERENCES "Mensagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraMensagem" ADD CONSTRAINT "LeituraMensagem_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoTemplate" ADD CONSTRAINT "UsoTemplate_modeloOsId_fkey" FOREIGN KEY ("modeloOsId") REFERENCES "ModeloOS"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoTemplate" ADD CONSTRAINT "UsoTemplate_quickReplyId_fkey" FOREIGN KEY ("quickReplyId") REFERENCES "QuickReply"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoTemplate" ADD CONSTRAINT "UsoTemplate_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
