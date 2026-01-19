const textArea = document.getElementById('textArea');
const submitBtn = document.getElementById('submitBtn');
const plusBtn = document.getElementById('plusBtn');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
let uploadedFiles = [];
const chatComparison = document.getElementById('chatComparison');
const chatSections = document.getElementById('chatSections');
const limitBtn = document.getElementById('limitBtn');
const modalOverlay3 = document.getElementById('modalOverlay3');

const limitFillEls = {
  Gemini: document.getElementById('limitFillGemini'),
  Groq: document.getElementById('limitFillGroq'),
  'Hugging Face': document.getElementById('limitFillHf')
};

const limitTooltipEls = {
  Gemini: document.getElementById('limitTooltipGemini'),
  Groq: document.getElementById('limitTooltipGroq'),
  'Hugging Face': document.getElementById('limitTooltipHf')
};

let selectedAIs = [];
const limits = {
  Gemini: { total: 10, remaining: 10 },
  Groq: { total: 10, remaining: 10 },
  'Hugging Face': { total: 10, remaining: 10 }
};

function updateLimitDisplay(ai) {
  const data = limits[ai];
  const total = data.total;
  const remaining = data.remaining;
  const used = total - remaining;
  const percent = total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0;
  limitFillEls[ai].style.width = `${percent}%`;
  limitTooltipEls[ai].textContent = `${Math.round(percent)}%`;
}

Object.keys(limits).forEach(updateLimitDisplay);

function updateSubmitVisibility() {
	if (textArea.value.trim() || uploadedFiles.length > 0) {
		submitBtn.classList.add('show');
	} else {
		submitBtn.classList.remove('show');
	}
}

textArea.addEventListener('input', function() {
	this.style.height = '40px';
	const scrollHeight = this.scrollHeight;
	const maxHeight = 200;
	this.style.height = Math.min(scrollHeight, maxHeight) + 'px';

	updateSubmitVisibility();
});

textArea.addEventListener('dragover', function(e) {
	e.preventDefault();
	e.stopPropagation();
	this.style.background = 'rgba(59, 130, 246, 0.1)';
});

textArea.addEventListener('dragleave', function(e) {
	e.preventDefault();
	e.stopPropagation();
	this.style.background = 'transparent';
});

textArea.addEventListener('drop', function(e) {
	e.preventDefault();
	e.stopPropagation();
	this.style.background = 'transparent';
	const files = Array.from(e.dataTransfer.files);
	handleFiles(files);
});

fileInput.addEventListener('change', function(e) {
	const files = Array.from(e.target.files);
	handleFiles(files);
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
				item.innerHTML = `
					<div class="image_preview">
						<img src="${e.target.result}" alt="${file.name}">
						<button class="file_remove_overlay" onclick="removeFile(${index})">&times;</button>
					</div>
				`;
			};
			reader.readAsDataURL(file);
		} else {
			const name = file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name;
			item.innerHTML = `<span>📄 ${name}</span><button class="file_remove" onclick="removeFile(${index})">&times;</button>`;
		}

		filePreview.appendChild(item);
	});
}

window.removeFile = function(index) {
	uploadedFiles.splice(index, 1);
	displayFilePreview();
	updateSubmitVisibility();
};

function addMessage(container, text, type) {
	if (type === 'ai') {
		const lines = text.split('\n').filter(line => line.trim());
		lines.forEach(line => {
			const msg = document.createElement('div');
			msg.className = 'ai_message_text';
			msg.textContent = line;
			container.appendChild(msg);
		});
	}
	container.scrollTop = container.scrollHeight;
}

function createChatSection(userQuestion, files, aiLeft, aiRight) {
	const section = document.createElement('div');
	section.className = 'chat_section';

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

	const columns = document.createElement('div');
	columns.className = 'ai_columns';

	const leftCol = document.createElement('div');
	leftCol.className = 'ai_column';
	const leftHeader = document.createElement('div');
	leftHeader.className = 'ai_header';
	const leftName = document.createElement('span');
	leftName.className = 'ai_name';
	leftName.textContent = aiLeft;
	leftHeader.appendChild(leftName);
	const leftMsgs = document.createElement('div');
	leftMsgs.className = 'chat_messages';
	leftCol.appendChild(leftHeader);
	leftCol.appendChild(leftMsgs);

	const rightCol = document.createElement('div');
	rightCol.className = 'ai_column';
	const rightHeader = document.createElement('div');
	rightHeader.className = 'ai_header';
	const rightName = document.createElement('span');
	rightName.className = 'ai_name';
	rightName.textContent = aiRight;
	rightHeader.appendChild(rightName);
	const rightMsgs = document.createElement('div');
	rightMsgs.className = 'chat_messages';
	rightCol.appendChild(rightHeader);
	rightCol.appendChild(rightMsgs);

	columns.appendChild(leftCol);
	columns.appendChild(rightCol);

	section.appendChild(userBar);
	section.appendChild(columns);

	return { section, leftMsgs, rightMsgs };
}

function addLoadingIndicator(container) {
	const loading = document.createElement('div');
	loading.className = 'ai_message_loading';
	loading.innerHTML = '<div class="typing_indicator"><span></span><span></span><span></span></div>';
	container.appendChild(loading);
	container.scrollTop = container.scrollHeight;
	return loading;
}

async function callAIAPI(aiName, userQuestion, container) {
	const loadingBubble = addLoadingIndicator(container);

	try {
		const response = await fetch('http://localhost:3000/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				ai: aiName,
				prompt: userQuestion
			})
		});

		const data = await response.json();
		loadingBubble.remove();

		if (data.response) {
			addMessage(container, data.response, 'ai');
		} else {
			addMessage(container, 'Error: Tidak dapat mengambil response dari AI', 'ai');
		}
	} catch (error) {
		loadingBubble.remove();
		addMessage(container, `Error: ${error.message}`, 'ai');
	}
}

async function handleSubmit() {
	if ((textArea.value.trim() || uploadedFiles.length > 0) && selectedAIs.length === 2) {
		const blocked = selectedAIs.some((ai) => limits[ai].remaining <= 0);
		if (blocked) {
			showNotificationLimit();
			return;
		}
		const userQuestion = textArea.value.trim();

		chatComparison.classList.add('active');

		const { section, leftMsgs, rightMsgs } = createChatSection(
			userQuestion,
			uploadedFiles,
			selectedAIs[0],
			selectedAIs[1]
		);
		chatSections.appendChild(section);

		await Promise.all([
			callAIAPI(selectedAIs[0], userQuestion, leftMsgs),
			callAIAPI(selectedAIs[1], userQuestion, rightMsgs)
		]);

		selectedAIs.forEach((ai) => {
			limits[ai].remaining = Math.max(0, limits[ai].remaining - 1);
			updateLimitDisplay(ai);
		});

		textArea.value = '';
		textArea.style.height = '40px';
		updateSubmitVisibility();
		uploadedFiles = [];
		filePreview.innerHTML = '';
	} else if (selectedAIs.length < 2) {
		showNotificationSelect();
	}
}

submitBtn.addEventListener('click', handleSubmit);

textArea.addEventListener('keydown', function(e) {
	if (e.key === 'Enter' && !e.shiftKey) {
		e.preventDefault();
		handleSubmit();
	}
});

plusBtn.addEventListener('click', function() {
	const modal = document.getElementById('modalOverlay');
	modal.classList.toggle('show');
});

limitBtn.addEventListener('click', function() {
	modalOverlay3.classList.toggle('show');
	document.getElementById('modalOverlay').classList.remove('show');
	document.getElementById('modalOverlay2').classList.remove('show');
});

modalOverlay3.addEventListener('click', function(e) {
	if (e.target === this) {
		this.classList.remove('show');
	}
});

document.getElementById('modalOverlay').addEventListener('click', function(e) {
	if (e.target === this) {
		this.classList.remove('show');
	}
});

document.getElementById('menu_item').addEventListener('click', function() {
	fileInput.click();
	document.getElementById('modalOverlay').classList.remove('show');
});

document.getElementById('menu_item2').addEventListener('click', function() {
	const modal2 = document.getElementById('modalOverlay2');
	modal2.classList.toggle('show');
	document.getElementById('modalOverlay').classList.remove('show');
});

document.getElementById('modalOverlay2').addEventListener('click', function(e) {
	if (e.target === this) {
		this.classList.remove('show');
	}
});

const aiCheckboxes = document.querySelectorAll('.ai-checkbox');
const aiNames = ['Gemini', 'Groq', 'Hugging Face'];

aiCheckboxes.forEach((checkbox) => {
	checkbox.addEventListener('change', function() {
		const checkedBoxes = document.querySelectorAll('.ai-checkbox:checked');

		if (this.checked && checkedBoxes.length > 2) {
			this.checked = false;
			showNotificationMax();
		} else {
			selectedAIs = Array.from(checkedBoxes).map((cb) => {
				const cbIndex = Array.from(aiCheckboxes).indexOf(cb);
				return aiNames[cbIndex];
			});

			if (selectedAIs.length === 2) {
				chatSections.innerHTML = '';
			}
		}
	});
});

function showNotificationMax() {
	const notifCard = document.getElementById('notificationMax');
	notifCard.classList.add('show');
	setTimeout(() => {
		notifCard.classList.remove('show');
	}, 3000);
}

function showNotificationSelect() {
	const notifCard = document.getElementById('notificationSelect');
	notifCard.classList.add('show');
	setTimeout(() => {
		notifCard.classList.remove('show');
	}, 3000);
}

function showNotificationLimit() {
	const notifCard = document.getElementById('notificationLimit');
	notifCard.classList.add('show');
	setTimeout(() => {
		notifCard.classList.remove('show');
	}, 3000);
}
