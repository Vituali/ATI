import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function logRoutes(fastify: FastifyInstance) {
  // ─── Registrar uso de template ─────────────────────────────

  fastify.post('/api/uso-template', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { modeloOsId, quickReplyId } = request.body as { modeloOsId?: string; quickReplyId?: string }

    const log = await prisma.usoTemplate.create({
      data: { atendenteId: atendente.id, modeloOsId: modeloOsId || null, quickReplyId: quickReplyId || null },
    })

    // Incrementa contador
    if (modeloOsId) {
      await prisma.modeloOS.update({ where: { id: modeloOsId }, data: { usoCount: { increment: 1 } } })
    }
    if (quickReplyId) {
      await prisma.quickReply.update({ where: { id: quickReplyId }, data: { usoCount: { increment: 1 } } })
    }

    return log
  })

  // ─── Auditoria (admin) ─────────────────────────────────────

  fastify.get('/api/auditoria', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    const query = request.query as {
      acao?: string
      entidade?: string
      dataInicio?: string
      dataFim?: string
      limit?: string
    }

    const where: any = {}
    if (query.acao) where.acao = query.acao
    if (query.entidade) where.entidade = query.entidade
    if (query.dataInicio || query.dataFim) {
      where.createdAt = {}
      if (query.dataInicio) where.createdAt.gte = new Date(query.dataInicio)
      if (query.dataFim) where.createdAt.lte = new Date(query.dataFim)
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(query.limit) || 200,
      include: { atendente: { select: { nomeCompleto: true, username: true } } },
    })
  })

  // ─── Sessões (admin/reports) ───────────────────────────────

  fastify.get('/api/sessoes', { onRequest: [authenticate] }, async (request, reply) => {
    const query = request.query as { dataInicio?: string; dataFim?: string; limit?: string }

    const where: any = {}
    if (query.dataInicio || query.dataFim) {
      where.loginAt = {}
      if (query.dataInicio) where.loginAt.gte = new Date(query.dataInicio)
      if (query.dataFim) where.loginAt.lte = new Date(query.dataFim)
    }

    return prisma.sessaoAtendente.findMany({
      where,
      orderBy: { loginAt: 'desc' },
      take: Number(query.limit) || 200,
      include: { atendente: { select: { nomeCompleto: true, username: true, setor: true } } },
    })
  })
}
