const STATE_KEY = 'manual_prompt_album_v2_state';

const galleryEl = document.getElementById('gallery');
const categoryTabsEl = document.getElementById('categoryTabs');
const promptCountEl = document.getElementById('promptCount');
const heroPromptCountEl = document.getElementById('heroPromptCount');
const heroCategoryCountEl = document.getElementById('heroCategoryCount');
const searchEl = document.getElementById('globalSearch');
const emptyStateEl = document.getElementById('emptyState');
const detailViewEl = document.getElementById('detailView');
const detailImageEl = document.getElementById('detailImage');
const detailCategoryEl = document.getElementById('detailCategory');
const detailAccentEl = document.getElementById('detailAccent');
const detailTitleEl = document.getElementById('detailTitle');
const detailDescriptionEl = document.getElementById('detailDescription');
const detailTagsEl = document.getElementById('detailTags');
const detailVarCountEl = document.getElementById('detailVarCount');
const detailCharCountEl = document.getElementById('detailCharCount');
const variablesFormEl = document.getElementById('variablesForm');
const outputEl = document.getElementById('output');
const outputStateEl = document.getElementById('outputState');
const copyTemplateBtn = document.getElementById('copyTemplateBtn');
const copyGeneratedBtn = document.getElementById('copyGeneratedBtn');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toastEl = document.getElementById('toast');

const categories = ['الكل', ...new Set(PROMPT_LIBRARY.map(prompt => prompt.category))];

let activePrompt = null;
let activeCategory = 'الكل';
let searchTerm = '';
let savedFieldValues = {};
let toastTimer = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    activeCategory = parsed.activeCategory || 'الكل';
    searchTerm = parsed.searchTerm || '';
    savedFieldValues = parsed.fieldValues || {};
    const selectedId = parsed.selectedPromptId;
    activePrompt = PROMPT_LIBRARY.find(prompt => prompt.id === selectedId) || null;
  } catch {
    activeCategory = 'الكل';
    searchTerm = '';
    savedFieldValues = {};
    activePrompt = null;
  }
}

function saveState() {
  const payload = {
    activeCategory,
    searchTerm,
    selectedPromptId: activePrompt?.id || null,
    fieldValues: savedFieldValues
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(payload));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeArabic(str) {
  return String(str)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function slugifyArabic(str) {
  return String(str)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function getFilteredPrompts() {
  const normalizedSearch = normalizeArabic(searchTerm);
  return PROMPT_LIBRARY.filter(prompt => {
    const matchesCategory = activeCategory === 'الكل' || prompt.category === activeCategory;
    const haystack = normalizeArabic([
      prompt.title,
      prompt.category,
      prompt.description,
      ...(prompt.tags || [])
    ].join(' '));
    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });
}

function getCategoryCount(category) {
  if (category === 'الكل') return PROMPT_LIBRARY.length;
  return PROMPT_LIBRARY.filter(prompt => prompt.category === category).length;
}

function renderStats() {
  heroPromptCountEl.textContent = PROMPT_LIBRARY.length;
  heroCategoryCountEl.textContent = categories.length - 1;
}

function renderTabs() {
  categoryTabsEl.innerHTML = categories.map(category => `
    <button class="tab-btn ${category === activeCategory ? 'active' : ''}" data-category="${escapeHtml(category)}">
      ${escapeHtml(category)}
      <small>${getCategoryCount(category)}</small>
    </button>
  `).join('');

  categoryTabsEl.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      saveState();
      renderTabs();
      renderGallery();
    });
  });
}

function renderGallery() {
  const prompts = getFilteredPrompts();
  promptCountEl.textContent = `${prompts.length} نموذج`;

  if (!prompts.length) {
    galleryEl.innerHTML = `
      <div class="empty-state" style="min-height: 240px; padding: 28px;">
        <div>
          <div class="empty-icon" style="margin-bottom:12px;">⌕</div>
          <h2 style="margin-bottom:10px;">لا توجد نتائج</h2>
          <p>جرّب كلمة بحث أخرى أو بدّل التصنيف.</p>
        </div>
      </div>
    `;
    return;
  }

  galleryEl.innerHTML = prompts.map(prompt => `
    <article class="prompt-card ${activePrompt?.id === prompt.id ? 'active' : ''}" data-id="${prompt.id}">
      <img src="${prompt.image}" alt="${escapeHtml(prompt.title)}" loading="lazy" />
      <div>
        <span class="badge">${escapeHtml(prompt.category)}</span>
        <h3>${escapeHtml(prompt.title)}</h3>
        <p>${escapeHtml(prompt.description)}</p>
      </div>
    </article>
  `).join('');

  galleryEl.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = PROMPT_LIBRARY.find(item => item.id === card.dataset.id);
      if (!prompt) return;
      selectPrompt(prompt);
      renderGallery();
    });
  });
}

function getFieldValue(promptId, key, fallback = '') {
  return savedFieldValues[promptId]?.[key] ?? fallback;
}

function setFieldValue(promptId, key, value) {
  if (!savedFieldValues[promptId]) savedFieldValues[promptId] = {};
  savedFieldValues[promptId][key] = value;
}

function buildField(field) {
  const currentValue = getFieldValue(activePrompt.id, field.key, field.default ?? '');
  const helpHtml = field.help ? `<small class="field-help">${escapeHtml(field.help)}</small>` : '';

  if (field.type === 'textarea') {
    return `
      <div class="field">
        <label for="${field.key}">${escapeHtml(field.label)}</label>
        <textarea id="${field.key}" name="${field.key}" rows="5">${escapeHtml(currentValue)}</textarea>
        ${helpHtml}
      </div>
    `;
  }

  return `
    <div class="field">
      <label for="${field.key}">${escapeHtml(field.label)}</label>
      <input id="${field.key}" name="${field.key}" type="text" value="${escapeHtml(currentValue)}" />
      ${helpHtml}
    </div>
  `;
}

function readVariables() {
  const values = {};
  if (!activePrompt) return values;

  activePrompt.variables.forEach(field => {
    const element = document.getElementById(field.key);
    values[field.key] = element ? element.value.trim() : '';
  });

  return values;
}

function generateOutput() {
  if (!activePrompt) return;

  const values = readVariables();
  Object.entries(values).forEach(([key, value]) => setFieldValue(activePrompt.id, key, value));

  let finalPrompt = activePrompt.template;
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    finalPrompt = finalPrompt.replace(pattern, value || '');
  }

  outputEl.value = finalPrompt;
  detailCharCountEl.textContent = finalPrompt.length.toLocaleString('ar');
  outputStateEl.textContent = 'تم التحديث';
  saveState();

  clearTimeout(generateOutput._timer);
  generateOutput._timer = setTimeout(() => {
    outputStateEl.textContent = 'يتحدث تلقائيًا';
  }, 1100);
}

function resetVariables() {
  if (!activePrompt) return;

  activePrompt.variables.forEach(field => {
    const element = document.getElementById(field.key);
    const defaultValue = field.default ?? '';
    if (element) element.value = defaultValue;
    setFieldValue(activePrompt.id, field.key, defaultValue);
  });

  generateOutput();
  showToast('أُعيدت القيم الافتراضية لهذا البرومبت.');
}

function renderPromptDetails(prompt) {
  detailImageEl.src = prompt.image;
  detailImageEl.alt = prompt.title;
  detailCategoryEl.textContent = prompt.category;
  detailAccentEl.textContent = prompt.accentLabel || 'جاهز';
  detailTitleEl.textContent = prompt.title;
  detailDescriptionEl.textContent = prompt.description;
  detailVarCountEl.textContent = String(prompt.variables.length);
  detailTagsEl.innerHTML = (prompt.tags || []).map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('');
  variablesFormEl.innerHTML = prompt.variables.map(buildField).join('');
}

function selectPrompt(prompt) {
  activePrompt = prompt;
  saveState();

  emptyStateEl.classList.add('hidden');
  detailViewEl.classList.remove('hidden');

  renderPromptDetails(prompt);
  generateOutput();
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch {
    showToast('تعذر النسخ التلقائي، انسخ النص يدويًا من الحقل.');
  }
}

function downloadPrompt() {
  if (!activePrompt) return;
  const fileName = `${slugifyArabic(activePrompt.title)}.txt`;
  const blob = new Blob([outputEl.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('تم تنزيل ملف البرومبت.');
}

searchEl.addEventListener('input', event => {
  searchTerm = event.target.value;
  saveState();
  renderGallery();
});

variablesFormEl.addEventListener('input', generateOutput);
generateBtn.addEventListener('click', generateOutput);
resetBtn.addEventListener('click', resetVariables);
copyTemplateBtn.addEventListener('click', () => {
  if (activePrompt) copyText(activePrompt.template, 'تم نسخ القالب الأصلي.');
});
copyGeneratedBtn.addEventListener('click', () => copyText(outputEl.value, 'تم نسخ البرومبت الناتج.'));
downloadBtn.addEventListener('click', downloadPrompt);

loadState();
renderStats();
searchEl.value = searchTerm;
renderTabs();
renderGallery();

if (!activePrompt && PROMPT_LIBRARY.length) {
  activePrompt = PROMPT_LIBRARY[0];
}

if (activePrompt) {
  selectPrompt(activePrompt);
  renderGallery();
}
