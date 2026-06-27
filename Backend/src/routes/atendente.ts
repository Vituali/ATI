import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../plugins/auth.js'

export async function atendenteRoutes(fastify: FastifyInstance) {
  // ─── Registro (sem auth — usuário ainda não logado no backend) ──

  fastify.post('/api/atendentes/register', async (request, reply) => {
    const { username, uid, email, nomeCompleto, role, setor, status } = request.body as any

    const existente = await prisma.atendente.findUnique({ where: { username } })
    if (existente) return reply.status(409).send({ error: 'Este nome de usuário já está em uso.' })

    return prisma.atendente.create({
      data: { username, uid, email, nomeCompleto, role, setor, status },
    })
  })

  // ─── Perfil próprio ────────────────────────────────────────

  fastify.get('/api/atendentes/me', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })
    return atendente
  })

  fastify.patch('/api/atendentes/me', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const { nomeCompleto, avatarUrl, customBg, customAllowedSections, sgpUsername } = request.body as any
    const updated = await prisma.atendente.update({
      where: { id: atendente.id },
      data: { nomeCompleto, avatarUrl, customBg, customAllowedSections, sgpUsername },
    })
    return updated
  })

  // ─── Admin: gerenciar atendentes ───────────────────────────

  fastify.get('/api/atendentes', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    return prisma.atendente.findMany({ orderBy: { username: 'asc' } })
  })

  fastify.patch('/api/atendentes/:id', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente || atendente.role !== 'admin') return reply.status(403).send({ error: 'Acesso negado' })

    const { id } = request.params as { id: string }
    const { role, setor, status, nomeCompleto, sgpUsername, customAllowedSections } = request.body as any

    const updated = await prisma.atendente.update({
      where: { id },
      data: { role, setor, status, nomeCompleto, sgpUsername, customAllowedSections },
    })

    await prisma.auditLog.create({
      data: {
        atendenteId: atendente.id,
        acao: 'alterar_perfil',
        entidade: 'atendente',
        entidadeId: id,
        detalhes: { role, setor, status },
      },
    })

    return updated
  })

  // ─── Sessões ───────────────────────────────────────────────

  fastify.post('/api/sessoes', { onRequest: [authenticate] }, async (request, reply) => {
    const atendente = await prisma.atendente.findUnique({ where: { uid: request.user!.uid } })
    if (!atendente) return reply.status(404).send({ error: 'Atendente não encontrado' })

    const ip = request.headers['x-forwarded-for'] as string || request.ip

    const sessao = await prisma.sessaoAtendente.create({
      data: { atendenteId: atendente.id, ip },
    })

    await prisma.atendente.update({
      where: { id: atendente.id },
      data: { ultimoAcesso: new Date() },
    })

    return sessao
  })

  fastify.patch('/api/sessoes/:id/logout', { onRequest: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.sessaoAtendente.update({
      where: { id },
      data: { logoutAt: new Date() },
    })
    return { ok: true }
  })
}
