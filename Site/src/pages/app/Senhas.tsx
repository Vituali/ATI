import { useState, useEffect } from 'react'
import './Senhas.css'
import { getCredentials, isAdminUser } from '../../services/credentials'
import { Check, ClipboardList, Key, Settings, Globe } from 'lucide-react'

interface Credencial {
  label: string
  valor: string
  link?: string
}

interface GrupoSenha {
  titulo: string
  icon: string
  credenciais: Credencial[]
}

// ---------------------------------------------------------------
// COMPONENTE DE ITEM COPIÁVEL
// ---------------------------------------------------------------

interface ItemCopiavel {
  label: string
  valor: string
  link?: string
}

function ItemCopiavel({ label, valor, link }: ItemCopiavel) {
  const [copiado, setCopiado] = useState(false)

  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // fallback silencioso
    }
  }

  return (
    <div className="senha-item">
      <span className="senha-label">{label}</span>
      <div className="senha-valor-wrapper">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="senha-valor link">
            {label}
          </a>
        ) : (
          <span className={`senha-valor copiavel ${copiado ? 'copiado' : ''}`} onClick={handleCopiar} title="Clique para copiar">
            {copiado ? <><Check size={14} strokeWidth={2} /> Copiado!</> : valor}
          </span>
        )}
        {!link && (
          <button className="senha-copiar-btn" onClick={handleCopiar} title="Copiar">
            {copiado ? <Check size={16} strokeWidth={2} /> : <ClipboardList size={16} strokeWidth={2} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// PÁGINA PRINCIPAL
// ---------------------------------------------------------------

export default function Senhas() {
  const [grupos, setGrupos] = useState<GrupoSenha[]>([])
  const [sites, setSites] = useState<Credencial[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    Promise.all([getCredentials(), isAdminUser()]).then(([data, admin]) => {
      setGrupos(data.grupos)
      setSites(data.sites)
      setIsAdmin(admin)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="senhas-page">
        <div className="senhas-header">
          <h1 className="senhas-titulo"><Key size={20} strokeWidth={2} /> Senhas de Equipamentos</h1>
          <p className="senhas-subtitulo">Acesso rápido aos logins e senhas. Clique para copiar.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>Carregando credenciais...</div>
      </div>
    )
  }

  if (grupos.length === 0 && sites.length === 0) {
    return (
      <div className="senhas-page">
        <div className="senhas-header">
          <h1 className="senhas-titulo"><Key size={20} strokeWidth={2} /> Senhas de Equipamentos</h1>
          <p className="senhas-subtitulo">Acesso rápido aos logins e senhas. Clique para copiar.</p>
        </div>
        <div className="senhas-grid">
          <div className="senhas-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
            <p style={{ opacity: 0.6 }}>Nenhuma credencial configurada no momento.</p>
            {isAdmin && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.5 }}>
                <Settings size={16} strokeWidth={2} /> Configure as credenciais no nó <code>credenciais</code> do Firebase Realtime Database.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="senhas-page">
      <div className="senhas-header">
        <h1 className="senhas-titulo"><Key size={20} strokeWidth={2} /> Senhas de Equipamentos</h1>
        <p className="senhas-subtitulo">Acesso rápido aos logins e senhas. Clique para copiar.</p>
      </div>

      <div className="senhas-grid">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className="senhas-card">
            <h3 className="senhas-card-titulo">
              <span>{grupo.icon}</span> {grupo.titulo}
            </h3>
            <div className="senhas-lista">
              {grupo.credenciais.map((cred, i) => (
                <ItemCopiavel key={i} label={cred.label} valor={cred.valor} link={cred.link} />
              ))}
            </div>
          </div>
        ))}

        {sites.length > 0 && (
          <div className="senhas-card">
            <h3 className="senhas-card-titulo">
              <span><Globe size={20} strokeWidth={2} /></span> Sites Importantes
            </h3>
            <div className="senhas-lista">
              {sites.map((site, i) => (
                <div key={i} className="senha-item">
                  <a href={site.link} target="_blank" rel="noopener noreferrer" className="senha-site-link">
                    {site.label} ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
