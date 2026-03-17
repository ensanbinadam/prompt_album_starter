const STATE_KEY = 'manual_prompt_album_v3_state';
const BUILDER_KEY = 'manual_prompt_album_v3_builder';

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
const sendToStudioBtn = document.getElementById('sendToStudioBtn');
const jumpToStudioBtn = document.getElementById('jumpToStudioBtn');
const exportLibraryBtn = document.getElementById('exportLibraryBtn');
const studioSectionEl = document.getElementById('studioSection');
const toastEl = document.getElementById('toast');

const builderTitleEl = document.getElementById('builderTitle');
const builderIdEl = document.getElementById('builderId');
const builderCategoryEl = document.getElementById('builderCategory');
const builderAccentEl = document.getElementById('builderAccent');
const builderImageEl = document.getElementById('builderImage');
const builderDescriptionEl = document.getElementById('builderDescription');
const builderTagsEl = document.getElementById('builderTags');
const builderTemplateEl = document.getElementById('builderTemplate');
const builderVariablesEl = document.getElementById('builderVariables');
const builderOutputEl = document.getElementById('builderOutput');
const builderVariableCountEl = document.getElementById('builderVariableCount');
const buildSnippetBtn = document.getElementById('buildSnippetBtn');
const copySnippetBtn = document.getElementById('copySnippetBtn');
const downloadSnippetBtn = document.getElementById('downloadSnippetBtn');
const downloadJsSnippetBtn = document.getElementById('downloadJsSnippetBtn');
const addVariableBtn = document.getElementById('addVariableBtn');
const scanVariablesBtn = document.getElementById('scanVariablesBtn');
const builderResetBtn = document.getElementById('builderResetBtn');

const categories = ['الكل', ...new Set(PROMPT_LIBRARY.map(prompt => prompt.category))];

let activePrompt = null;
let activeCategory = 'الكل';
let searchTerm = '';
let savedFieldValues = {};
let toastTimer = null;
let builderState = getDefaultBuilderState();

function getDefaultBuilderState() {
  return {
    title: '',
    id: '',
    category: '',
    accentLabel: '',
    image: '',
    description: '',
    tags: '',
    template: '',
    variables: []
  };
}

function getDefaultVariable(index = 1) {
  return {
    key: `variable_${index}`,
    label: `المتغير ${index}`,
    type: 'text',
    default: '',
    help: ''
  };
}

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

function loadBuilderState() {
  try {
    const raw = localStorage.getItem(BUILDER_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    builderState = {
      ...getDefaultBuilderState(),
      ...parsed,
      variables: Array.isArray(parsed.variables) ? parsed.variables : []
    };
  } catch {
    builderState = getDefaultBuilderState();
  }
}

function saveBuilderState() {
  localStorage.setItem(BUILDER_KEY, JSON.stringify(builderState));
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

function slugifyArabic(str) {
  return String(str)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function slugifyId(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'a')
    .replace(/ى/g, 'y')
    .replace(/ة/g, 'h')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
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

function downloadBlob(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadPrompt() {
  if (!activePrompt) return;
  const fileName = `${slugifyArabic(activePrompt.title)}.txt`;
  downloadBlob(fileName, outputEl.value);
  showToast('تم تنزيل ملف البرومبت.');
}

function renderBuilderVariables() {
  if (!builderState.variables.length) {
    builderVariablesEl.innerHTML = `
      <div class="variable-card">
        <p class="help-note">لا توجد متغيرات بعد. أضف متغيرًا يدويًا أو دع الاستوديو يقرأ {{placeholders}} من القالب.</p>
      </div>
    `;
    builderVariableCountEl.textContent = '0 متغيرات';
    return;
  }

  builderVariablesEl.innerHTML = builderState.variables.map((item, index) => `
    <article class="variable-card" data-index="${index}">
      <div class="variable-card-head">
        <strong>${escapeHtml(item.label || item.key || `متغير ${index + 1}`)}</strong>
        <button class="remove-btn" type="button" data-remove-index="${index}">حذف</button>
      </div>
      <div class="variable-grid">
        <div class="field">
          <label>المفتاح</label>
          <input data-prop="key" data-index="${index}" type="text" value="${escapeHtml(item.key || '')}" placeholder="main_text" />
        </div>
        <div class="field">
          <label>الوسم الظاهر</label>
          <input data-prop="label" data-index="${index}" type="text" value="${escapeHtml(item.label || '')}" placeholder="النص الرئيسي" />
        </div>
        <div class="field">
          <label>النوع</label>
          <select data-prop="type" data-index="${index}">
            <option value="text" ${item.type === 'text' ? 'selected' : ''}>text</option>
            <option value="textarea" ${item.type === 'textarea' ? 'selected' : ''}>textarea</option>
          </select>
        </div>
        <div class="field">
          <label>القيمة الافتراضية</label>
          <input data-prop="default" data-index="${index}" type="text" value="${escapeHtml(item.default || '')}" placeholder="القيمة الافتراضية" />
        </div>
        <div class="field">
          <label>المساعدة</label>
          <input data-prop="help" data-index="${index}" type="text" value="${escapeHtml(item.help || '')}" placeholder="وصف قصير لهذا الحقل" />
        </div>
      </div>
    </article>
  `).join('');

  builderVariableCountEl.textContent = `${builderState.variables.length} متغيرات`;

  builderVariablesEl.querySelectorAll('[data-prop]').forEach(element => {
    element.addEventListener('input', event => {
      const index = Number(event.target.dataset.index);
      const prop = event.target.dataset.prop;
      if (!builderState.variables[index]) return;
      builderState.variables[index][prop] = event.target.value;
      saveBuilderState();
      buildBuilderSnippet();
    });
  });

  builderVariablesEl.querySelectorAll('[data-remove-index]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.removeIndex);
      builderState.variables.splice(index, 1);
      saveBuilderState();
      renderBuilderVariables();
      buildBuilderSnippet();
    });
  });
}

function fillBuilderInputs() {
  builderTitleEl.value = builderState.title;
  builderIdEl.value = builderState.id;
  builderCategoryEl.value = builderState.category;
  builderAccentEl.value = builderState.accentLabel;
  builderImageEl.value = builderState.image;
  builderDescriptionEl.value = builderState.description;
  builderTagsEl.value = builderState.tags;
  builderTemplateEl.value = builderState.template;
  renderBuilderVariables();
  buildBuilderSnippet();
}

function readBuilderInputs() {
  builderState.title = builderTitleEl.value.trim();
  builderState.id = builderIdEl.value.trim();
  builderState.category = builderCategoryEl.value.trim();
  builderState.accentLabel = builderAccentEl.value.trim();
  builderState.image = builderImageEl.value.trim();
  builderState.description = builderDescriptionEl.value.trim();
  builderState.tags = builderTagsEl.value.trim();
  builderState.template = builderTemplateEl.value;
  saveBuilderState();
}

function detectTemplateVariables(template) {
  const matches = [...String(template).matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)];
  return [...new Set(matches.map(match => match[1]))];
}

function scanTemplateVariables() {
  readBuilderInputs();
  const keys = detectTemplateVariables(builderState.template);
  if (!keys.length) {
    showToast('لم يتم العثور على متغيرات داخل القالب.');
    return;
  }

  const currentMap = new Map(builderState.variables.map(item => [item.key, item]));
  builderState.variables = keys.map((key, index) => {
    const existing = currentMap.get(key);
    return existing || {
      key,
      label: key,
      type: key.includes('text') || key.includes('message') ? 'textarea' : 'text',
      default: '',
      help: ''
    };
  });

  saveBuilderState();
  renderBuilderVariables();
  buildBuilderSnippet();
  showToast('تمت قراءة المتغيرات من القالب.');
}

function serializeObjectAsJs(data) {
  const tags = data.tagsArray.map(tag => `    ${JSON.stringify(tag)}`).join(',\n');
  const variables = data.variables.map(variable => `    { key: ${JSON.stringify(variable.key)}, label: ${JSON.stringify(variable.label)}, type: ${JSON.stringify(variable.type)}, default: ${JSON.stringify(variable.default)}, help: ${JSON.stringify(variable.help)} }`).join(',\n');
  const escapedTemplate = String(data.template)
    .replace(/`/g, '\\`')
    .replace(/\\\$\{/g, '\\\${');

  return `{
  id: ${JSON.stringify(data.id)},
  title: ${JSON.stringify(data.title)},
  category: ${JSON.stringify(data.category)},
  accentLabel: ${JSON.stringify(data.accentLabel)},
  image: ${JSON.stringify(data.image)},
  description: ${JSON.stringify(data.description)},
  tags: [
${tags}
  ],
  variables: [
${variables}
  ],
  template: \
\
\`${escapedTemplate}\`
}`;
}

function buildBuilderPayload() {
  readBuilderInputs();
  const title = builderState.title || 'برومبت جديد';
  const generatedId = slugifyId(builderState.id || builderState.title || `prompt_${Date.now()}`) || `prompt_${Date.now()}`;
  const tagsArray = builderState.tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

  const cleanedVariables = builderState.variables
    .map((item, index) => ({
      key: String(item.key || `variable_${index + 1}`).trim(),
      label: String(item.label || item.key || `المتغير ${index + 1}`).trim(),
      type: item.type === 'textarea' ? 'textarea' : 'text',
      default: String(item.default || ''),
      help: String(item.help || '')
    }))
    .filter(item => item.key);

  return {
    id: generatedId,
    title,
    category: builderState.category || 'غير مصنف',
    accentLabel: builderState.accentLabel || 'جاهز',
    image: builderState.image || 'assets/example.png',
    description: builderState.description || 'وصف مختصر لهذا النموذج.',
    tagsArray,
    variables: cleanedVariables,
    template: builderState.template || ''
  };
}

function buildBuilderSnippet() {
  const payload = buildBuilderPayload();
  builderOutputEl.value = serializeObjectAsJs(payload);
  builderIdEl.placeholder = payload.id;
  return payload;
}

function addBuilderVariable(variable = null) {
  const nextIndex = builderState.variables.length + 1;
  builderState.variables.push(variable || getDefaultVariable(nextIndex));
  saveBuilderState();
  renderBuilderVariables();
  buildBuilderSnippet();
}

function resetBuilder() {
  builderState = getDefaultBuilderState();
  saveBuilderState();
  fillBuilderInputs();
  showToast('تم مسح الاستوديو وإعادته للوضع الفارغ.');
}

function loadPromptIntoBuilder(prompt) {
  const promptValues = savedFieldValues[prompt.id] || {};
  builderState = {
    title: prompt.title,
    id: prompt.id,
    category: prompt.category,
    accentLabel: prompt.accentLabel || '',
    image: prompt.image,
    description: prompt.description,
    tags: (prompt.tags || []).join(', '),
    template: prompt.template,
    variables: (prompt.variables || []).map(item => ({
      key: item.key,
      label: item.label,
      type: item.type,
      default: promptValues[item.key] ?? item.default ?? '',
      help: item.help || ''
    }))
  };

  saveBuilderState();
  fillBuilderInputs();
  studioSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('تم إرسال البرومبت الحالي إلى الاستوديو لتعديله أو توليد نسخة جديدة منه.');
}

function exportLibraryJson() {
  const json = JSON.stringify(PROMPT_LIBRARY, null, 2);
  downloadBlob('prompt-library.json', json, 'application/json;charset=utf-8');
  showToast('تم تصدير المكتبة بصيغة JSON.');
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
sendToStudioBtn.addEventListener('click', () => {
  if (activePrompt) loadPromptIntoBuilder(activePrompt);
});
jumpToStudioBtn.addEventListener('click', () => {
  studioSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
exportLibraryBtn.addEventListener('click', exportLibraryJson);

[builderTitleEl, builderIdEl, builderCategoryEl, builderAccentEl, builderImageEl, builderDescriptionEl, builderTagsEl, builderTemplateEl]
  .forEach(element => element.addEventListener('input', () => {
    readBuilderInputs();
    buildBuilderSnippet();
  }));

addVariableBtn.addEventListener('click', () => addBuilderVariable());
scanVariablesBtn.addEventListener('click', scanTemplateVariables);
buildSnippetBtn.addEventListener('click', () => {
  buildBuilderSnippet();
  showToast('تم بناء الكائن الجاهز للمكتبة.');
});
copySnippetBtn.addEventListener('click', () => copyText(builderOutputEl.value, 'تم نسخ كائن البرومبت.'));
downloadSnippetBtn.addEventListener('click', () => {
  const payload = buildBuilderPayload();
  const json = JSON.stringify({
    id: payload.id,
    title: payload.title,
    category: payload.category,
    accentLabel: payload.accentLabel,
    image: payload.image,
    description: payload.description,
    tags: payload.tagsArray,
    variables: payload.variables,
    template: payload.template
  }, null, 2);
  downloadBlob(`${slugifyArabic(payload.title)}.json`, json, 'application/json;charset=utf-8');
  showToast('تم تنزيل الملف بصيغة JSON.');
});
downloadJsSnippetBtn.addEventListener('click', () => {
  const payload = buildBuilderPayload();
  downloadBlob(`${slugifyArabic(payload.title)}.js`, builderOutputEl.value, 'text/javascript;charset=utf-8');
  showToast('تم تنزيل الملف بصيغة JS.');
});
builderResetBtn.addEventListener('click', resetBuilder);

loadState();
loadBuilderState();
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

fillBuilderInputs();
