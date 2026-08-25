document.addEventListener('DOMContentLoaded', () => {
  // ── Theme toggle ──────────────────────────────────────────────────
  const html = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const langToggle  = document.getElementById('langToggle');

  // Apply saved theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  html.setAttribute('data-theme', savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  // ── Language toggle ───────────────────────────────────────────────
  // Apply saved language
  const savedLang = localStorage.getItem('lang') || 'en';
  html.setAttribute('data-lang', savedLang);
  if (langToggle) langToggle.textContent = savedLang === 'en' ? 'VI' : 'EN';

  if (langToggle) {
    langToggle.addEventListener('click', () => {
      const next = html.getAttribute('data-lang') === 'en' ? 'vi' : 'en';
      html.setAttribute('data-lang', next);
      localStorage.setItem('lang', next);
      langToggle.textContent = next === 'en' ? 'VI' : 'EN';
    });
  }

  // Experience timeline Intersection Observer
  const expItems = document.querySelectorAll('.exp-item');
  if (expItems.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -15% 0px', // trigger slightly before it hits the bottom
      threshold: 0.1
    });

    expItems.forEach(item => {
      observer.observe(item);
    });
  }

  // Table of Contents Active Highlighting (for Docs pages)
  const tocLinks = document.querySelectorAll('.toc-list a');
  if (tocLinks.length > 0) {
    const headings = Array.from(tocLinks).map(link => {
      const id = link.getAttribute('href').substring(1);
      return document.getElementById(id);
    }).filter(h => h);

    if (headings.length > 0) {
      const tocObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            tocLinks.forEach(link => link.classList.remove('active'));
            const activeLink = document.querySelector(`.toc-list a[href="#${entry.target.id}"]`);
            if (activeLink) {
              activeLink.classList.add('active');
            }
          }
        });
      }, {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0
      });

      headings.forEach(heading => tocObserver.observe(heading));
    }
  }


// ==========================================
//  FEEDBACK SYSTEM (No-DB: localStorage + Web3Forms email)
//  To enable email: replace YOUR_WEB3FORMS_KEY with your
//  free access key from https://web3forms.com
// ==========================================

const FEEDBACK_STORAGE_KEY = 'portfolio_feedbacks_v1';
const WEB3FORMS_KEY = 'YOUR_WEB3FORMS_KEY'; // <-- replace this

// ---- Utilities ----
function getFeedbacks() {
  try {
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveFeedback(projectId, entry) {
  const all = getFeedbacks();
  if (!all[projectId]) all[projectId] = [];
  all[projectId].unshift(entry); // newest first
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(all));
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---- Render feedback items into a project card ----
function renderFeedbacks(projectId) {
  const container = document.getElementById('feedbacks-' + projectId);
  const countEl   = document.getElementById('count-' + projectId);
  if (!container) return;

  const all = getFeedbacks();
  const items = all[projectId] || [];

  countEl && (countEl.textContent = items.length);

  if (items.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = items.map(fb => `
    <div class="feedback-item">
      <div class="feedback-item-header">
        <div>
          <div class="feedback-item-author">${escapeHtml(fb.name)}</div>
          <div class="feedback-item-pos">${escapeHtml(fb.position)}</div>
        </div>
        <div class="feedback-item-date">${formatDate(fb.date)}</div>
      </div>
      <p class="feedback-item-msg">${escapeHtml(fb.message)}</p>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

// ---- Render all on page load ----
function initFeedbackDisplay() {
  document.querySelectorAll('[id^="feedbacks-"]').forEach(el => {
    const projectId = el.id.replace('feedbacks-', '');
    renderFeedbacks(projectId);
  });
}

// ---- Modal logic ----
function initFeedbackModal() {
  const overlay   = document.getElementById('feedbackOverlay');
  const closeBtn  = document.getElementById('fbClose');
  const form      = document.getElementById('feedbackForm');
  const successEl = document.getElementById('fbSuccess');
  const submitBtn = document.getElementById('fbSubmitBtn');
  const modalTitle = document.getElementById('fb-modal-title');

  if (!overlay) return;

  // Open modal
  document.querySelectorAll('.proj-feedback-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const projectId   = btn.getAttribute('data-project-id');
      const projectName = btn.getAttribute('data-project-name');
      document.getElementById('fb-project-id').value    = projectId;
      document.getElementById('fb-project-label').value = projectName;
      modalTitle.textContent = projectName;
      successEl.hidden = false;
      successEl.hidden = true;
      form.reset();
      form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      setTimeout(() => document.getElementById('fb-name').focus(), 100);
    });
  });

  // Close modal
  function closeModal() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    let valid = true;
    ['fb-name', 'fb-position', 'fb-message'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        el.classList.add('error');
        valid = false;
      } else {
        el.classList.remove('error');
      }
    });
    if (!valid) return;

    const projectId   = document.getElementById('fb-project-id').value;
    const projectName = document.getElementById('fb-project-label').value;
    const name        = document.getElementById('fb-name').value.trim();
    const position    = document.getElementById('fb-position').value.trim();
    const email       = document.getElementById('fb-email').value.trim();
    const message     = document.getElementById('fb-message').value.trim();

    // Show loading
    const btnText    = submitBtn.querySelector('.fb-btn-text, [class*="lang-"]');
    const btnLoading = submitBtn.querySelector('.fb-btn-loading');
    submitBtn.disabled = true;
    submitBtn.querySelectorAll('.fb-btn-text').forEach(el => el.hidden = true);
    if (btnLoading) btnLoading.hidden = false;

    // Save to localStorage immediately
    const entry = { name, position, email, message, date: new Date().toISOString() };
    saveFeedback(projectId, entry);
    renderFeedbacks(projectId);

    // Try sending to Web3Forms (fire-and-forget; fails silently if key not set)
    if (WEB3FORMS_KEY && WEB3FORMS_KEY !== 'YOUR_WEB3FORMS_KEY') {
      try {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `[Portfolio Feedback] ${projectName}`,
            from_name: `${name} — ${position}`,
            email: email || 'noreply@portfolio',
            message: `Project: ${projectName}\n\n${message}`,
          })
        });
      } catch (_) { /* silent */ }
    }

    // Simulate slight delay then show success
    await new Promise(r => setTimeout(r, 800));

    submitBtn.disabled = false;
    submitBtn.querySelectorAll('.fb-btn-text').forEach(el => el.hidden = false);
    if (btnLoading) btnLoading.hidden = true;
    successEl.hidden = false;

    setTimeout(closeModal, 2500);
  });
}

initFeedbackDisplay();
initFeedbackModal();
});
