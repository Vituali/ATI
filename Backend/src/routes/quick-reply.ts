import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function quickReplyRoutes(fastify: FastifyInstance) {
  // ─── Minhas respostas ──────────────────────────────────────

  fastify.get('/api/respostas', { onRequest: [authenticate] }, async (request) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return []

    return prisma.quickReply.findMany({
      where: { atendenteId: atendente.id, isMaster: false },
      orderBy: [{ subCategory: 'asc' }, { ordem: 'asc' }],
    })
  })

  fastify.post('/api/respostas', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const data = request.body as any
    if (data.id) {
      return prisma.quickReply.create({
        data: { ...data, atendenteId: atendente.id, isMaster: false },
      })
    }
    return prisma.quickReply.create({
      data: { ...data, atendenteId: atendente.id, isMaster: false },
    })
  })

  fastify.put('/api/respostas/batch', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { items } = request.body as { items: any[] }

    await prisma.quickReply.deleteMany({
      where: { atendenteId: atendente.id, isMaster: false },
    })

    if (items.length > 0) {
      await prisma.quickReply.createMany({
        data: items.map((item) => ({
          atendenteId: atendente.id,
          isMaster: false,
          category: item.category || 'quick_reply',
          subCategory: item.subCategory || '',
          title: item.title || '',
          text: item.text || '',
        })),
      })
    }

    return { ok: true }
  })

  fastify.patch('/api/respostas/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }
    const replyRecord = await prisma.quickReply.findUnique({ where: { id } })
    if (!replyRecord || replyRecord.atendenteId !== atendente.id) return reply.status(404).send({ error: 'Resposta não encontrada' })

    return prisma.quickReply.update({ where: { id }, data: request.body as any })
  })

  fastify.delete('/api/respostas/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }
    const replyRecord = await prisma.quickReply.findUnique({ where: { id } })
    if (!replyRecord || replyRecord.atendenteId !== atendente.id) return reply.status(404).send({ error: 'Resposta não encontrada' })

    await prisma.quickReply.delete({ where: { id } })
    return { ok: true }
  })

  // ─── Ordem das categorias ──────────────────────────────────

  fastify.get('/api/respostas/categorias-ordem', { onRequest: [authenticate] }, async (request) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return { ordem: [] }

    const catOrdem = await prisma.categoriaOrdem.findUnique({ where: { atendenteId: atendente.id } })
    return catOrdem ?? { ordem: [] }
  })

  fastify.put('/api/respostas/categorias-ordem', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { ordem } = request.body as { ordem: string[] }
    return prisma.categoriaOrdem.upsert({
      where: { atendenteId: atendente.id },
      create: { atendenteId: atendente.id, ordem },
      update: { ordem },
    })
  })

  // ─── Sincronizar masters ───────────────────────────────────

  fastify.post('/api/respostas/sync-masters', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const masters = await prisma.quickReply.findMany({ where: { isMaster: true } })
    let criados = 0
    let atualizados = 0

    for (const master of masters) {
      const existente = await prisma.quickReply.findFirst({
        where: { atendenteId: atendente.id, masterId: master.id },
      })

      if (existente) {
        await prisma.quickReply.update({
          where: { id: existente.id },
          data: {
            category: master.category,
            subCategory: master.subCategory,
            title: master.title,
            text: master.text,
          },
        })
        atualizados++
      } else {
        await prisma.quickReply.create({
          data: {
            atendenteId: atendente.id,
            masterId: master.id,
            isMaster: false,
            category: master.category,
            subCategory: master.subCategory,
            title: master.title,
            text: master.text,
            ordem: master.ordem,
          },
        })
        criados++
      }
    }

    return { criados, atualizados, total: masters.length }
  })

  // ─── Masters (admin/supervisor) ────────────────────────────

  async function isAdmin(uid: string) {
    const a = await prisma.atendente.findUnique({ where: { uid } })
    return a && (a.role === 'admin' || a.role === 'supervisor')
  }

  fastify.get('/api/respostas/master', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })
    return prisma.quickReply.findMany({ where: { isMaster: true }, orderBy: { subCategory: 'asc' } })
  })

  fastify.post('/api/respostas/master', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })

    return prisma.quickReply.create({
      data: { ...(request.body as any), isMaster: true },
    })
  })

  fastify.patch('/api/respostas/master/:id', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const replyRecord = await prisma.quickReply.findUnique({ where: { id } })
    if (!replyRecord || !replyRecord.isMaster) return reply.status(404).send({ error: 'Master não encontrado' })

    return prisma.quickReply.update({ where: { id }, data: request.body as any })
  })

  fastify.delete('/api/respostas/master/:id', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const replyRecord = await prisma.quickReply.findUnique({ where: { id } })
    if (!replyRecord || !replyRecord.isMaster) return reply.status(404).send({ error: 'Master não encontrado' })

    await prisma.quickReply.delete({ where: { id } })
    return { ok: true }
  })
}
