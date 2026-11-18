// ==========================================
// 1. AUTH & SESSION SERVICE
// ==========================================
const USERS_DB_KEY = 'et_users_db_v1';
const SESSION_TOKEN_KEY = 'et_session_token_v1';

const AuthService = {
  getUsers() {
    return JSON.parse(localStorage.getItem(USERS_DB_KEY)) || [];
  },

  saveUsers(users) {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  },

  hashPassword(password) {
    return btoa(unescape(encodeURIComponent('et_salt_' + password)));
  },

  createToken(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      exp: Date.now() + 24 * 60 * 60 * 1000
    }));
    const signature = btoa(user.id + '_secret_sig');
    return `${header}.${payload}.${signature}`;
  },

  decodeToken(token) {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp < Date.now()) {
        this.logout();
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  },

  register({ name, email, password }) {
    const users = this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some((u) => u.email === normalizedEmail)) {
      return { ok: false, message: 'An account with this email already exists.' };
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: this.hashPassword(password),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    const token = this.createToken(newUser);
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    return { ok: true, user: this.decodeToken(token) };
  },

  login({ email, password }) {
    const users = this.getUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const hash = this.hashPassword(password);

    const matched = users.find((u) => u.email === normalizedEmail && u.passwordHash === hash);
    if (!matched) {
      return { ok: false, message: 'Invalid email or password.' };
    }

    const token = this.createToken(matched);
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    return { ok: true, user: this.decodeToken(token) };
  },

  getCurrentSession() {
    return this.decodeToken(localStorage.getItem(SESSION_TOKEN_KEY));
  },

  logout() {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
};

// ==========================================
// 2. USER-SCOPED DATA STORE
// ==========================================
const DEFAULT_CATEGORIES = {
  expense: ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Education', 'Other'],
  income: ['Salary', 'Allowance', 'Freelance', 'Scholarship', 'Gift', 'Other']
};

const DataStore = {
  getCustomCategories(userId) {
    return JSON.parse(localStorage.getItem(`et_custom_cats_${userId}`)) || { expense: [], income: [] };
  },

  saveCustomCategories(userId, customCats) {
    localStorage.setItem(`et_custom_cats_${userId}`, JSON.stringify(customCats));
  },

  getAllCategories(userId, type) {
    const custom = this.getCustomCategories(userId)[type] || [];
    return [...DEFAULT_CATEGORIES[type], ...custom];
  },

  getCombinedUniqueCategories(userId) {
    const exp = this.getAllCategories(userId, 'expense');
    const inc = this.getAllCategories(userId, 'income');
    return Array.from(new Set([...exp, ...inc]));
  },

  addCustomCategory(userId, type, name) {
    const clean = name.trim();
    if (!clean) return false;
    const all = this.getAllCategories(userId, type);
    if (all.some((c) => c.toLowerCase() === clean.toLowerCase())) return false;

    const custom = this.getCustomCategories(userId);
    custom[type].push(clean);
    this.saveCustomCategories(userId, custom);
    return true;
  },

  deleteCustomCategory(userId, type, name) {
    const custom = this.getCustomCategories(userId);
    custom[type] = custom[type].filter((c) => c !== name);
    this.saveCustomCategories(userId, custom);
  },

  getTransactions(userId) {
    return JSON.parse(localStorage.getItem(`et_tx_${userId}`)) || [];
  },

  saveTransactions(userId, list) {
    localStorage.setItem(`et_tx_${userId}`, JSON.stringify(list));
  },

  addTransaction(userId, tx) {
    const list = this.getTransactions(userId);
    list.push({ id: 'tx_' + Date.now(), ...tx });
    this.saveTransactions(userId, list);
  },

  updateTransaction(userId, updatedTx) {
    const list = this.getTransactions(userId).map((tx) =>
      tx.id === updatedTx.id ? updatedTx : tx
    );
    this.saveTransactions(userId, list);
  },

  deleteTransaction(userId, txId) {
    const list = this.getTransactions(userId).filter((tx) => tx.id !== txId);
    this.saveTransactions(userId, list);
  },

  getBudgets(userId) {
    return JSON.parse(localStorage.getItem(`et_budgets_${userId}`)) || {};
  },

  setCategoryBudget(userId, category, limit) {
    const budgets = this.getBudgets(userId);
    budgets[category] = limit;
    localStorage.setItem(`et_budgets_${userId}`, JSON.stringify(budgets));
  },

  removeCategoryBudget(userId, category) {
    const budgets = this.getBudgets(userId);
    delete budgets[category];
    localStorage.setItem(`et_budgets_${userId}`, JSON.stringify(budgets));
  }
};

// ==========================================
// 3. DOM ELEMENTS & STATE
// ==========================================
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');

const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authSubtitle = document.getElementById('auth-subtitle');
const authMessage = document.getElementById('auth-message');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const navUsername = document.getElementById('nav-username');
const navUseremail = document.getElementById('nav-useremail');
const logoutBtn = document.getElementById('logout-btn');
const budgetAlertBanner = document.getElementById('budget-alert-banner');

// Add Form & Quick Dates
const typeExpenseBtn = document.getElementById('type-expense-btn');
const typeIncomeBtn = document.getElementById('type-income-btn');
const txTypeInput = document.getElementById('tx-type');
const txForm = document.getElementById('tx-form');
const txAmountInput = document.getElementById('tx-amount');
const txCategorySelect = document.getElementById('tx-category');
const txDateInput = document.getElementById('tx-date');
const txNoteInput = document.getElementById('tx-note');
const txSubmitBtn = document.getElementById('tx-submit-btn');
const setTodayBtn = document.getElementById('set-today-btn');
const setYesterdayBtn = document.getElementById('set-yesterday-btn');

// Category Manager
const catModeLabel = document.getElementById('cat-mode-label');
const customCatForm = document.getElementById('custom-cat-form');
const customCatInput = document.getElementById('custom-cat-input');
const customCatTags = document.getElementById('custom-cat-tags');

// Dashboard KPIs & Chart
const summaryMonthInput = document.getElementById('summary-month');
const summarySpentEl = document.getElementById('summary-spent');
const summaryEarnedEl = document.getElementById('summary-earned');
const summaryBalanceEl = document.getElementById('summary-balance');
const summaryTopCatEl = document.getElementById('summary-top-cat');
const chartMonthLabel = document.getElementById('chart-month-label');
const chartEmptyMsg = document.getElementById('chart-empty-msg');
const pieCanvas = document.getElementById('spending-pie-chart');

// Budgets
const budgetForm = document.getElementById('budget-form');
const budgetCategorySelect = document.getElementById('budget-category-select');
const budgetLimitInput = document.getElementById('budget-limit-input');
const budgetProgressList = document.getElementById('budget-progress-list');

// Filters & Table
const filterFromInput = document.getElementById('filter-from');
const filterToInput = document.getElementById('filter-to');
const filterTypeSelect = document.getElementById('filter-type');
const filterCategorySelect = document.getElementById('filter-category');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const filteredCountEl = document.getElementById('filtered-count');
const txTableBody = document.getElementById('tx-table-body');
const tableEmptyEl = document.getElementById('table-empty');

// Edit Modal
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editTxForm = document.getElementById('edit-tx-form');
const editIdInput = document.getElementById('edit-id');
const editTypeSelect = document.getElementById('edit-type');
const editAmountInput = document.getElementById('edit-amount');
const editCategorySelect = document.getElementById('edit-category');
const editDateInput = document.getElementById('edit-date');
const editNoteInput = document.getElementById('edit-note');

// Delete Confirmation Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmMessageEl = document.getElementById('confirm-message');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

let spendingChartInstance = null;
let pendingDeleteAction = null;

function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getCurrentMonthString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

txDateInput.value = getLocalDateString(0);
summaryMonthInput.value = getCurrentMonthString();

// Open native calendar picker immediately on click
document.querySelectorAll('.calendar-input').forEach((input) => {
  input.addEventListener('click', () => {
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Fallback
      }
    }
  });
});

setTodayBtn.addEventListener('click', () => {
  txDateInput.value = getLocalDateString(0);
});

setYesterdayBtn.addEventListener('click', () => {
  txDateInput.value = getLocalDateString(-1);
});

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatINR(value) {
  return '₹' + Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ==========================================
// 4. DELETE CONFIRMATION DIALOG CONTROLLER
// ==========================================
function requestDeleteConfirmation(message, onConfirm) {
  confirmMessageEl.textContent = message;
  pendingDeleteAction = onConfirm;
  confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
  confirmModal.classList.add('hidden');
  pendingDeleteAction = null;
}

confirmCancelBtn.addEventListener('click', closeConfirmModal);
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) closeConfirmModal();
});

confirmDeleteBtn.addEventListener('click', () => {
  if (typeof pendingDeleteAction === 'function') {
    pendingDeleteAction();
  }
  closeConfirmModal();
});

// ==========================================
// 5. AUTH UI HANDLERS
// ==========================================
document.querySelectorAll('.toggle-pw-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const eyeOpen = btn.querySelector('.icon-eye');
    const eyeOff = btn.querySelector('.icon-eye-off');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    eyeOpen.classList.toggle('hidden', isHidden);
    eyeOff.classList.toggle('hidden', !isHidden);
  });
});

function showAuthMessage(text, type = 'error') {
  authMessage.textContent = text;
  authMessage.className = `auth-msg ${type}`;
}

function switchAuthTab(mode) {
  authMessage.className = 'auth-msg hidden';
  if (mode === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    authSubtitle.textContent = 'Sign in to access your financial dashboard.';
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    authSubtitle.textContent = 'Create a new account to start tracking.';
  }
}

tabLogin.addEventListener('click', () => switchAuthTab('login'));
tabRegister.addEventListener('click', () => switchAuthTab('register'));

registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const res = AuthService.register({
    name: document.getElementById('reg-name').value,
    email: document.getElementById('reg-email').value,
    password: document.getElementById('reg-password').value
  });
  if (!res.ok) return showAuthMessage(res.message, 'error');
  registerForm.reset();
  renderAppState();
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const res = AuthService.login({
    email: document.getElementById('login-email').value,
    password: document.getElementById('login-password').value
  });
  if (!res.ok) return showAuthMessage(res.message, 'error');
  loginForm.reset();
  renderAppState();
});

logoutBtn.addEventListener('click', () => {
  AuthService.logout();
  switchAuthTab('login');
  renderAppState();
});

// ==========================================
// 6. TRANSACTION FORM & CATEGORY MANAGER
// ==========================================
function setTransactionMode(type) {
  txTypeInput.value = type;
  catModeLabel.textContent = type;

  if (type === 'expense') {
    typeExpenseBtn.classList.add('active-expense');
    typeIncomeBtn.classList.remove('active-income');
    txSubmitBtn.textContent = 'Add Expense';
    txSubmitBtn.className = 'btn btn-primary';
  } else {
    typeIncomeBtn.classList.add('active-income');
    typeExpenseBtn.classList.remove('active-expense');
    txSubmitBtn.textContent = 'Add Income';
    txSubmitBtn.className = 'btn btn-primary btn-income';
  }

  renderCategoryUI();
}

typeExpenseBtn.addEventListener('click', () => setTransactionMode('expense'));
typeIncomeBtn.addEventListener('click', () => setTransactionMode('income'));

function renderCategoryUI() {
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const type = txTypeInput.value;
  const defaults = DEFAULT_CATEGORIES[type];
  const customs = DataStore.getCustomCategories(session.userId)[type] || [];
  const all = [...defaults, ...customs];

  txCategorySelect.innerHTML = all
    .map((cat) => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`)
    .join('');

  // Sync Budget Category Dropdown (Expense Categories Only)
  const expenseCats = DataStore.getAllCategories(session.userId, 'expense');
  const prevBudgetCat = budgetCategorySelect.value;
  budgetCategorySelect.innerHTML = expenseCats
    .map((cat) => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`)
    .join('');
  if (expenseCats.includes(prevBudgetCat)) {
    budgetCategorySelect.value = prevBudgetCat;
  }

  // Sync Filter Category Dropdown
  const prevFilterCat = filterCategorySelect.value;
  const combinedCats = DataStore.getCombinedUniqueCategories(session.userId);
  filterCategorySelect.innerHTML =
    `<option value="all">All Categories</option>` +
    combinedCats.map((cat) => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
  if (combinedCats.includes(prevFilterCat)) {
    filterCategorySelect.value = prevFilterCat;
  }

  // Render Category Pills
  customCatTags.innerHTML = '';
  defaults.forEach((cat) => {
    const span = document.createElement('span');
    span.className = 'cat-pill';
    span.textContent = cat;
    customCatTags.appendChild(span);
  });

  customs.forEach((cat) => {
    const span = document.createElement('span');
    span.className = 'cat-pill custom';
    span.innerHTML = `
      <span>${escapeHTML(cat)}</span>
      <button type="button" class="cat-del-btn" data-cat="${escapeHTML(cat)}" title="Remove custom category">✕</button>
    `;
    customCatTags.appendChild(span);
  });
}

customCatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const type = txTypeInput.value;
  const added = DataStore.addCustomCategory(session.userId, type, customCatInput.value);
  if (added) {
    customCatInput.value = '';
    renderCategoryUI();
    txCategorySelect.value = txCategorySelect.options[txCategorySelect.options.length - 1].value;
  }
});

customCatTags.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-del-btn');
  if (!btn) return;
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const catName = btn.dataset.cat;
  requestDeleteConfirmation(
    `Are you sure you want to delete the custom category "${catName}"?`,
    () => {
      DataStore.deleteCustomCategory(session.userId, txTypeInput.value, catName);
      renderCategoryUI();
      renderDashboard();
    }
  );
});

txForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const type = txTypeInput.value;
  const amount = parseFloat(txAmountInput.value);
  const category = txCategorySelect.value;
  const date = txDateInput.value;
  const note = txNoteInput.value.trim();

  if (isNaN(amount) || amount <= 0 || !category || !date || !note) return;

  DataStore.addTransaction(session.userId, { type, amount, category, date, note });

  txAmountInput.value = '';
  txNoteInput.value = '';
  txAmountInput.focus();
  renderDashboard();
});

// ==========================================
// 7. BUDGET SETTING, ALERTS & PIE CHART
// ==========================================
budgetForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const category = budgetCategorySelect.value;
  const limit = parseFloat(budgetLimitInput.value);
  if (!category || isNaN(limit) || limit <= 0) return;

  DataStore.setCategoryBudget(session.userId, category, limit);
  budgetLimitInput.value = '';
  renderDashboard();
});

budgetProgressList.addEventListener('click', (e) => {
  const btn = e.target.closest('.budget-remove-btn');
  if (!btn) return;
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const cat = btn.dataset.cat;
  requestDeleteConfirmation(
    `Are you sure you want to remove the monthly budget limit for "${cat}"?`,
    () => {
      DataStore.removeCategoryBudget(session.userId, cat);
      renderDashboard();
    }
  );
});

function renderPieChart(categorySpendMap, selectedMonth) {
  chartMonthLabel.textContent = selectedMonth;
  const labels = Object.keys(categorySpendMap);
  const values = Object.values(categorySpendMap);

  if (labels.length === 0) {
    pieCanvas.classList.add('hidden');
    chartEmptyMsg.classList.remove('hidden');
    if (spendingChartInstance) {
      spendingChartInstance.destroy();
      spendingChartInstance = null;
    }
    return;
  }

  pieCanvas.classList.remove('hidden');
  chartEmptyMsg.classList.add('hidden');

  const palette = [
    '#2dd4bf',
    '#38bdf8',
    '#fb7185',
    '#fbbf24',
    '#a78bfa',
    '#34d399',
    '#f472b6',
    '#60a5fa'
  ];

  if (spendingChartInstance) {
    spendingChartInstance.data.labels = labels;
    spendingChartInstance.data.datasets[0].data = values;
    spendingChartInstance.update();
    return;
  }

  spendingChartInstance = new Chart(pieCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette,
        borderColor: '#08121c',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#cbd5e1',
            font: { size: 12 },
            boxWidth: 12,
            padding: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatINR(ctx.raw)}`
          }
        }
      }
    }
  });
}

function renderBudgetsAndAlerts(userId, categorySpendMap) {
  const budgets = DataStore.getBudgets(userId);
  const budgetEntries = Object.entries(budgets);

  budgetProgressList.innerHTML = '';
  const overLimitCats = [];
  const nearLimitCats = [];

  if (budgetEntries.length === 0) {
    budgetProgressList.innerHTML =
      '<p class="empty-hint">No category limits set. Select a category above to set a monthly budget.</p>';
  } else {
    budgetEntries.forEach(([cat, limit]) => {
      const spent = categorySpendMap[cat] || 0;
      const ratio = limit > 0 ? spent / limit : 0;
      const pct = Math.min(Math.round(ratio * 100), 100);
      const rawPct = Math.round(ratio * 100);

      let stateClass = '';
      let fillClass = '';
      let badgeHTML = '';

      if (ratio >= 1) {
        stateClass = 'over-limit';
        fillClass = 'over';
        badgeHTML = `<span class="status-tag over">Over Limit (${rawPct}%)</span>`;
        overLimitCats.push(`${cat} (${formatINR(spent)} / ${formatINR(limit)})`);
      } else if (ratio >= 0.8) {
        stateClass = 'near-limit';
        fillClass = 'warn';
        badgeHTML = `<span class="status-tag warn">Near Limit (${rawPct}%)</span>`;
        nearLimitCats.push(`${cat} (${rawPct}%)`);
      }

      const item = document.createElement('div');
      item.className = `budget-item ${stateClass}`;
      item.innerHTML = `
        <div class="budget-top">
          <span class="budget-cat-name">${escapeHTML(cat)} ${badgeHTML}</span>
          <div class="budget-nums">
            <span>${formatINR(spent)} / ${formatINR(limit)}</span>
            <button type="button" class="budget-remove-btn" data-cat="${escapeHTML(cat)}" title="Remove limit">✕</button>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
        </div>
      `;
      budgetProgressList.appendChild(item);
    });
  }

  // Top Visual Budget Alert Banner
  if (overLimitCats.length > 0) {
    budgetAlertBanner.className = 'alert-banner danger';
    budgetAlertBanner.textContent = `Budget Exceeded Alert: You have crossed your monthly limit in ${overLimitCats.join(', ')}.`;
  } else if (nearLimitCats.length > 0) {
    budgetAlertBanner.className = 'alert-banner warning';
    budgetAlertBanner.textContent = `Budget Warning: You have used 80% or more of your monthly budget in ${nearLimitCats.join(', ')}.`;
  } else {
    budgetAlertBanner.className = 'alert-banner hidden';
    budgetAlertBanner.textContent = '';
  }
}

// ==========================================
// 8. MAIN DASHBOARD RENDERER & TABLE
// ==========================================
function renderDashboard() {
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const allTransactions = DataStore.getTransactions(session.userId);
  const selectedMonth = summaryMonthInput.value || getCurrentMonthString();
  const monthTransactions = allTransactions.filter((tx) => tx.date.startsWith(selectedMonth));

  // Monthly KPIs
  const totalEarned = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthExpenses = monthTransactions.filter((tx) => tx.type === 'expense');
  const totalSpent = monthExpenses.reduce((sum, tx) => sum + tx.amount, 0);
  const savings = totalEarned - totalSpent;

  // Spend per category for the selected month
  const categorySpendMap = {};
  monthExpenses.forEach((tx) => {
    categorySpendMap[tx.category] = (categorySpendMap[tx.category] || 0) + tx.amount;
  });

  const sortedExpenseCats = Object.entries(categorySpendMap).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedExpenseCats.length > 0 ? sortedExpenseCats[0][0] : '—';

  summarySpentEl.textContent = formatINR(totalSpent);
  summaryEarnedEl.textContent = formatINR(totalEarned);
  summaryBalanceEl.textContent = formatINR(savings);
  summaryBalanceEl.style.color = savings < 0 ? 'var(--expense)' : 'var(--accent)';
  summaryTopCatEl.textContent = topCategory;

  // Render Pie Chart & Category Budgets + Alerts
  renderPieChart(categorySpendMap, selectedMonth);
  renderBudgetsAndAlerts(session.userId, categorySpendMap);

  // Filter & Sort Transactions Table
  const fromDate = filterFromInput.value;
  const toDate = filterToInput.value;
  const typeFilter = filterTypeSelect.value;
  const categoryFilter = filterCategorySelect.value;

  const filtered = allTransactions
    .filter((tx) => {
      if (fromDate && tx.date < fromDate) return false;
      if (toDate && tx.date > toDate) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  filteredCountEl.textContent = filtered.length;
  txTableBody.innerHTML = '';
  tableEmptyEl.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((tx) => {
    const sign = tx.type === 'income' ? '+' : '-';
    const amtClass = tx.type === 'income' ? 'income-text' : 'expense-text';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${tx.date}</td>
      <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
      <td>${escapeHTML(tx.category)}</td>
      <td>${escapeHTML(tx.note)}</td>
      <td class="text-right ${amtClass}" style="font-weight: 700;">${sign}${formatINR(tx.amount)}</td>
      <td class="text-right">
        <div class="action-btns">
          <button type="button" class="row-btn edit-btn" data-id="${tx.id}">Edit</button>
          <button type="button" class="row-btn del del-btn" data-id="${tx.id}">Delete</button>
        </div>
      </td>
    `;
    txTableBody.appendChild(tr);
  });
}

summaryMonthInput.addEventListener('change', renderDashboard);
filterFromInput.addEventListener('change', renderDashboard);
filterToInput.addEventListener('change', renderDashboard);
filterTypeSelect.addEventListener('change', renderDashboard);
filterCategorySelect.addEventListener('change', renderDashboard);

resetFiltersBtn.addEventListener('click', () => {
  filterFromInput.value = '';
  filterToInput.value = '';
  filterTypeSelect.value = 'all';
  filterCategorySelect.value = 'all';
  renderDashboard();
});

// Table Row Actions (Edit & Delete with Confirmation)
txTableBody.addEventListener('click', (e) => {
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const delBtn = e.target.closest('.del-btn');
  if (delBtn) {
    const txId = delBtn.dataset.id;
    const tx = DataStore.getTransactions(session.userId).find((item) => item.id === txId);
    if (!tx) return;

    requestDeleteConfirmation(
      `Are you sure you want to delete "${tx.note}" (${formatINR(tx.amount)})?`,
      () => {
        DataStore.deleteTransaction(session.userId, txId);
        renderDashboard();
      }
    );
    return;
  }

  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) {
    const tx = DataStore.getTransactions(session.userId).find((item) => item.id === editBtn.dataset.id);
    if (!tx) return;
    openEditModal(tx);
  }
});

// Edit Modal Logic
function populateEditCategories(type, selectedCat) {
  const session = AuthService.getCurrentSession();
  if (!session) return;
  const cats = DataStore.getAllCategories(session.userId, type);
  if (selectedCat && !cats.includes(selectedCat)) cats.push(selectedCat);

  editCategorySelect.innerHTML = cats
    .map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`)
    .join('');
  if (selectedCat) editCategorySelect.value = selectedCat;
}

function openEditModal(tx) {
  editIdInput.value = tx.id;
  editTypeSelect.value = tx.type;
  editAmountInput.value = tx.amount;
  editDateInput.value = tx.date;
  editNoteInput.value = tx.note;
  populateEditCategories(tx.type, tx.category);
  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
}

editTypeSelect.addEventListener('change', () => {
  populateEditCategories(editTypeSelect.value, '');
});

closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

editTxForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const session = AuthService.getCurrentSession();
  if (!session) return;

  const updated = {
    id: editIdInput.value,
    type: editTypeSelect.value,
    amount: parseFloat(editAmountInput.value),
    category: editCategorySelect.value,
    date: editDateInput.value,
    note: editNoteInput.value.trim()
  };

  if (isNaN(updated.amount) || updated.amount <= 0 || !updated.date || !updated.note) return;

  DataStore.updateTransaction(session.userId, updated);
  closeEditModal();
  renderDashboard();
});

// Boot & Auth State
function renderAppState() {
  const session = AuthService.getCurrentSession();
  if (session) {
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    navUsername.textContent = session.name;
    navUseremail.textContent = session.email;
    setTransactionMode('expense');
    renderDashboard();
  } else {
    appView.classList.add('hidden');
    authView.classList.remove('hidden');
  }
}

renderAppState();