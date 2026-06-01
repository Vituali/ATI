;(function () {
  window.addEventListener('message', function handler(event) {
    if (!event.data || event.data.type !== 'ATI_SGP_FILL') return
    window.removeEventListener('message', handler)

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
      const is53 = window.location.href.includes('201.158.20.53')
      setValue('#id_setor', is53 ? '100006' : '2')
      setValue('#id_metodo', '3')
      setValue('#id_data_agendamento', dateStr)

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
      if (data.occurrenceType) setValue('#id_tipo', data.occurrenceType)

      // OS e status
      if (data.shouldCreateOS) {
        setCheck('#id_os', true)
      } else {
        setCheck('#id_os', false)
        if (data.occurrenceStatus === '1') setValue('#id_status', '1')
      }

      console.log('ATI: Formulário preenchido!')
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

    waitAndFill(0)
  })
})()