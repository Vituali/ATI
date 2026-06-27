import type { FastifyInstance } from 'fastify'

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/api/health', async () => {
    return {
      ok: true,
      name: 'ATI API',
      version: '3.0.0',
      timestamp: Date.now(),
      uptime: process.uptime(),
    }
  })
}
