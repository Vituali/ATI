import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function anotacaoRoutes(fastify: FastifyInstance) {
  fastify.get('/api/anotacoes', { onRequest: [authenticate] }, async (request) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return []

    return prisma.anotacao.findMany({
      where: { atendenteId: atendente.id },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.post('/api/anotacoes', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    return prisma.anotacao.create({
      data: { ...(request.body as any), atendenteId: atendente.id },
    })
  })

  fastify.patch('/api/anotacoes/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }
    const anotacao = await prisma.anotacao.findUnique({ where: { id } })
    if (!anotacao || anotacao.atendenteId !== atendente.id) return reply.status(404).send({ error: 'Anotação não encontrada' })

    return prisma.anotacao.update({ where: { id }, data: request.body as any })
  })

  fastify.delete('/api/anotacoes/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }
    const anotacao = await prisma.anotacao.findUnique({ where: { id } })
    if (!anotacao || anotacao.atendenteId !== atendente.id) return reply.status(404).send({ error: 'Anotação não encontrada' })

    await prisma.anotacao.delete({ where: { id } })
    return { ok: true }
  })
}
