import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function avisoRoutes(fastify: FastifyInstance) {
  fastify.get('/api/avisos', { onRequest: [authenticate] }, async () => {
    return prisma.aviso.findMany({
      where: { ativo: true },
      orderBy: { createdAt: 'desc' },
      include: { autor: { select: { nomeCompleto: true, username: true } } },
    })
  })

  fastify.post('/api/avisos', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || (atendente.role !== 'admin' && atendente.role !== 'supervisor')) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const aviso = await prisma.aviso.create({
      data: { ...(request.body as any), autorId: atendente.id },
    })

    await prisma.auditLog.create({
      data: {
        atendenteId: atendente.id,
        acao: 'criar_aviso',
        entidade: 'aviso',
        entidadeId: aviso.id,
      },
    })

    return aviso
  })

  fastify.patch('/api/avisos/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || (atendente.role !== 'admin' && atendente.role !== 'supervisor')) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const { id } = request.params as { id: string }
    return prisma.aviso.update({ where: { id }, data: request.body as any })
  })

  fastify.delete('/api/avisos/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || (atendente.role !== 'admin' && atendente.role !== 'supervisor')) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const { id } = request.params as { id: string }
    await prisma.aviso.delete({ where: { id } })
    return { ok: true }
  })
}
