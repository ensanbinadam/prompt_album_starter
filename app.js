const galleryEl = document.getElementById('gallery');
const categoryTabsEl = document.getElementById('categoryTabs');
const promptCountEl = document.getElementById('promptCount');
const searchEl = document.getElementById('globalSearch');
const emptyStateEl = document.getElementById('emptyState');
const detailViewEl = document.getElementById('detailView');
const detailImageEl = document.getElementById('detailImage');
const detailCategoryEl = document.getElementById('detailCategory');
const detailTitleEl = document.getElementById('detailTitle');
const detailDescriptionEl = document.getElementById('detailDescription');
const variablesFormEl = document.getElementById('variablesForm');
const outputEl = document.getElementById('output');
const copyTemplateBtn = document.getElementById('copyTemplateBtn');
const copyGeneratedBtn = document.getElementById('copyGeneratedBtn');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');

let activePrompt = null;
let activeCategory = 'الكل';
let searchTerm = '';

const categories = ['الكل', ...new Set(PROMPT_LIBRARY.map(p => p.category))];

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTabs() {
  categoryTabsEl.innerHTML = categories.map(cat => `
    <button class="${cat === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
  `).join('');

  categoryTabsEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderTabs();
      renderGallery();
    });
  });
}

function getFilteredPrompts() {
  return PROMPT_LIBRARY.filter(p => {
    const matchesCategory = activeCategory === 'الكل' || p.category === activeCategory;
    const haystack = `${p.title} ${p.category} ${p.description}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function renderGallery() {
  const list = getFilteredPrompts();
  promptCountEl.textContent = `${list.length} نموذج`;
  galleryEl.innerHTML = list.map(prompt => `
    <article class="prompt-card ${activePrompt?.id === prompt.id ? 'active' : ''}" data-id="${prompt.id}">
      <img src="${prompt.image}" alt="${escapeHtml(prompt.title)}" />
      <div>
        <span class="badge">${escapeHtml(prompt.category)}</span>
        <h3>${escapeHtml(prompt.title)}</h3>
        <p>${escapeHtml(prompt.description)}</p>
      </div>
    </article>
  `).join('');

  galleryEl.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const selected = PROMPT_LIBRARY.find(p => p.id === card.dataset.id);
      selectPrompt(selected);
      renderGallery();
    });
  });
}

function buildField(field) {
  const value = field.default ?? '';
  if (field.type === 'textarea') {
    return `
      <div class="field">
        <label for="${field.key}">${escapeHtml(field.label)}</label>
        <textarea id="${field.key}" name="${field.key}" rows="4">${escapeHtml(value)}</textarea>
      </div>
    `;
  }
  return `
    <div class="field">
      <label for="${field.key}">${escapeHtml(field.label)}</label>
      <input id="${field.key}" name="${field.key}" type="text" value="${escapeHtml(value)}" />
    </div>
  `;
}

function selectPrompt(prompt) {
  activePrompt = prompt;
  emptyStateEl.classList.add('hidden');
  detailViewEl.classList.remove('hidden');

  detailImageEl.src = prompt.image;
  detailCategoryEl.textContent = prompt.category;
  detailTitleEl.textContent = prompt.title;
  detailDescriptionEl.textContent = prompt.description;
  variablesFormEl.innerHTML = prompt.variables.map(buildField).join('');
  generateOutput();
}

function readVariables() {
  const values = {};
  if (!activePrompt) return values;
  activePrompt.variables.forEach(field => {
    const el = document.getElementById(field.key);
    values[field.key] = el ? el.value.trim() : '';
  });
  return values;
}

function generateOutput() {
  if (!activePrompt) return;
  let result = activePrompt.template;
  const values = readVariables();
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  outputEl.value = result;
}

function resetVariables() {
  if (!activePrompt) return;
  activePrompt.variables.forEach(field => {
    const el = document.getElementById(field.key);
    if (el) el.value = field.default ?? '';
  });
  generateOutput();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    alert('تم النسخ بنجاح');
  } catch {
    alert('تعذر النسخ التلقائي، انسخ يدويًا من الحقل.');
  }
}

searchEl.addEventListener('input', e => {
  searchTerm = e.target.value;
  renderGallery();
});

generateBtn.addEventListener('click', generateOutput);
resetBtn.addEventListener('click', resetVariables);
copyTemplateBtn.addEventListener('click', () => activePrompt && copyText(activePrompt.template));
copyGeneratedBtn.addEventListener('click', () => copyText(outputEl.value));
variablesFormEl.addEventListener('input', generateOutput);

renderTabs();
renderGallery();
if (PROMPT_LIBRARY.length) {
  selectPrompt(PROMPT_LIBRARY[0]);
  renderGallery();
}
