// pages/Admin.tsx
// ---------------------------------------------------------------
// Painel de administração — gerencia usuários do sistema.
// Só acessível para role "admin" (protegido no Sidebar + App).
// Dados vêm do Firebase Realtime DB em /atendentes.
// ---------------------------------------------------------------

import { useState, useEffect } from 'react'
import { ref, get, set, update } from 'firebase/database'
import { db } from '../../../services/firebase'
import { Role, Setor, Section, getRoleLabel, getSetorLabel, getSetorPermissions, getSectionLabel } from '../../../services/permissions'
import './Admin.css'
import LoadingOverlay from '../../../components/ui/LoadingOverlay'
import PainelAvisos from '../../../components/app/PainelAvisos'
import { useUser } from '../../../hooks/useUser'
import type { UserProfile } from '../../../hooks/useUser'
import { useNotification } from '../../../hooks/useNotification'
import { ArrowUp, ArrowDown, ArrowUpDown, Shield, Save, Users, Megaphone, Bug, ClipboardList, RefreshCw, Circle } from 'lucide-react'

// ---------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------

interface Atendente {
  username: string // chave do nó no banco
  uid: string
  email: string
  nomeCompleto: string
  role: Role
  setor: Setor
  status: 'ativo' | 'inativo'
  sgpUsername?: string
  customAllowedSections?: Section[]
}

type SortField = 'username' | 'sgpUsername' | 'nomeCompleto' | 'setor' | 'role' | 'status'

// ---------------------------------------------------------------
// CONSTANTES
// ---------------------------------------------------------------

const ROLES: Role[] = ['usuario', 'supervisor', 'moderador', 'admin']
const SETORES: Setor[] = ['geral', 'ti', 'financeiro', 'suporte', 'comercial']
const SECTIONS: Section[] = ['home', 'respostas_rapidas', 'chat_interno', 'anotacoes', 'modelos_os', 'conversor', 'senhas', 'relatorios', 'admin', 'jefferson', 'heli', 'biblioteca']

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
}

// ---------------------------------------------------------------
// COMPONENTE
// ---------------------------------------------------------------

export default function Admin() {
  const [atendentes, setAtendentes] = useState<Atendente[]>([])
  const [loading, setLoading] = useState(true)
  const [atendentePermissoes, setAtendentePermissoes] = useState<Atendente | null>(null)

  const [salvando, setSalvando] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [sortField, setSortField] = useState<SortField>('username')
  const [sortAsc, setSortAsc] = useState(true)
  const { notify, confirm } = useNotification()

  const [abaAdmin, setAbaAdmin] = useState<'usuarios' | 'avisos' | 'bugs'>('usuarios')
  const [bugs, setBugs] = useState<any[]>([])
  const [carregandoBugs, setCarregandoBugs] = useState(false)
  const { user } = useUser() as { user: UserProfile | null }

  // Carrega atendentes e bugs ao montar
  useEffect(() => {
    carregarAtendentes()
    carregarBugs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarAtendentes() {
    setLoading(true)
    try {
      const snap = await get(ref(db, 'atendentes'))
      if (!snap.exists()) {
        setAtendentes([])
        return
      }

      const lista: Atendente[] = []
      snap.forEach((child) => {
        const d = child.val()
        lista.push({
          username: child.key!,
          uid: d.uid ?? '',
          email: d.email ?? '',
          nomeCompleto: d.nomeCompleto ?? '',
          role: d.role ?? 'usuario',
          setor: d.setor ?? 'ti',
          status: d.status ?? 'ativo',
          sgpUsername: d.sgpUsername ?? d.sgpusername ?? '',
          customAllowedSections: d.customAllowedSections || [],
        })
      })

      setAtendentes(lista)
    } catch (e: any) {
      notify('Erro ao carregar usuários: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load bugs
  useEffect(() => {
    if (abaAdmin === 'bugs') carregarBugs()
  }, [abaAdmin])

  async function carregarBugs() {
    setCarregandoBugs(true)
    try {
      const snap = await get(ref(db, 'bugs'))
      if (snap.exists()) {
        const list: any[] = []
        snap.forEach((c) => {
          list.push({ id: c.key, ...c.val() })
        })
        setBugs(list.reverse()) // Mais recentes primeiro
      } else {
        setBugs([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCarregandoBugs(false)
    }
  }

  async function handleStatusBug(bugId: string, novoStatus: string) {
    try {
      await set(ref(db, `bugs/${bugId}/status`), novoStatus)
      setBugs((prev) => prev.map((b) => (b.id === bugId ? { ...b, status: novoStatus } : b)))
      notify('Status do bug atualizado com sucesso!', 'success')
    } catch (e: any) {
      notify('Erro ao atualizar bug: ' + e.message, 'error')
    }
  }

  // Atualiza um campo de um atendente localmente (antes de salvar)
  function handleChange(username: string, campo: keyof Atendente, valor: string) {
    setAtendentes((prev) => prev.map((a) => (a.username === username ? { ...a, [campo]: valor } : a)))
  }

  // Salva as alterações de um atendente no banco
  async function handleSalvar(atendente: Atendente) {
    setSalvando(atendente.username)
    try {
      await update(ref(db, `atendentes/${atendente.username}`), {
        uid: atendente.uid,
        email: atendente.email,
        nomeCompleto: atendente.nomeCompleto,
        role: atendente.role,
        setor: atendente.setor,
        status: atendente.status,
        sgpUsername: atendente.sgpUsername || null,
        customAllowedSections: atendente.customAllowedSections || [],
      })
      // Mantém uid_index sincronizado com a role
      await set(ref(db, `uid_index/${atendente.uid}/role`), atendente.role)
      notify('Usuário atualizado com sucesso!', 'success')
    } catch (e: any) {
      notify('Erro ao salvar: ' + e.message, 'error')
    } finally {
      setSalvando(null)
    }
  }
  // Estado para o salvamento em massa
  const [salvandoTodos, setSalvandoTodos] = useState(false)

  // Função que salva todos os atendentes de uma vez
  async function handleSalvarTodos() {
    const confirmacao = await confirm(`Deseja salvar as alterações de todos os ${listaFiltrada.length} usuários de uma vez?`)
    if (!confirmacao) return

    setSalvandoTodos(true)

    let erros = 0

    for (const atendente of listaFiltrada) {
      try {
        await update(ref(db, `atendentes/${atendente.username}`), {
          uid: atendente.uid,
          email: atendente.email,
          nomeCompleto: atendente.nomeCompleto,
          role: atendente.role,
          setor: atendente.setor,
          status: atendente.status,
          sgpUsername: atendente.sgpUsername || null,
          customAllowedSections: atendente.customAllowedSections || [],
        })
        await set(ref(db, `uid_index/${atendente.uid}/role`), atendente.role)
      } catch {
        erros++
      }
    }

    setSalvandoTodos(false)

    if (erros === 0) {
      notify(`${listaFiltrada.length} usuários salvos com sucesso!`, 'success')
    } else {
      notify(`${erros} erro(s) ao salvar. Verifique e tente novamente.`, 'error')
    }
  }

  // Ordenação ao clicar no cabeçalho da coluna
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Filtra por busca e ordena
  const listaFiltrada = atendentes
    .filter((a) => {
      const q = busca.toLowerCase()
      return a.username.toLowerCase().includes(q) || a.nomeCompleto.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.setor.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      // Primeiro, garante que 'ativo' fique acima de 'inativo' sempre
      if (a.status !== b.status) {
        return a.status === 'ativo' ? -1 : 1
      }

      // Se o status for o mesmo, ordena pelo campo selecionado
      const va = String(a[sortField] ?? '')
      const vb = String(b[sortField] ?? '')
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  // Ícone de ordenação no cabeçalho
  function sortIcon(field: SortField) {
    if (sortField !== field) return <span className="admin-sort-icon"><ArrowUpDown size={14} /></span>
    return <span className="admin-sort-icon active">{sortAsc ? <ArrowUp size={14} strokeWidth={2} /> : <ArrowDown size={14} strokeWidth={2} />}</span>
  }

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------

  const openBugsCount = bugs.filter((b) => b.status === 'aberto').length

  return (
    <div className="admin-page">
      {/* Cabeçalho */}
      <div className="admin-header">
        <div>
          <h1 className="admin-titulo"><Shield size={20} strokeWidth={2} /> Painel Admin</h1>
          <p className="admin-subtitulo">Gerencie usuários, roles e setores</p>
        </div>
        <div className="admin-header-acoes">
          <button className="admin-btn-refresh" onClick={carregarAtendentes}>
            <RefreshCw size={16} strokeWidth={2} /> Atualizar
          </button>
          <button className="admin-btn-salvar-todos" onClick={handleSalvarTodos} disabled={salvandoTodos || loading}>
            {salvandoTodos ? `Salvando ${listaFiltrada.length}...` : <><Save size={16} strokeWidth={2} /> Salvar todos ({listaFiltrada.length})</>}
          </button>
        </div>
      </div>

      {/* Abas de Navegação Admin */}
      <div className="admin-abas">
        <button className={`admin-aba ${abaAdmin === 'usuarios' ? 'ativa' : ''}`} onClick={() => setAbaAdmin('usuarios')}>
          <Users size={16} strokeWidth={2} /> Usuários
        </button>
        <button className={`admin-aba ${abaAdmin === 'avisos' ? 'ativa' : ''}`} onClick={() => setAbaAdmin('avisos')}>
          <Megaphone size={16} strokeWidth={2} /> Avisos
        </button>
        <button className={`admin-aba ${abaAdmin === 'bugs' ? 'ativa' : ''}`} onClick={() => setAbaAdmin('bugs')} style={{ position: 'relative' }}>
          <Bug size={16} strokeWidth={2} /> Bugs Relatados
          {openBugsCount > 0 && <span className="admin-aba-badge">{openBugsCount}</span>}
        </button>
      </div>

      {abaAdmin === 'usuarios' ? (
        <>
          {/* Card principal */}
          <div className="admin-card">
            {/* Barra de busca + contador */}
            <div className="admin-toolbar">
              <input id="admin-busca" name="admin-busca" className="admin-busca" type="text" placeholder="Buscar por nome, usuário, setor..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              <span className="admin-contador">
                {listaFiltrada.length} / {atendentes.length} usuários
              </span>
            </div>

            {/* Estados de loading e erro */}
            {loading && <LoadingOverlay message="Carregando usuários..." />}

            {/* Tabela */}
            {!loading && (
              <div className="admin-tabela-wrapper">
                <table className="admin-tabela">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('username')}>Usuário {sortIcon('username')}</th>
                      <th onClick={() => handleSort('sgpUsername')}>Usuário SGP {sortIcon('sgpUsername')}</th>
                      <th onClick={() => handleSort('nomeCompleto')}>Nome {sortIcon('nomeCompleto')}</th>
                      <th onClick={() => handleSort('setor')}>Setor {sortIcon('setor')}</th>
                      <th onClick={() => handleSort('role')}>Role {sortIcon('role')}</th>
                      <th onClick={() => handleSort('status')}>Status {sortIcon('status')}</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaFiltrada.length === 0 && (
                      <tr>
                        <td colSpan={6} className="admin-vazio">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    )}
                    {listaFiltrada.map((atendente) => (
                      <tr key={atendente.username}>
                        {/* Username (somente leitura — é a chave do banco) */}
                        <td>
                          <span className="admin-username">{atendente.username}</span>
                          <span className="admin-email">{atendente.email}</span>
                        </td>
                        <td>
                          <input id={`sgpUsername-${atendente.username}`} name="sgpUsername" className="admin-input" type="text" placeholder="mesmo usuário" value={atendente.sgpUsername ?? ''} onChange={(e) => handleChange(atendente.username, 'sgpUsername', e.target.value)} />
                        </td>
                        {/* Nome completo editável */}
                        <td>
                          <input id={`nome-${atendente.username}`} name="nomeCompleto" className="admin-input" type="text" value={atendente.nomeCompleto} onChange={(e) => handleChange(atendente.username, 'nomeCompleto', e.target.value)} />
                        </td>

                        {/* Setor editável */}
                        <td>
                          <select id={`setor-${atendente.username}`} name="setor" className="admin-select" value={atendente.setor} onChange={(e) => handleChange(atendente.username, 'setor', e.target.value)}>
                            {SETORES.map((s) => (
                              <option key={s} value={s}>
                                {getSetorLabel(s)}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Role editável */}
                        <td>
                          <select id={`role-${atendente.username}`} name="role" className="admin-select" value={atendente.role} onChange={(e) => handleChange(atendente.username, 'role', e.target.value as Role)}>
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {getRoleLabel(r)}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Status editável */}
                        <td>
                          <select id={`status-${atendente.username}`} name="status" className={`admin-select status-${atendente.status}`} value={atendente.status} onChange={(e) => handleChange(atendente.username, 'status', e.target.value)}>
                            <option value="ativo">{STATUS_LABEL['ativo']}</option>
                            <option value="inativo">{STATUS_LABEL['inativo']}</option>
                          </select>
                        </td>

                        {/* Botão salvar / Ações */}
                        <td>
                          <div className="admin-actions-cell">
                            <button className="admin-btn-salvar" onClick={() => handleSalvar(atendente)} disabled={salvando === atendente.username}>
                              {salvando === atendente.username ? '...' : 'Salvar'}
                            </button>
                            <button className="admin-btn-permissoes" onClick={() => setAtendentePermissoes(atendente)} title="Permissões Especiais (páginas extras)">
                              Extras ({atendente.customAllowedSections?.length || 0})
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Resumo de permissões por setor */}
          <div className="admin-card">
            <h2 className="admin-secao-titulo"><ClipboardList size={18} strokeWidth={2} /> Resumo de Permissões por Setor</h2>
            <div className="admin-permissoes-grid">
              {SETORES.map((setor) => (
                <div key={setor} className="admin-permissao-card">
                  <h3 className="admin-permissao-setor">{getSetorLabel(setor)}</h3>
                  <ul className="admin-permissao-lista">
                    {SECTIONS.map((section) => {
                      const tem = getSetorPermissions(section).includes(setor)
                      return (
                        <li key={section} className={`admin-permissao-item ${tem ? 'ok' : 'nok'}`}>
                          <span className="admin-permissao-dot"><Circle size={10} fill={tem ? 'currentColor' : 'none'} /></span>
                          {getSectionLabel(section)}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : abaAdmin === 'avisos' ? (
        <PainelAvisos user={user!} />
      ) : (
        <div className="admin-card">
          <h2 className="admin-secao-titulo">Relatório de Bugs</h2>
          {carregandoBugs ? (
            <LoadingOverlay message="Carregando..." />
          ) : (
            <div className="admin-tabela-wrapper">
              <table className="admin-tabela">
                <thead>
                  <tr>
                    <th>Abertura</th>
                    <th>Autor/Usuário</th>
                    <th>Título Resumido</th>
                    <th>Descrição ou Passos</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bugs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="admin-vazio">
                        Nenhum bug reportado
                      </td>
                    </tr>
                  )}
                  {bugs.map((b) => (
                    <tr key={b.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{b.timestamp ? new Date(b.timestamp).toLocaleString() : 'Desconhecido'}</td>
                      <td>{b.autor}</td>
                      <td>
                        <strong>{b.titulo}</strong>
                      </td>
                      <td>{b.descricao}</td>
                      <td>
                        <select className={`admin-select status-${b.status === 'aberto' ? 'inativo' : 'ativo'}`} value={b.status} onChange={(e) => handleStatusBug(b.id, e.target.value)}>
                          <option value="aberto">Aberto</option>
                          <option value="em andamento">Em Andamento</option>
                          <option value="resolvido">Resolvido</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {atendentePermissoes && (
        <div className="admin-modal-backdrop" onClick={() => setAtendentePermissoes(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Permissões Especiais</h3>
              <button className="admin-modal-close" onClick={() => setAtendentePermissoes(null)}>&times;</button>
            </div>
            <div className="admin-modal-content">
              <p className="admin-modal-subtitle">Selecione as páginas que <strong>{atendentePermissoes.nomeCompleto}</strong> pode acessar, além do seu setor/role padrão:</p>
              <div className="admin-permissions-list">
                {SECTIONS.map((sec) => {
                  const isChecked = atendentePermissoes.customAllowedSections?.includes(sec) || false
                  return (
                    <label key={sec} className="admin-permission-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const current = atendentePermissoes.customAllowedSections || []
                          const next = isChecked ? current.filter((s) => s !== sec) : [...current, sec]
                          setAtendentePermissoes({ ...atendentePermissoes, customAllowedSections: next })
                        }}
                      />
                      <span>{getSectionLabel(sec)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-modal-cancel" onClick={() => setAtendentePermissoes(null)}>Cancelar</button>
              <button className="admin-btn-modal-save" onClick={() => {
                setAtendentes((prev) => prev.map((a) => a.username === atendentePermissoes.username ? atendentePermissoes : a))
                handleSalvar(atendentePermissoes)
                setAtendentePermissoes(null)
              }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
