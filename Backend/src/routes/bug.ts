import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function bugRoutes(fastify: FastifyInstance) {
  fastify.post('/api/bugs', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    return prisma.bugReport.create({
      data: { ...(request.body as any), autorId: atendente.id },
    })
  })

  fastify.get('/api/bugs', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    const query = request.query as { status?: string }
    const where: any = {}
    if (query.status) where.status = query.status

    return prisma.bugReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { nomeCompleto: true, username: true } } },
    })
  })

  fastify.patch('/api/bugs/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const bug = await prisma.bugReport.update({ where: { id }, data: request.body as any })

    await prisma.auditLog.create({
      data: {
        atendenteId: atendente.id,
        acao: 'alterar_bug_status',
        entidade: 'bug',
        entidadeId: id,
        detalhes: { novoStatus: (request.body as any).status },
      },
    })

    return bug
  })
}
