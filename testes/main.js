document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        body.classList.add('dark');
        darkModeToggle.innerText = '☀️';
    } else {
        darkModeToggle.innerText = '🌙';
    }

    darkModeToggle.addEventListener('click', () => {
        body.classList.toggle('dark');
        localStorage.setItem('darkMode', body.classList.contains('dark'));
        darkModeToggle.innerText = body.classList.contains('dark') ? '☀️' : '🌙';
    });

    showSection('chat');
});

function showSection(section) {
    document.getElementById('chatSection').style.display = section === 'chat' ? 'block' : 'none';
    document.getElementById('conversorSection').style.display = section === 'conversor' ? 'block' : 'none';
}