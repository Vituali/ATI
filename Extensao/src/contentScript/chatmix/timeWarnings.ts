function isChatOlderThanOneHour(timeText: string): boolean {
  timeText = timeText.trim().toLowerCase()
  if (!timeText) return false

  // Formato: "17h39" ou "17:39" ou "09h05"
  const timeRegex = /^(\d{1,2})[h:](\d{2})$/
  const match = timeText.match(timeRegex)
  if (match) {
    const hours = parseInt(match[1], 10)
    const minutes = parseInt(match[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const now = new Date()
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const chatMinutes = hours * 60 + minutes
      
      let diff = currentMinutes - chatMinutes
      if (diff < 0) {
        // Virada de dia (meia-noite). Assumimos que passou de 1 hora se a diferença real é maior
        // ou se simplesmente cruzou a noite
        const diffCrossed = (currentMinutes + 1440) - chatMinutes
        return diffCrossed >= 60
      }
      return diff >= 60
    }
  }

  // Se for tempo relativo em minutos/segundos: "5 min", "45m", "30s"
  if (/^\d+\s*(min|m|s|seg)$/.test(timeText)) {
    return false
  }

  // Se tiver barra de data ("05/06") ou palavras que indicam dias passados
  if (timeText.includes('/') || timeText.includes('ontem') || timeText.includes('atrás') || timeText.includes('dia')) {
    return true
  }

  // Se for do tipo "1h", "2h", "1 hora", "3 horas"
  const hourMatch = timeText.match(/^(\d+)\s*(h|hora|horas)/)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    return hours >= 1
  }

  return false
}

export function updateChatTimeWarnings(): void {
  const items = document.querySelectorAll('.attendance_item')
  items.forEach((item) => {
    const timeEl = item.querySelector('time') as HTMLElement | null
    if (!timeEl) return

    // Obtém texto bruto atual
    const currentRawText = timeEl.textContent || ''
    
    // Verifica se o aviso já está presente
    const warningSpan = timeEl.querySelector('.ati-time-warning')
    
    // Se o span de aviso não está no DOM, o texto atual é a hora limpa que veio do app.
    // Atualizamos nosso dataset com este valor limpo.
    if (!warningSpan) {
      timeEl.classList.remove('ati-time-overdue')
      const cleanTime = currentRawText.replace(/⚠️/g, '').trim()
      if (cleanTime) {
        timeEl.dataset.atiOriginalTime = cleanTime
      }
    }

    const timeText = timeEl.dataset.atiOriginalTime || ''
    if (!timeText) return

    const isOld = isChatOlderThanOneHour(timeText)
    const hasWarningClass = timeEl.classList.contains('ati-time-overdue')

    if (isOld) {
      if (!hasWarningClass || !warningSpan) {
        timeEl.classList.add('ati-time-overdue')
        if (!warningSpan) {
          // Esvazia e reconstrói de forma limpa para evitar duplicações
          timeEl.textContent = ''
          
          const newWarningSpan = document.createElement('span')
          newWarningSpan.className = 'ati-time-warning'
          newWarningSpan.textContent = '⚠️'
          timeEl.appendChild(newWarningSpan)
          
          const textNode = document.createTextNode(timeText)
          timeEl.appendChild(textNode)
        }
      }
    } else {
      if (hasWarningClass || warningSpan) {
        timeEl.classList.remove('ati-time-overdue')
        if (warningSpan) {
          warningSpan.remove()
        }
        timeEl.textContent = timeText
      }
    }
  })
}
