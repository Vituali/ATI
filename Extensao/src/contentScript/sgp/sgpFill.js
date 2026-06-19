;(function () {
  window.addEventListener('message', function handler(event) {
    if (!event.data || (event.data.type !== 'ATI_SGP_FILL' && event.data.type !== 'ATI_SGP_FILL_OS')) return
    window.removeEventListener('message', handler)

    const type = event.data.type
    const data = event.data.data
    const username = event.data.username
    const fullname = event.data.fullname || ''

    function setValue(selector, value) {
      try {
        const el = document.querySelector(selector)
        if (!el) return
        el.value = value
        el.dispatchEvent(new Event('change', { bubbles: true }))
        if (typeof window.jQuery !== 'undefined') {
          window.jQuery(el).trigger('change')
        }
      } catch(e) {}
    }

    function setValueMultiple(selector, values) {
      try {
        const el = document.querySelector(selector)
        if (!el) return
        const valArray = Array.isArray(values) ? values.map(String) : []
        Array.from(el.options).forEach(function(opt) {
          opt.selected = valArray.includes(String(opt.value))
        })
        el.dispatchEvent(new Event('change', { bubbles: true }))
        if (typeof window.jQuery !== 'undefined') {
          window.jQuery(el).trigger('change')
        }
      } catch(e) {}
    }

    function setCheck(selector, checked) {
      try {
        const el = document.querySelector(selector)
        if (!el) return
        el.checked = checked
        el.dispatchEvent(new Event('change', { bubbles: true }))
        if (typeof window.jQuery !== 'undefined') {
          window.jQuery(el).trigger('change')
        }
      } catch(e) {}
    }

    function toggleSgpAuxGroup(responsavelSelect) {
      const selectedOption = responsavelSelect.options[responsavelSelect.selectedIndex]
      const isPlantonista = selectedOption ? selectedOption.textContent.toLowerCase().includes('plantonista') : false
      const tecnicosEl = document.querySelector('#id_tecnicos')
      if (tecnicosEl) {
        const row = tecnicosEl.closest('.form-row') || tecnicosEl.parentElement
        if (row) {
          row.style.display = isPlantonista ? 'none' : ''
        }
      }
    }

    function fill() {
      const now = new Date()
      const pad = function(n) { return String(n).padStart(2, '0') }
      const dateStr = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' + now.getFullYear() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())

      // Responsável por texto / Usuário Responsável
      if (username || fullname) {
        const respSelect = document.querySelector('#id_responsavel')
        if (respSelect) {
          const userWords = username ? username.split(/[^a-zA-Z0-9\u00C0-\u00FF]+/).filter(Boolean) : []
          const nameWords = fullname ? fullname.split(/[^a-zA-Z0-9\u00C0-\u00FF]+/).filter(function(w) { return w.length > 2 }) : []

          let bestOption = null
          let bestScore = -1

          Array.from(respSelect.options).forEach(function(o) {
            const text = o.textContent.toLowerCase()
            let score = 0

            // Remove prefixos como SUPORTE -, TECNICO -, ADM - etc., para avaliar o nome em si
            const cleanText = text.replace(/^(suporte|tecnico|adm|financeiro|comercial|rh|ceo)\s*-\s*/i, '').trim()

            if (username && text === username) score += 1000
            if (fullname && text === fullname) score += 2000

            // Se o nome real começar com o username ou primeira palavra dele, ganha grande vantagem
            if (username && cleanText.startsWith(username)) score += 500
            if (userWords.length > 0 && cleanText.startsWith(userWords[0])) score += 300

            // Se o nome real começar com o primeiro nome do nome completo, ganha vantagem
            if (nameWords.length > 0 && cleanText.startsWith(nameWords[0])) score += 200

            userWords.forEach(function(word) {
              if (text.includes(word)) score += 100
            })

            nameWords.forEach(function(word) {
              if (text.includes(word)) score += 10
            })

            if (score > 0 && score > bestScore) {
              bestScore = score
              bestOption = o
            }
          })

          if (bestOption) {
            console.log('ATI: Usuário Responsável selecionado: ' + bestOption.textContent + ' (Score: ' + bestScore + ')')
            setValue('#id_responsavel', bestOption.value)
          }
        }
      }

      // Fixos
      const setorSelect = document.querySelector('#id_setor')
      let sectorValue = '2'
      if (setorSelect) {
        const has53Sector = Array.from(setorSelect.options).some(function(o) {
          return o.value === '100006'
        })
        if (has53Sector) {
          sectorValue = '100006'
        }
      } else {
        if (window.location.href.includes('201.158.20.53')) {
          sectorValue = '100006'
        }
      }
      setValue('#id_setor', sectorValue)
      setValue('#id_metodo', '3')
      
      let occDateStr = dateStr
      if (data.osDateModified && data.osDataAgendamento) {
        const parts = data.osDataAgendamento.split('-')
        if (parts.length === 3) {
          const yyyy = parts[0]
          const mm = parts[1]
          const dd = parts[2]
          
          const nowTime = new Date()
          const timeStr = pad(nowTime.getHours()) + ':' + pad(nowTime.getMinutes()) + ':' + pad(nowTime.getSeconds())
          occDateStr = dd + '/' + mm + '/' + yyyy + ' ' + timeStr
        }
      }
      setValue('#id_data_agendamento', occDateStr)

      // Contrato
      function setContract() {
        if (data.selectedContract) {
          setValue('#id_clientecontrato', data.selectedContract)
          return
        }

        const contractSelect = document.querySelector('#id_clientecontrato')
        if (!contractSelect || contractSelect.value !== '') return
        
        const opts = Array.from(contractSelect.options).filter(function(o) {
          return o.value && !o.text.includes('CANCELADO')
        })
        if (opts.length === 1) setValue('#id_clientecontrato', opts[0].value)
      }
      setContract()

      // Descrição e tipo
      if (data.osText) setValue('#id_conteudo', data.osText.toUpperCase())
      if (data.occurrenceType) {
        setValue('#id_tipo', data.occurrenceType)
      }

      // Fallback por nome caso a seleção por ID resulte em vazio
      if (data.occurrenceTypeText) {
        const tipoSelect = document.querySelector('#id_tipo')
        if (tipoSelect && tipoSelect.value === '') {
          const cleanTypeName = data.occurrenceTypeText.toLowerCase().trim()
          const opt = Array.from(tipoSelect.options).find(function(o) {
            return o.textContent.toLowerCase().trim() === cleanTypeName
          })
          if (opt) {
            console.log('ATI: Tipo de ocorrência selecionado pelo nome (fallback): ' + opt.textContent)
            setValue('#id_tipo', opt.value)
          }
        }
      }

      // OS e status
      if (data.shouldCreateOS) {
        setCheck('#id_os', true)
      } else {
        setCheck('#id_os', false)
        if (data.occurrenceStatus === '1') setValue('#id_status', '1')
      }

      console.log('ATI: Formulário de ocorrência preenchido!')
    }

    function fillOS() {
      if (data.motivo) {
        setValue('#id_motivoos', data.motivo)
        setValue('#id_motivo', data.motivo)
      }

      if (data.prioridade) {
        setValue('#id_prioridade', data.prioridade)
      }

      // Ajusta data agendamento conforme o período
      let dateStr = ''
      let hour = '09:00:00'
      if (data.periodo === 'tarde') hour = '13:00:00'
      else if (data.periodo === 'manha') hour = '09:00:00'
      else if (data.periodo === '48h') hour = '09:00:00'
      else if (data.periodo === 'outros') hour = '09:00:00'

      if (data.dataAgendamento) {
        const parts = data.dataAgendamento.split('-')
        if (parts.length === 3) {
          const yyyy = parts[0]
          const mm = parts[1]
          const dd = parts[2]
          dateStr = dd + '/' + mm + '/' + yyyy + ' ' + hour
        }
      }

      if (!dateStr) {
        const now = new Date()
        const pad = function(n) { return String(n).padStart(2, '0') }
        dateStr = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' + now.getFullYear() + ' ' + hour
      }

      setValue('#id_data_agendamento', dateStr)

      if (data.responsavel) {
        setValue('#id_responsavel', data.responsavel)
      }

      if (data.tecnicos) {
        setValueMultiple('#id_tecnicos', data.tecnicos)
      }

      // Adiciona o listener e faz o toggle inicial de exibição dos auxiliares no formulário do SGP
      const respSelect = document.querySelector('#id_responsavel')
      if (respSelect) {
        respSelect.addEventListener('change', function() {
          toggleSgpAuxGroup(respSelect)
        })
        toggleSgpAuxGroup(respSelect)
      }

      // Observação prefixada com o período de agendamento selecionado
      let prefix = ''
      if (data.periodo === '48h') {
        prefix = '[PRAZO DE 48 HORAS]'
      } else if (data.periodo === 'manha') {
        if (data.periodoExtra && data.periodoExtra.trim()) {
          prefix = '[AGENDAMENTO: MANHÃ - ' + data.periodoExtra.trim() + ']'
        } else {
          prefix = '[AGENDAMENTO: MANHÃ]'
        }
      } else if (data.periodo === 'tarde') {
        if (data.periodoExtra && data.periodoExtra.trim()) {
          prefix = '[AGENDAMENTO: TARDE - ' + data.periodoExtra.trim() + ']'
        } else {
          prefix = '[AGENDAMENTO: TARDE]'
        }
      } else if (data.periodo === 'outros') {
        if (data.periodoExtra && data.periodoExtra.trim()) {
          prefix = '[AGENDAMENTO: ' + data.periodoExtra.trim() + ']'
        } else {
          prefix = '[AGENDAMENTO: OUTROS]'
        }
      }

      let finalObs = ''
      if (prefix) {
        finalObs = prefix
        if (data.observacao) {
          finalObs += ' ' + data.observacao
        }
      } else {
        finalObs = data.observacao || ''
      }

      setValue('#id_observacao', finalObs)
      setValue('#id_observacoes', finalObs)

      console.log('ATI: Formulário de O.S. preenchido!')
    }

    function waitAndFill(attempts) {
      if (document.querySelector('#id_clientecontrato')) {
        fill()
        return
      }
      
      if (attempts >= 30) {
        console.error('ATI: Formulário não encontrado após 9s.')
        return
      }
      
      setTimeout(function() { waitAndFill(attempts + 1) }, 300)
    }

    function waitAndFillOS(attempts) {
      if (document.querySelector('#id_motivoos') || document.querySelector('#id_motivo') || document.querySelector('#id_responsavel')) {
        fillOS()
        return
      }
      
      if (attempts >= 30) {
        console.error('ATI: Formulário de O.S. não encontrado após 9s.')
        return
      }
      
      setTimeout(function() { waitAndFillOS(attempts + 1) }, 300)
    }

    if (type === 'ATI_SGP_FILL') {
      waitAndFill(0)
    } else if (type === 'ATI_SGP_FILL_OS') {
      waitAndFillOS(0)
    }
  })
})()