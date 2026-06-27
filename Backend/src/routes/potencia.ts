import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function potenciaRoutes(fastify: FastifyInstance) {
  // ─── Listar histórico ──────────────────────────────────────

  fastify.get('/api/potencias', { onRequest: [authenticate] }, async (request) => {
    const query = request.query as {
      status?: string
      coletadoPor?: string
      clienteId?: string
      dataInicio?: string
      dataFim?: string
      limit?: string
      offset?: string
    }

    const where: any = {}

    if (query.status) where.status = query.status
    if (query.coletadoPor) where.coletadoPor = query.coletadoPor
    if (query.clienteId) where.clienteId = query.clienteId
    if (query.dataInicio || query.dataFim) {
      where.dataColeta = {}
      if (query.dataInicio) where.dataColeta.gte = new Date(query.dataInicio)
      if (query.dataFim) where.dataColeta.lte = new Date(query.dataFim)
    }

    return prisma.historicoPotencia.findMany({
      where,
      orderBy: { dataColeta: 'desc' },
      take: Number(query.limit) || 100,
      skip: Number(query.offset) || 0,
    })
  })

  fastify.get('/api/potencias/count', { onRequest: [authenticate] }, async (request) => {
    const query = request.query as { status?: string }
    const where: any = {}
    if (query.status) where.status = query.status
    return { count: await prisma.historicoPotencia.count({ where }) }
  })

  // ─── Atualizar status/retorno ──────────────────────────────

  fastify.patch('/api/potencias/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status, retornoData } = request.body as any

    const data: any = {}
    if (status !== undefined) { data.status = status; data.statusUpdatedAt = new Date() }
    if (retornoData !== undefined) data.retornoData = new Date(retornoData)

    const updated = await prisma.historicoPotencia.update({ where: { id }, data })
    return updated
  })

  fastify.delete('/api/potencias/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || (atendente.role !== 'admin' && atendente.role !== 'supervisor')) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const { id } = request.params as { id: string }
    await prisma.historicoPotencia.delete({ where: { id } })
    return { ok: true }
  })

  // ─── Resumo diário ─────────────────────────────────────────

  fastify.get('/api/potencias/resumo', { onRequest: [authenticate] }, async (request) => {
    const query = request.query as { data?: string; dataInicio?: string; dataFim?: string }

    const where: any = {}
    if (query.data) {
      const d = new Date(query.data)
      where.data = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) }
    }
    if (query.dataInicio) where.data = { ...where.data, gte: new Date(query.dataInicio) }
    if (query.dataFim) where.data = { ...where.data, lte: new Date(query.dataFim) }

    return prisma.resumoPotenciaDiario.findMany({
      where,
      orderBy: { data: 'desc' },
    })
  })
}
