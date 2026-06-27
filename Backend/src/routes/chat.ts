import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function chatRoutes(fastify: FastifyInstance) {
  // ─── Listar salas ──────────────────────────────────────────

  fastify.get('/api/chat/salas', { onRequest: [authenticate] }, async () => {
    return prisma.chatRoom.findMany({ orderBy: { id: 'asc' } })
  })

  // ─── Mensagens de uma sala ─────────────────────────────────

  fastify.get('/api/chat/salas/:room/mensagens', { onRequest: [authenticate] }, async (request) => {
    const { room } = request.params as { room: string }

    return prisma.mensagem.findMany({
      where: { chatRoomId: room },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
  })

  fastify.post('/api/chat/salas/:room/mensagens', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { room } = request.params as { room: string }
    const { texto } = request.body as { texto: string }

    if (!texto?.trim()) return reply.status(400).send({ error: 'Texto obrigatório' })
    if (texto.length > 500) return reply.status(400).send({ error: 'Máximo 500 caracteres' })

    // Garante que a sala existe
    await prisma.chatRoom.upsert({
      where: { id: room },
      create: { id: room },
      update: {},
    })

    const mensagem = await prisma.mensagem.create({
      data: {
        atendenteId: atendente.id,
        chatRoomId: room,
        texto: texto.trim(),
        autorNome: atendente.nomeCompleto,
        autorSetor: atendente.setor,
        autorAvatar: atendente.avatarUrl,
      },
    })

    await prisma.chatRoom.update({
      where: { id: room },
      data: {
        ultimaMensagem: { autor: atendente.username, timestamp: Date.now() },
        ultimaAtualizacao: new Date(),
      },
    })

    return mensagem
  })

  // ─── Limpar sala (admin) ───────────────────────────────────

  fastify.delete('/api/chat/salas/:room/mensagens', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    const { room } = request.params as { room: string }

    await prisma.mensagem.deleteMany({ where: { chatRoomId: room } })
    await prisma.chatRoom.update({
      where: { id: room },
      data: { ultimaAtualizacao: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        atendenteId: atendente.id,
        acao: 'limpar_chat',
        entidade: 'chat',
        entidadeId: room,
      },
    })

    return { ok: true }
  })

  // ─── Marcar mensagem como lida ─────────────────────────────

  fastify.post('/api/chat/mensagens/:id/leitura', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }

    await prisma.leituraMensagem.upsert({
      where: { mensagemId_atendenteId: { mensagemId: id, atendenteId: atendente.id } },
      create: { mensagemId: id, atendenteId: atendente.id },
      update: { lidaEm: new Date() },
    })

    return { ok: true }
  })
}
