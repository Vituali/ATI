// js/ui.js

export function initDarkMode() {
    const modeToggle = document.getElementById("modeToggle");
    const isDark = localStorage.getItem("darkMode") === "true";

    if (isDark) {
        document.body.classList.add("dark");
        modeToggle.innerText = "☀️";
    } else {
        modeToggle.innerText = "🌙";
    }

    modeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", document.body.classList.contains("dark"));
        modeToggle.innerText = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });
}

export function showPopup(message) {
    const popup = document.getElementById('popup');
    popup.innerText = message;
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, 1500);
}