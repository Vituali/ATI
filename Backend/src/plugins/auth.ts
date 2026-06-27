import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as admin from 'firebase-admin'

let firebaseApp: admin.app.App | null = null

function getFirebaseApp() {
  if (!firebaseApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (clientEmail && privateKey) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      })
    } else {
      firebaseApp = admin.initializeApp({ projectId })
    }
  }
  return firebaseApp
}

export async function verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
  return getFirebaseApp().auth().verifyIdToken(token)
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token não fornecido' })
  }

  try {
    const token = authHeader.slice(7)
    const decoded = await verifyIdToken(token)
    request.user = decoded
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', authenticate)
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate
  }
  interface FastifyRequest {
    user?: admin.auth.DecodedIdToken
  }
}
