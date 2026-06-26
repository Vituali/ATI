import { log } from './state'

let hideWaitingNotifications = false

// Inicializa a escuta de configurações de notificação
export function initNotificationHider(): void {
  chrome.storage.local.get('hideWaitingNotifications', (data) => {
    hideWaitingNotifications = !!data.hideWaitingNotifications
    if (hideWaitingNotifications) {
      checkAndHideWaitingNotifications()
    }
  })

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.hideWaitingNotifications) {
      hideWaitingNotifications = !!changes.hideWaitingNotifications.newValue
      if (hideWaitingNotifications) {
        checkAndHideWaitingNotifications()
      }
    }
  })
}

export function checkAndHideWaitingNotifications(): void {
  if (!hideWaitingNotifications) return

  const notifications = document.querySelectorAll('.vue-notification-wrapper')
  notifications.forEach((notif) => {
    const title = notif.querySelector('.notification_title')
    if (title && title.textContent?.includes('Atendimentos em espera')) {
      const htmlElement = notif as HTMLElement
      if (htmlElement.style.display !== 'none') {
        htmlElement.style.display = 'none'
        log('Notificação de atendimentos em espera ocultada com sucesso.')
      }
    }
  })
}
