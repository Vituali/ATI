import { lazy } from 'react'

export const RespostasRapidas = lazy(() => import('./app/operacao/RespostasRapidas'))
export const ModelosOS = lazy(() => import('./app/operacao/ModelosOS'))
export const Conversor = lazy(() => import('./app/operacao/Conversor'))
export const Senhas = lazy(() => import('./app/operacao/Senhas'))
export const Admin = lazy(() => import('./app/gestao/Admin'))
export const ChatInterno = lazy(() => import('./app/ChatInterno'))
export const Anotacoes = lazy(() => import('./app/meu_espaco/Anotacoes'))
export const Relatorios = lazy(() => import('./app/gestao/Relatorios'))
export const Jefferson = lazy(() => import('./app/custom/Jefferson'))
export const HeliRPG = lazy(() => import('./app/custom/HeliRPG'))
export const Biblioteca = lazy(() => import('./app/meu_espaco/Biblioteca'))
