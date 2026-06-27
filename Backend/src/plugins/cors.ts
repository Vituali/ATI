import type { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://201.158.20.35:3000',
      'http://201.158.20.35:8000',
    ],
    credentials: true,
  })
}
