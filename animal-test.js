const MODEL_URL = "https://teachablemachine.withgoogle.com/models/UYLZO-RH2/";

const DOG_DESCRIPTIONS = [
    "충성스럽고 따뜻한 강아지상이에요! 🐶\n언제나 밝고 친근한 분위기로 주변 사람들을 편안하게 만들죠.\n활발하고 긍정적인 에너지가 넘쳐 함께 있으면 기분이 좋아져요.",
    "누구에게나 사랑받는 강아지상! 🐶\n솔직하고 순수한 매력이 돋보여요.\n따뜻한 마음씨로 사람들의 마음을 사로잡는 타입이에요.",
    "귀엽고 애교 넘치는 강아지상! 🐶\n밝은 미소와 활기찬 모습이 매력 포인트예요.\n함께 있으면 시간 가는 줄 모르는 에너지 넘치는 스타일이에요.",
];

const CAT_DESCRIPTIONS = [
    "도도하고 신비로운 고양이상이에요! 🐱\n쉽게 속마음을 드러내지 않는 쿨한 매력이 있죠.\n가까워질수록 더 매력적인 타입이에요.",
    "독립적이고 세련된 고양이상! 🐱\n자신만의 개성이 뚜렷하고 스타일리시한 분위기가 풍겨요.\n한번 매력에 빠지면 헤어나오기 힘든 타입이에요.",
    "우아하고 감각적인 고양이상! 🐱\n조용하지만 존재감이 강한 매력을 가졌어요.\n깊이 있는 내면의 아름다움이 느껴져요.",
];

let model = null;

// ── 테마 ──────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', theme);
}

themeToggle.addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

// ── 모델 로드 ──────────────────────────────────────────
async function ensureModel() {
    if (!model) {
        model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    }
}

// ── DOM 참조 ───────────────────────────────────────────
const uploadArea     = document.getElementById('upload-area');
const fileInput      = document.getElementById('file-input');
const uploadBtn      = document.getElementById('upload-btn');
const cameraBtn      = document.getElementById('camera-btn');

const webcamSection  = document.getElementById('webcam-section');
const webcamEl       = document.getElementById('webcam');
const captureBtn     = document.getElementById('capture-btn');
const cancelCameraBtn= document.getElementById('cancel-camera-btn');
const canvas         = document.getElementById('canvas');

const previewSection = document.getElementById('preview-section');
const previewImg     = document.getElementById('preview-img');
const analyzeBtn     = document.getElementById('analyze-btn');
const reuploadBtn    = document.getElementById('reupload-btn');

const loadingEl      = document.getElementById('loading');
const resultSection  = document.getElementById('result-section');
const resultImg      = document.getElementById('result-img');
const resultTitle    = document.getElementById('result-title');
const resultDesc     = document.getElementById('result-description');
const retryBtn       = document.getElementById('retry-btn');

const dogBar    = document.getElementById('dog-bar');
const catBar    = document.getElementById('cat-bar');
const dogPercent= document.getElementById('dog-percent');
const catPercent= document.getElementById('cat-percent');

// ── 파일 업로드 ────────────────────────────────────────
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadPreview(e.target.files[0]);
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadPreview(file);
});

function loadPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => showPreview(e.target.result);
    reader.readAsDataURL(file);
}

function showPreview(src) {
    previewImg.src = src;
    uploadArea.hidden = true;
    webcamSection.hidden = true;
    previewSection.hidden = false;
    resultSection.hidden = true;
}

// ── 카메라 촬영 ────────────────────────────────────────
let stream = null;

cameraBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        webcamEl.srcObject = stream;
        uploadArea.hidden = true;
        webcamSection.hidden = false;
    } catch {
        alert('카메라를 사용할 수 없어요. 사진을 직접 올려주세요.');
    }
});

captureBtn.addEventListener('click', () => {
    canvas.width = webcamEl.videoWidth;
    canvas.height = webcamEl.videoHeight;
    canvas.getContext('2d').drawImage(webcamEl, 0, 0);
    stopCamera();
    showPreview(canvas.toDataURL('image/jpeg'));
});

cancelCameraBtn.addEventListener('click', () => {
    stopCamera();
    webcamSection.hidden = true;
    uploadArea.hidden = false;
});

function stopCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    webcamSection.hidden = true;
}

// ── 다시 선택 ──────────────────────────────────────────
reuploadBtn.addEventListener('click', resetToUpload);

// ── 분석 ──────────────────────────────────────────────
analyzeBtn.addEventListener('click', async () => {
    previewSection.hidden = true;
    loadingEl.hidden = false;

    try {
        await ensureModel();
        const predictions = await model.predict(previewImg);
        loadingEl.hidden = true;
        showResult(predictions);
    } catch (err) {
        loadingEl.hidden = true;
        alert('분석 중 오류가 발생했어요. 다시 시도해주세요.');
        resetToUpload();
    }
});

function showResult(predictions) {
    let dogProb = 0, catProb = 0;

    predictions.forEach(p => {
        const name = p.className.toLowerCase();
        if (name.includes('dog') || name.includes('강아지')) {
            dogProb = p.probability;
        } else if (name.includes('cat') || name.includes('고양이')) {
            catProb = p.probability;
        }
    });

    // 클래스명이 다를 경우 인덱스로 fallback
    if (dogProb === 0 && catProb === 0 && predictions.length >= 2) {
        dogProb = predictions[0].probability;
        catProb = predictions[1].probability;
    }

    const dogPct = Math.round(dogProb * 100);
    const catPct = 100 - dogPct;
    const isDog = dogProb >= catProb;

    resultImg.src = previewImg.src;

    dogPercent.textContent = dogPct + '%';
    catPercent.textContent = catPct + '%';

    // 바 애니메이션
    dogBar.style.width = '0%';
    catBar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
        dogBar.style.width = dogPct + '%';
        catBar.style.width = catPct + '%';
    }));

    resultTitle.textContent = isDog ? '🐶 강아지상!' : '🐱 고양이상!';
    resultTitle.className = 'result-title ' + (isDog ? 'dog' : 'cat');

    const pool = isDog ? DOG_DESCRIPTIONS : CAT_DESCRIPTIONS;
    resultDesc.textContent = pool[Math.floor(Math.random() * pool.length)];

    resultSection.hidden = false;
}

// ── 다시 테스트 ────────────────────────────────────────
retryBtn.addEventListener('click', resetToUpload);

function resetToUpload() {
    resultSection.hidden = true;
    previewSection.hidden = true;
    loadingEl.hidden = true;
    uploadArea.hidden = false;
    fileInput.value = '';
    previewImg.src = '';
    dogBar.style.width = '0%';
    catBar.style.width = '0%';
}

// 페이지 로드 시 모델 미리 로드
ensureModel();
