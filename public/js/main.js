// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) nav.style.background = window.scrollY > 50 ? 'rgba(15,15,26,0.98)' : 'rgba(15,15,26,0.85)';
});

// Hamburger menu
const ham = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (ham && navLinks) {
  ham.addEventListener('click', () => navLinks.classList.toggle('open'));
}

// Auth redirect if already logged in
if (window.location.pathname.includes('login') || window.location.pathname.includes('register')) {
  const token = localStorage.getItem('sp_token');
  if (token) window.location.href = 'dashboard.html';
}
