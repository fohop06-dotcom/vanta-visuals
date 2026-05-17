const API_URL = '';

document.addEventListener('DOMContentLoaded', () => {
  initFAQ();
  initAuth();
  initProfile();
  checkAuth();
});

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
      });
    }
  });
}

function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabBtns = document.querySelectorAll('.tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
      if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      await loginUser(email, password);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      await registerUser(name, email, password);
    });
  }
}

async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('vantaToken', data.token);
      window.location.href = 'profile.html';
    } else {
      alert(data.error);
    }
  } catch {
    alert('Ошибка подключения к серверу');
  }
}

async function registerUser(name, email, password) {
  try {
    const res = await fetch(`${API_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('vantaToken', data.token);
      window.location.href = 'profile.html';
    } else {
      alert(data.error);
    }
  } catch {
    alert('Ошибка подключения к серверу');
  }
}

function initProfile() {
  const activationForm = document.getElementById('activationForm');
  if (activationForm) {
    activationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const key = document.getElementById('activationKey').value;
      await activateSubscription(key);
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('vantaToken');
      window.location.href = 'index.html';
    });
  }
}

async function checkAuth() {
  const token = localStorage.getItem('vantaToken');
  updateHeaderAuth(token);

  if (token && window.location.pathname.includes('login.html')) {
    window.location.href = 'profile.html';
    return;
  }

  if (!token) {
    if (window.location.pathname.includes('profile.html')) {
      window.location.href = 'login.html';
    }
    return;
  }

  if (window.location.pathname.includes('profile.html')) {
    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        renderProfile(user);
        updateHeader(user);
      } else {
        localStorage.removeItem('vantaToken');
        window.location.href = 'login.html';
      }
    } catch {
      alert('Ошибка подключения к серверу');
    }
  }
}

function updateHeaderAuth(token) {
  const loginBtn = document.querySelector('.header-inner .btn-outline[href="login.html"]');
  if (!loginBtn) return;

  if (token) {
    const profileDiv = document.createElement('div');
    profileDiv.className = 'header-profile';
    profileDiv.innerHTML = `
      <a href="profile.html" class="nav-link">Профиль</a>
      <button id="logoutBtn" class="btn btn-outline btn-sm">Выйти</button>
    `;
    loginBtn.replaceWith(profileDiv);

    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('vantaToken');
      window.location.href = 'index.html';
    });
  }
}

function renderProfile(user) {
  const nameEl = document.getElementById('profileName');
  const uidEl = document.getElementById('profileUid');
  const avatarEl = document.getElementById('profileAvatar');
  const regDateEl = document.getElementById('profileRegDate');
  const subEndEl = document.getElementById('profileSubEnd');
  const statusEl = document.getElementById('profileStatus');
  const hwidEl = document.getElementById('hwidValue');

  if (nameEl) nameEl.textContent = user.name;
  if (uidEl) uidEl.textContent = user.uid;
  if (avatarEl) avatarEl.textContent = user.avatar;

  if (regDateEl && user.reg_date) {
    regDateEl.textContent = new Date(user.reg_date).toLocaleDateString('ru-RU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  if (subEndEl) {
    if (user.sub_end) {
      const d = new Date(user.sub_end);
      subEndEl.textContent = d.getFullYear() > 2090 ? 'Навсегда' : d.toLocaleDateString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } else {
      subEndEl.textContent = 'Не активна';
    }
  }

  if (statusEl) {
    const isActive = user.sub_end && new Date(user.sub_end) > new Date();
    statusEl.innerHTML = isActive
      ? '<span class="status-badge active">Активна</span>'
      : '<span class="status-badge inactive">Не активна</span>';
  }

  if (hwidEl) {
    hwidEl.textContent = user.hwid || 'Не определён (требуется лоадер)';
  }
}

function updateHeader(user) {
  const el = document.getElementById('headerUsername');
  if (el) el.textContent = user.name;
}

async function activateSubscription(key) {
  const token = localStorage.getItem('vantaToken');
  if (!token) return;

  try {
    const res = await fetch(`${API_URL}/api/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ key })
    });
    const data = await res.json();
    if (data.subEnd) {
      alert('Подписка активирована!');
      location.reload();
    } else {
      alert(data.error);
    }
  } catch {
    alert('Ошибка подключения к серверу');
  }
}
