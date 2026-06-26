import { icon } from '../../utils/iconSvgs'

export type Role = 'usuario' | 'supervisor' | 'moderador' | 'admin'
export type Setor = 'geral' | 'ti' | 'financeiro' | 'suporte' | 'comercial'

export const SETOR_LABEL: Record<Setor, string> = {
  geral: 'Geral',
  ti: 'TI',
  financeiro: 'Financeiro',
  suporte: 'Suporte',
  comercial: 'Comercial',
}

export const ROOM_ICONS: Record<string, string> = {
  geral: icon.globe,
  ti: icon.wrench,
  financeiro: icon.dollarSign,
  suporte: icon.headphones,
  comercial: icon.handshake,
}
