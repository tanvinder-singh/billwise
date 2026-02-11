(function () {
  'use strict';

  // ─── DOM ───────────────────────────────────────────────────
  var menuToggle     = document.querySelector('.menu-toggle');
  var nav            = document.querySelector('.nav');
  var openLoginBtn   = document.getElementById('openLogin');
  var openSignupBtn  = document.getElementById('openSignup');
  var loginModal     = document.getElementById('loginModal');
  var signupModal    = document.getElementById('signupModal');
  var loginForm      = document.getElementById('loginForm');
  var phoneLoginForm = document.getElementById('phoneLoginForm');
  var signupForm     = document.getElementById('signupForm');
  var loginError     = document.getElementById('loginError');
  var phoneLoginError = document.getElementById('phoneLoginError');
  var signupError    = document.getElementById('signupError');
  var switchToSignup = document.getElementById('switchToSignup');
  var switchToLogin  = document.getElementById('switchToLogin');
  var userMenu       = document.getElementById('userMenu');
  var userAvatar     = document.getElementById('userAvatar');
  var userNameEl     = document.getElementById('userName');
  var logoutBtn      = document.getElementById('logoutBtn');
  var toast          = document.getElementById('toast');
  var heroCta        = document.getElementById('heroCta');
  var ctaSignup      = document.getElementById('ctaSignup');

  // ─── Helpers ───────────────────────────────────────────────
  function showToast(msg, type) {
    toast.textContent = msg;
    toast.className = 'toast is-visible' + (type ? ' toast-' + type : '');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.className = 'toast'; }, 3500);
  }

  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function isValidMobile(m) { return /^[6-9][0-9]{9}$/.test(m); }

  function apiPost(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  // ─── Modal Management ─────────────────────────────────────
  function openModal(modal) {
    modal.classList.add('is-active');
    document.body.classList.add('modal-open');
    var inp = modal.querySelector('input');
    if (inp) setTimeout(function () { inp.focus(); }, 120);
  }

  function closeModal(modal) {
    modal.classList.remove('is-active');
    document.body.classList.remove('modal-open');
    modal.querySelectorAll('form').forEach(function (f) { f.reset(); });
    modal.querySelectorAll('.form-error').forEach(function (el) { el.textContent = ''; });
    modal.querySelectorAll('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
  }

  function closeAllModals() { closeModal(loginModal); closeModal(signupModal); }

  openLoginBtn.addEventListener('click', function () { closeAllModals(); openModal(loginModal); });
  openSignupBtn.addEventListener('click', function () { closeAllModals(); openModal(signupModal); });
  if (heroCta) heroCta.addEventListener('click', function () { closeAllModals(); openModal(signupModal); });
  if (ctaSignup) ctaSignup.addEventListener('click', function () { closeAllModals(); openModal(signupModal); });

  switchToSignup.addEventListener('click', function () { closeModal(loginModal); openModal(signupModal); });
  switchToLogin.addEventListener('click', function () { closeModal(signupModal); openModal(loginModal); });

  // "switch-to-signup" class buttons in phone login
  document.querySelectorAll('.switch-to-signup').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(loginModal); openModal(signupModal); });
  });

  document.querySelectorAll('.modal-close').forEach(function (btn) {
    btn.addEventListener('click', closeAllModals);
  });

  [loginModal, signupModal].forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target === m) closeAllModals(); });
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllModals(); });

  // ─── Auth Tabs (Login modal) ──────────────────────────────
  document.querySelectorAll('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var target = tab.dataset.tab;
      document.querySelectorAll('.auth-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      loginModal.querySelectorAll('[data-panel]').forEach(function (p) {
        p.style.display = p.dataset.panel === target ? '' : 'none';
      });
    });
  });

  // ─── Password Toggle ──────────────────────────────────────
  document.querySelectorAll('.toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var inp = btn.parentElement.querySelector('input');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  // ─── Signup (real API) ─────────────────────────────────────
  signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    signupError.textContent = '';
    var name = document.getElementById('signupName').value.trim();
    var email = document.getElementById('signupEmail').value.trim().toLowerCase();
    var mobile = document.getElementById('signupMobile').value.trim();
    var password = document.getElementById('signupPassword').value;
    var confirm = document.getElementById('signupConfirm').value;

    if (!name) { signupError.textContent = 'Please enter your name.'; return; }
    if (!isValidEmail(email)) { signupError.textContent = 'Please enter a valid email.'; return; }
    if (!isValidMobile(mobile)) { signupError.textContent = 'Enter a valid 10-digit Indian mobile number.'; return; }
    if (password.length < 6) { signupError.textContent = 'Password must be at least 6 characters.'; return; }
    if (password !== confirm) { signupError.textContent = 'Passwords do not match.'; return; }

    apiPost('/api/auth/register', { name: name, email: email, phone: mobile, password: password })
      .then(function (data) {
        if (data.error) { signupError.textContent = data.error; return; }
        localStorage.setItem('billwise_token', data.token);
        closeAllModals();
        showToast('Account created! Redirecting...', 'success');
        setTimeout(function () { window.location.href = '/dashboard'; }, 800);
      })
      .catch(function () { signupError.textContent = 'Network error. Please try again.'; });
  });

  // ─── Email Login (real API) ────────────────────────────────
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.textContent = '';
    var identifier = document.getElementById('loginEmail').value.trim().toLowerCase();
    var password = document.getElementById('loginPassword').value;

    if (!identifier) { loginError.textContent = 'Enter your email or mobile.'; return; }
    if (!password) { loginError.textContent = 'Enter your password.'; return; }

    apiPost('/api/auth/login', { identifier: identifier, password: password })
      .then(function (data) {
        if (data.error) { loginError.textContent = data.error; return; }
        localStorage.setItem('billwise_token', data.token);
        closeAllModals();
        showToast('Welcome back! Redirecting...', 'success');
        setTimeout(function () { window.location.href = '/dashboard'; }, 800);
      })
      .catch(function () { loginError.textContent = 'Network error. Please try again.'; });
  });

  // ─── Phone OTP Login ──────────────────────────────────────
  var sendOtpBtn = document.getElementById('sendOtpBtn');
  var verifyOtpBtn = document.getElementById('verifyOtpBtn');
  var otpStep2 = document.getElementById('otpStep2');
  var otpDevHint = document.getElementById('otpDevHint');

  sendOtpBtn.addEventListener('click', function () {
    phoneLoginError.textContent = '';
    var phone = document.getElementById('otpPhone').value.trim();
    if (!isValidMobile(phone)) { phoneLoginError.textContent = 'Enter a valid 10-digit mobile number.'; return; }

    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = 'Sending...';

    apiPost('/api/auth/send-otp', { target: phone, type: 'phone' })
      .then(function (data) {
        if (data.error) { phoneLoginError.textContent = data.error; sendOtpBtn.disabled = false; sendOtpBtn.textContent = 'Send OTP'; return; }
        // Show OTP input
        otpStep2.style.display = '';
        sendOtpBtn.style.display = 'none';
        verifyOtpBtn.style.display = '';
        document.getElementById('otpCode').focus();
        showToast('OTP sent!', 'success');
        // Dev mode: show OTP hint
        if (data.otp) {
          otpDevHint.style.display = '';
          otpDevHint.innerHTML = '<strong style="color:var(--primary)">[Dev Mode] Your OTP: ' + data.otp + '</strong>';
        }
      })
      .catch(function () { phoneLoginError.textContent = 'Failed to send OTP.'; sendOtpBtn.disabled = false; sendOtpBtn.textContent = 'Send OTP'; });
  });

  phoneLoginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    phoneLoginError.textContent = '';
    var phone = document.getElementById('otpPhone').value.trim();
    var otp = document.getElementById('otpCode').value.trim();

    if (!otp || otp.length !== 6) { phoneLoginError.textContent = 'Enter a valid 6-digit OTP.'; return; }

    apiPost('/api/auth/verify-otp', { target: phone, type: 'phone', otp: otp })
      .then(function (data) {
        if (data.error) { phoneLoginError.textContent = data.error; return; }
        localStorage.setItem('billwise_token', data.token);
        closeAllModals();
        showToast('Phone verified! Redirecting...', 'success');
        setTimeout(function () { window.location.href = '/dashboard'; }, 800);
      })
      .catch(function () { phoneLoginError.textContent = 'Verification failed.'; });
  });

  // ─── Logout ────────────────────────────────────────────────
  logoutBtn.addEventListener('click', function () {
    localStorage.removeItem('billwise_token');
    updateAuthUI();
    showToast('Logged out', 'success');
  });

  // ─── Auth UI State ─────────────────────────────────────────
  function updateAuthUI() {
    var token = localStorage.getItem('billwise_token');
    if (token) {
      fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.user) {
            openLoginBtn.style.display = 'none';
            openSignupBtn.style.display = 'none';
            userMenu.style.display = 'flex';
            userNameEl.textContent = data.user.business_name || data.user.name;
            userAvatar.textContent = (data.user.name || 'U').charAt(0).toUpperCase();
          } else {
            localStorage.removeItem('billwise_token');
            showLoggedOut();
          }
        })
        .catch(function () { showLoggedOut(); });
    } else {
      showLoggedOut();
    }
  }

  function showLoggedOut() {
    openLoginBtn.style.display = '';
    openSignupBtn.style.display = '';
    userMenu.style.display = 'none';
  }

  updateAuthUI();

  // ─── Mobile Menu ───────────────────────────────────────────
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('is-open');
      document.body.classList.toggle('menu-open', !expanded);
    });
  }

  document.querySelectorAll('.nav-list a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.matchMedia('(max-width: 900px)').matches && nav) {
        nav.classList.remove('is-open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      }
    });
  });

})();
