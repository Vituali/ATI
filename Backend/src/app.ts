import Fastify from 'fastify'
import { corsPlugin } from './plugins/cors.js'
import { authPlugin } from './plugins/auth.js'
import { healthRoutes } from './routes/health.js'
import { atendenteRoutes } from './routes/atendente.js'
import { modeloOSRoutes } from './routes/modelo-os.js'
import { quickReplyRoutes } from './routes/quick-reply.js'
import { chatRoutes } from './routes/chat.js'
import { anotacaoRoutes } from './routes/anotacao.js'
import { potenciaRoutes } from './routes/potencia.js'
import { avisoRoutes } from './routes/aviso.js'
import { bugRoutes } from './routes/bug.js'
import { configRoutes } from './routes/config.js'
import { logRoutes } from './routes/logs.js'
import { env } from './config/env.js'

export async function buildApp() {
  const fastify = Fastify({
    logger: env.NODE_ENV !== 'test',
  })

  await fastify.register(corsPlugin)
  await fastify.register(authPlugin)
  await fastify.register(healthRoutes)
  await fastify.register(atendenteRoutes)
  await fastify.register(modeloOSRoutes)
  await fastify.register(quickReplyRoutes)
  await fastify.register(chatRoutes)
  await fastify.register(anotacaoRoutes)
  await fastify.register(potenciaRoutes)
  await fastify.register(avisoRoutes)
  await fastify.register(bugRoutes)
  await fastify.register(configRoutes)
  await fastify.register(logRoutes)

  return fastify
}
