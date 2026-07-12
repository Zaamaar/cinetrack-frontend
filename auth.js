// If already logged in, skip straight to the dashboard
if (getToken()) {
  window.location.href = 'dashboard.html';
}

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      setSession(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      setSession(data.token, data.user);
      window.location.href = 'dashboard.html';
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
