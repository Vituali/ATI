import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function modeloOSRoutes(fastify: FastifyInstance) {
  // ─── Meus templates ────────────────────────────────────────

  fastify.get('/api/modelos-os', { onRequest: [authenticate] }, async (request) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return []

    return prisma.modeloOS.findMany({
      where: { atendenteId: atendente.id, isMaster: false },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    })
  })

  fastify.post('/api/modelos-os', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const data = request.body as any
    const createData: any = { ...data, atendenteId: atendente.id, isMaster: false }
    if (data.id) createData.id = data.id
    return prisma.modeloOS.create({ data: createData })
  })

  fastify.patch('/api/modelos-os/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }
    const modelo = await prisma.modeloOS.findUnique({ where: { id } })
    if (!modelo || modelo.atendenteId !== atendente.id) return reply.status(404).send({ error: 'Template não encontrado' })

    return prisma.modeloOS.update({ where: { id }, data: request.body as any })
  })

  fastify.put('/api/modelos-os/batch', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { items } = request.body as { items: any[] }

    await prisma.modeloOS.deleteMany({
      where: { atendenteId: atendente.id, isMaster: false },
    })

    for (const item of items) {
      await prisma.modeloOS.create({
        data: {
          id: item.id || undefined,
          atendenteId: atendente.id,
          isMaster: false,
          category: item.category || '',
          title: item.title || '',
          text: item.text || '',
          occurrenceTypeId: item.occurrenceTypeId || null,
          occurrenceTypeName: item.occurrenceTypeName || null,
          occurrenceTypeId53: item.occurrenceTypeId_53 || null,
          keywords: item.keywords || [],
        },
      })
    }

    return { ok: true }
  })

  fastify.delete('/api/modelos-os/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { id } = request.params as { id: string }
    const modelo = await prisma.modeloOS.findUnique({ where: { id } })
    if (!modelo || modelo.atendenteId !== atendente.id) return reply.status(404).send({ error: 'Template não encontrado' })

    await prisma.modeloOS.delete({ where: { id } })
    return { ok: true }
  })

  // ─── Sincronizar masters ───────────────────────────────────

  fastify.post('/api/modelos-os/sync-masters', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const masters = await prisma.modeloOS.findMany({ where: { isMaster: true } })
    let criados = 0
    let atualizados = 0

    for (const master of masters) {
      const existente = await prisma.modeloOS.findFirst({
        where: { atendenteId: atendente.id, masterId: master.id },
      })

      if (existente) {
        await prisma.modeloOS.update({
          where: { id: existente.id },
          data: {
            title: master.title,
            text: master.text,
            category: master.category,
            occurrenceTypeId: master.occurrenceTypeId,
            occurrenceTypeName: master.occurrenceTypeName,
            occurrenceTypeId53: master.occurrenceTypeId53,
            keywords: master.keywords,
          },
        })
        atualizados++
      } else {
        await prisma.modeloOS.create({
          data: {
            atendenteId: atendente.id,
            masterId: master.id,
            isMaster: false,
            category: master.category,
            title: master.title,
            text: master.text,
            occurrenceTypeId: master.occurrenceTypeId,
            occurrenceTypeName: master.occurrenceTypeName,
            occurrenceTypeId53: master.occurrenceTypeId53,
            keywords: master.keywords,
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

  fastify.get('/api/modelos-os/master', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })
    return prisma.modeloOS.findMany({ where: { isMaster: true }, orderBy: { category: 'asc' } })
  })

  fastify.post('/api/modelos-os/master', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })

    const modelo = await prisma.modeloOS.create({
      data: { ...(request.body as any), isMaster: true },
    })

    await prisma.auditLog.create({
      data: {
        atendenteId: (await prisma.atendente.findUnique({ where: { uid: request.user!.uid } }))!.id,
        acao: 'criar_modelo_master',
        entidade: 'modelo_os',
        entidadeId: modelo.id,
      },
    })

    return modelo
  })

  fastify.patch('/api/modelos-os/master/:id', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const modelo = await prisma.modeloOS.findUnique({ where: { id } })
    if (!modelo || !modelo.isMaster) return reply.status(404).send({ error: 'Master não encontrado' })

    return prisma.modeloOS.update({ where: { id }, data: request.body as any })
  })

  fastify.delete('/api/modelos-os/master/:id', { onRequest: [authenticate] }, async (request, reply) => {
    if (!(await isAdmin(request.user!.uid))) return reply.status(403).send({ error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const modelo = await prisma.modeloOS.findUnique({ where: { id } })
    if (!modelo || !modelo.isMaster) return reply.status(404).send({ error: 'Master não encontrado' })

    await prisma.modeloOS.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        atendenteId: (await prisma.atendente.findUnique({ where: { uid: request.user!.uid } }))!.id,
        acao: 'remover_modelo_master',
        entidade: 'modelo_os',
        entidadeId: id,
      },
    })

    return { ok: true }
  })
}
