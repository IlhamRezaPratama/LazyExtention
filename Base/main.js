// ========================================
// Lazy Mahasigma — AI Compare Extension
// main.js v3.0 — Unified OpenRouter
// ========================================

// --- DOM Elements ---
const textArea = document.getElementById('textArea');
const submitBtn = document.getElementById('submitBtn');
const plusBtn = document.getElementById('plusBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const chatArea = document.getElementById('chatArea');
const chatSections = document.getElementById('chatSections');
const welcomeScreen = document.getElementById('welcomeScreen');
const limitBtn = document.getElementById('limitBtn');
const limitClose = document.getElementById('limitClose');
const modalOverlay3 = document.getElementById('modalOverlay3');

// --- State ---
let uploadedFiles = [];
let selectedAIs = []; // Array of { provider: 'GPT', tier: 'flash' }
let isLoading = false;

// --- AI Configuration ---
const AI_CONFIG = {
  GPT: {
    color: '#10A37F',
    tiers: {
      flash:  { label: 'Flash',  model: 'gpt-4o-mini',  icon: '⚡' },
      medium: { label: 'Medium', model: 'gpt-4o',       icon: '🔥' },
      high:   { label: 'High',   model: 'o4-mini',      icon: '💎' }
    }
  },
  Gemini: {
    color: '#4285F4',
    tiers: {
      flash:  { label: 'Flash',  model: 'gemini-2.0-flash', icon: '⚡' },
      medium: { label: 'Medium', model: 'gemini-2.5-flash', icon: '🔥' },
      high:   { label: 'High',   model: 'gemini-2.5-pro',   icon: '💎' }
    }
  },
  Claude: {
    color: '#D97706',
    tiers: {
      flash:  { label: 'Flash',  model: 'claude-3.5-haiku', icon: '⚡' },
      medium: { label: 'Medium', model: 'claude-sonnet-4',  icon: '🔥' },
      high:   { label: 'High',   model: 'claude-opus-4',    icon: '💎' }
    }
  }
};

const aiNames = ['GPT', 'Gemini', 'Claude'];

// --- Limit System ---
const limits = {
  GPT:    { total: 10, remaining: 10 },
  Gemini: { total: 10, remaining: 10 },
  Claude: { total: 10, remaining: 10 }
};

const limitFillEls = {
  GPT:    document.getElementById('limitFillGPT'),
  Gemini: document.getElementById('limitFillGemini'),
  Claude: document.getElementById('limitFillClaude')
};

const limitTooltipEls = {
  GPT:    document.getElementById('limitTooltipGPT'),
  Gemini: document.getElementById('limitTooltipGemini'),
  Claude: document.getElementById('limitTooltipClaude')
};

function updateLimitDisplay(ai) {
  const data = limits[ai];
  if (!data || !limitFillEls[ai]) return;
  const used = data.total - data.remaining;
  const percent = data.total > 0 ? Math.max(0, Math.min(100, (used / data.total) * 100)) : 0;
  limitFillEls[ai].style.width = `${percent}%`;
  limitTooltipEls[ai].textContent = `${Math.round(percent)}%`;
}

Object.keys(limits).forEach(updateLimitDisplay);

// --- Markdown Renderer ---
function renderMarkdown(text) {
  if (!text) return '';
  let html = text;

  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(match, lang, code) {
    const langLabel = lang ? `<span class="code_lang">${lang}</span>` : '';
    return `<pre class="code_block">${langLabel}<code>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline_code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold & italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

// --- Submit Button Visibility ---
function updateSubmitVisibility() {
  if (textArea.value.trim() || uploadedFiles.length > 0) {
    submitBtn.classList.add('show');
  } else {
    submitBtn.classList.remove('show');
  }
}

// --- Textarea Auto-Resize ---
textArea.addEventListener('input', function() {
  this.style.height = '24px';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  updateSubmitVisibility();
});

// --- File Handling ---
textArea.addEventListener('dragover', function(e) {
  e.preventDefault();
  e.stopPropagation();
});

textArea.addEventListener('drop', function(e) {
  e.preventDefault();
  e.stopPropagation();
  handleFiles(Array.from(e.dataTransfer.files));
});

// Support copy-paste screenshot
textArea.addEventListener('paste', function(e) {
  const items = e.clipboardData.items;
  const files = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      files.push(items[i].getAsFile());
    }
  }
  if (files.length > 0) {
    handleFiles(files);
  }
});

fileInput.addEventListener('change', function(e) {
  handleFiles(Array.from(e.target.files));
});

function handleFiles(files) {
  uploadedFiles = [...uploadedFiles, ...files];
  displayFilePreview();
  updateSubmitVisibility();
}

function displayFilePreview() {
  filePreview.innerHTML = '';
  uploadedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'file_item';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const previewDiv = document.createElement('div');
        previewDiv.className = 'image_preview';
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        
        const btn = document.createElement('button');
        btn.className = 'file_remove_overlay';
        btn.innerHTML = '&times;';
        btn.addEventListener('click', () => removeFile(index));
        
        previewDiv.appendChild(img);
        previewDiv.appendChild(btn);
        item.appendChild(previewDiv);
      };
      reader.readAsDataURL(file);
    } else {
      const name = file.name.length > 12 ? file.name.substring(0, 12) + '...' : file.name;
      const span = document.createElement('span');
      span.textContent = '📄 ' + name;
      
      const btn = document.createElement('button');
      btn.className = 'file_remove';
      btn.innerHTML = '&times;';
      btn.addEventListener('click', () => removeFile(index));
      
      item.appendChild(span);
      item.appendChild(btn);
    }

    filePreview.appendChild(item);
  });
}

window.removeFile = function(index) {
  uploadedFiles.splice(index, 1);
  displayFilePreview();
  updateSubmitVisibility();
};

// --- Chat UI ---
function addMessage(container, text, type) {
  if (type === 'ai') {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'md-content';
    msgDiv.innerHTML = renderMarkdown(text);
    container.appendChild(msgDiv);
  }
  container.scrollTop = container.scrollHeight;
}

function getAIDisplayName(provider, tier) {
  const config = AI_CONFIG[provider];
  if (!config) return provider;
  const tierInfo = config.tiers[tier];
  if (!tierInfo) return provider;
  return `${provider} · ${tierInfo.label}`;
}

function createChatSection(userQuestion, files, ai1, ai2) {
  const section = document.createElement('div');
  section.className = 'chat_section';
  section.style.animation = 'slideIn 0.3s ease';

  // User bubble
  const userBar = document.createElement('div');
  userBar.className = 'user_question_bar';

  const media = document.createElement('div');
  media.className = 'user_question_media';

  if (files.length > 0) {
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.className = 'user_question_image';
        img.src = URL.createObjectURL(file);
        img.onload = () => URL.revokeObjectURL(img.src);
        img.alt = file.name || 'image';
        media.appendChild(img);
      }
    });
  }

  const text = document.createElement('span');
  text.className = 'user_question_text user_question_bubble';
  text.textContent = userQuestion;
  text.style.display = userQuestion ? 'block' : 'none';

  userBar.appendChild(media);
  userBar.appendChild(text);

  // AI columns — now with provider + tier display
  const columns = document.createElement('div');
  columns.className = 'ai_columns';

  const leftCol = createAIColumn(ai1.provider, ai1.tier);
  const rightCol = createAIColumn(ai2.provider, ai2.tier);

  columns.appendChild(leftCol.column);
  columns.appendChild(rightCol.column);

  section.appendChild(userBar);
  section.appendChild(columns);

  return { section, leftMsgs: leftCol.messages, rightMsgs: rightCol.messages };
}

function createAIColumn(provider, tier) {
  const config = AI_CONFIG[provider] || { color: '#888', tiers: {} };
  const tierInfo = config.tiers[tier] || { label: tier, icon: '⚡' };
  const displayName = getAIDisplayName(provider, tier);

  const column = document.createElement('div');
  column.className = 'ai_column';

  const header = document.createElement('div');
  header.className = 'ai_header';
  header.style.borderTop = `2px solid ${config.color}`;

  const headerActions = document.createElement('div');
  headerActions.className = 'ai_header_actions';

  const name = document.createElement('span');
  name.className = 'ai_name';
  name.innerHTML = `<span class="ai-dot" style="background:${config.color};"></span> ${displayName}`;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy_btn';
  copyBtn.title = 'Copy response';
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>`;

  headerActions.appendChild(name);
  headerActions.appendChild(copyBtn);
  header.appendChild(headerActions);

  const messages = document.createElement('div');
  messages.className = 'chat_messages';

  copyBtn.addEventListener('click', () => {
    const textContent = messages.innerText || messages.textContent;
    navigator.clipboard.writeText(textContent).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      showNotification('notificationCopy');
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>`;
      }, 2000);
    });
  });

  column.appendChild(header);
  column.appendChild(messages);

  return { column, messages };
}

function addLoadingIndicator(container) {
  const loading = document.createElement('div');
  loading.className = 'ai_message_loading';
  loading.innerHTML = '<div class="typing_indicator"><span></span><span></span><span></span></div>';
  container.appendChild(loading);
  container.scrollTop = container.scrollHeight;
  return loading;
}

function getBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

async function callAIAPI(provider, tier, userQuestion, images, container) {
  const loadingBubble = addLoadingIndicator(container);

  try {
    const response = await fetch('https://lazymahasigma.vercel.app/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'oiXjLwPvFkECVUJZObuGg3zfmIBhtcRs'
      },
      body: JSON.stringify({
        ai: provider,
        tier: tier,
        prompt: userQuestion,
        images: images
      })
    });

    loadingBubble.remove();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.response) {
      addMessage(container, data.response, 'ai');
      if (data.responseTime) {
        const timeEl = document.createElement('div');
        timeEl.className = 'response_time';
        timeEl.textContent = `⚡ ${(data.responseTime / 1000).toFixed(1)}s`;
        container.appendChild(timeEl);
      }
    } else {
      addMessage(container, 'Error: Tidak dapat mengambil response dari AI', 'ai');
    }
  } catch (error) {
    loadingBubble.remove();
    addMessage(container, `⚠️ Error: ${error.message}`, 'ai');
  }
}

// --- Submit ---
async function handleSubmit() {
  if (isLoading) return;

  if ((textArea.value.trim() || uploadedFiles.length > 0) && selectedAIs.length === 2) {
    const blocked = selectedAIs.some((sel) => limits[sel.provider] && limits[sel.provider].remaining <= 0);
    if (blocked) {
      showNotification('notificationLimit');
      return;
    }

    const userQuestion = textArea.value.trim();
    isLoading = true;
    submitBtn.classList.add('loading');

    // Convert images to Base64
    const imageFiles = uploadedFiles.filter(f => f.type.startsWith('image/'));
    const base64Images = await Promise.all(imageFiles.map(f => getBase64(f)));

    // Show chat, hide welcome
    welcomeScreen.classList.add('hidden');
    chatArea.classList.add('active');

    const { section, leftMsgs, rightMsgs } = createChatSection(
      userQuestion, uploadedFiles, selectedAIs[0], selectedAIs[1]
    );
    chatSections.appendChild(section);
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Clear input
    textArea.value = '';
    textArea.style.height = '24px';
    updateSubmitVisibility();
    uploadedFiles = [];
    filePreview.innerHTML = '';

    await Promise.all([
      callAIAPI(selectedAIs[0].provider, selectedAIs[0].tier, userQuestion, base64Images, leftMsgs),
      callAIAPI(selectedAIs[1].provider, selectedAIs[1].tier, userQuestion, base64Images, rightMsgs)
    ]);

    selectedAIs.forEach((sel) => {
      if (limits[sel.provider]) {
        limits[sel.provider].remaining = Math.max(0, limits[sel.provider].remaining - 1);
        updateLimitDisplay(sel.provider);
      }
    });

    isLoading = false;
    submitBtn.classList.remove('loading');
  } else if (selectedAIs.length < 2) {
    showNotification('notificationSelect');
  }
}

submitBtn.addEventListener('click', handleSubmit);

textArea.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
});

// --- File Upload Button ---
plusBtn.addEventListener('click', function() {
  fileInput.click();
});

// --- Limit Modal ---
limitBtn.addEventListener('click', function() {
  modalOverlay3.classList.toggle('show');
});

limitClose.addEventListener('click', function() {
  modalOverlay3.classList.remove('show');
});

modalOverlay3.addEventListener('click', function(e) {
  if (e.target === this) {
    this.classList.remove('show');
  }
});

// ========================================
// AI Pill Selection + Tier Dropdown
// ========================================
const aiPillWrappers = document.querySelectorAll('.ai_pill_wrapper');

aiPillWrappers.forEach(wrapper => {
  const aiName = wrapper.dataset.ai;
  const pill = wrapper.querySelector('.ai_pill');
  const checkbox = wrapper.querySelector('.ai-checkbox');
  const dropdown = wrapper.querySelector('.tier_dropdown');
  const tierLabel = wrapper.querySelector('.ai_pill_tier_label');
  const tierOptions = wrapper.querySelectorAll('.tier_option');

  // Click pill → toggle dropdown (not checkbox directly)
  pill.addEventListener('click', function(e) {
    e.preventDefault(); // Prevent default checkbox behavior

    // If already selected, deselect
    if (checkbox.checked) {
      checkbox.checked = false;
      pill.classList.remove('selected');
      tierLabel.textContent = '';
      dropdown.classList.remove('show');
      wrapper.classList.remove('open');

      // Remove from selectedAIs
      selectedAIs = selectedAIs.filter(s => s.provider !== aiName);

      if (selectedAIs.length === 2) {
        chatSections.innerHTML = '';
      }
      return;
    }

    // Check if max 2 already selected
    if (selectedAIs.length >= 2) {
      showNotification('notificationMax');
      return;
    }

    // Close all other dropdowns first
    closeAllDropdowns();

    // Show this dropdown
    dropdown.classList.add('show');
    wrapper.classList.add('open');
  });

  // Tier option selected
  tierOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.stopPropagation();
      const tier = this.dataset.tier;
      const tierInfo = AI_CONFIG[aiName].tiers[tier];

      // Mark as selected
      checkbox.checked = true;
      pill.classList.add('selected');
      tierLabel.textContent = `· ${tierInfo.label}`;

      // Close dropdown
      dropdown.classList.remove('show');
      wrapper.classList.remove('open');

      // Highlight selected tier option
      tierOptions.forEach(o => o.classList.remove('active'));
      this.classList.add('active');

      // Update selectedAIs
      const existingIndex = selectedAIs.findIndex(s => s.provider === aiName);
      if (existingIndex >= 0) {
        selectedAIs[existingIndex].tier = tier;
      } else {
        selectedAIs.push({ provider: aiName, tier: tier });
      }

      if (selectedAIs.length === 2) {
        chatSections.innerHTML = '';
      }
    });
  });
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ai_pill_wrapper')) {
    closeAllDropdowns();
  }
});

function closeAllDropdowns() {
  document.querySelectorAll('.tier_dropdown').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.ai_pill_wrapper').forEach(w => w.classList.remove('open'));
}

// --- Notification ---
function showNotification(id) {
  const notifCard = document.getElementById(id);
  if (!notifCard) return;
  notifCard.classList.add('show');
  setTimeout(() => {
    notifCard.classList.remove('show');
  }, 3000);
}
