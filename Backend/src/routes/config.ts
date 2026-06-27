import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function configRoutes(fastify: FastifyInstance) {
  fastify.get('/api/config/:chave', { onRequest: [authenticate] }, async (request, reply) => {
    const { chave } = request.params as { chave: string }
    const cfg = await prisma.configuracao.findUnique({ where: { chave } })
    if (!cfg) return reply.status(404).send({ error: 'Configuração não encontrada' })
    return cfg
  })

  fastify.put('/api/config/:chave', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    const { chave } = request.params as { chave: string }
    const { valor } = request.body as { valor: any }

    const cfg = await prisma.configuracao.upsert({
      where: { chave },
      create: { chave, valor },
      update: { valor },
    })

    await prisma.auditLog.create({
      data: {
        atendenteId: atendente.id,
        acao: 'alterar_config',
        entidade: 'configuracao',
        entidadeId: chave,
      },
    })

    return cfg
  })
}
