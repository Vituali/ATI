;(function () {
  const token = document.currentScript?.dataset?.token
  window.addEventListener('message', function handler(event) {
    if (!event.data || event.data.type !== 'ATI_SGP_LOGIN' || event.data.token !== token) return
    window.removeEventListener('message', handler)

    const creds = event.data.creds

    function tryLogin() {
      const userField =
        document.querySelector('#id_username') || document.querySelector('input[name="username"]')
      const passField =
        document.querySelector('#id_password') || document.querySelector('input[name="password"]')
      const btn =
        document.querySelector('button[type="submit"]') ||
        document.querySelector('input[type="submit"]') ||
        document.querySelector('.submit-row input')

      if (userField && passField && btn) {
        userField.value = creds.login
        passField.value = creds.pass

        // Disparar eventos de input caso o site use frameworks reativos
        userField.dispatchEvent(new Event('input', { bubbles: true }))
        passField.dispatchEvent(new Event('input', { bubbles: true }))
        userField.dispatchEvent(new Event('change', { bubbles: true }))
        passField.dispatchEvent(new Event('change', { bubbles: true }))

        console.log('Extensão ATI: Credenciais inseridas via helper, entrando...')
        setTimeout(() => btn.click(), 500)
      } else {
        console.log('Extensão ATI Helper: Aguardando campos de login...')
        if (!window.__ati_login_attempts) window.__ati_login_attempts = 0
        if (window.__ati_login_attempts < 10) {
          window.__ati_login_attempts++
          setTimeout(tryLogin, 1000)
        }
      }
    }

    tryLogin()
  })
})()
