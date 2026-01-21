import { login, logout, getCurrentUser } from './auth.js';
import { supabase } from './config.js';
import { saveTestResult, getTestHistory } from './db.js';
import { MathGame } from './game.js';
import { switchTab, drawSpiderChart } from './ui.js';

const curriculumData = {
    "P.1": { "1": ["จำนวนนับ 1-10", "การบวก (ไม่เกิน 20)", "การลบ (ไม่เกิน 20)"], "2": ["การบวก/ลบ (ไม่เกิน 100)", "รูปเรขาคณิต", "การวัด"] },
    "P.2": { "1": ["จำนวนนับไม่เกิน 1,000", "การบวก/ลบ", "การคูณ"], "2": ["การหาร", "เวลา", "ปริมาตร"] },
    "P.3": { "1": ["จำนวนนับไม่เกิน 100,000", "การบวก/ลบ", "เศษส่วน"], "2": ["การหาร", "เงิน", "การวัด"] },
    "P.4": { "1": ["จำนวนนับ > 100,000", "การคูณ/หาร"], "2": ["เศษส่วน", "ทศนิยม", "รูปสี่เหลี่ยม"] },
    "P.5": { "1": ["เศษส่วน", "ทศนิยม", "บัญญัติไตรยางศ์"], "2": ["ร้อยละ", "เส้นขนาน", "รูปสี่เหลี่ยม"] },
    "P.6": { "1": ["ห.ร.ม./ค.ร.น.", "เศษส่วน", "ทศนิยม"], "2": ["รูปสามเหลี่ยม", "รูปหลายเหลี่ยม", "วงกลม"] },
    "M.1": { "1": ["จำนวนเต็ม", "การสร้างทางเรขาคณิต", "เลขยกกำลัง", "ทศนิยมและเศษส่วน", "รูปเรขาคณิต 2 มิติและ 3 มิติ"], "2": ["สมการเชิงเส้นตัวแปรเดียว", "อัตราส่วนและร้อยละ", "กราฟและความสัมพันธ์", "สถิติ"] },
    "M.2": { "1": ["ทฤษฎีบทพีทาโกรัส", "จำนวนจริง", "พหุนาม"], "2": ["สถิติ", "การเท่ากันทุกประการ", "เส้นขนาน"] },
    "M.3": { "1": ["อสมการ", "แยกตัวประกอบ", "สมการกำลังสอง"], "2": ["ระบบสมการ", "วงกลม", "ความน่าจะเป็น"] }
};

const game = new MathGame();
let timerInterval = null;
let currentUser = null;
let userRealGrade = 'M.1'; 
let currentSem = '1';

window.startAdaptiveTest = async () => { await runGame('adaptive'); };
window.startSpecificTest = async (competency) => { await runGame('specific', competency); };
window.startChapterTest = async (chapterName) => { await runGame('chapter', null, chapterName); };

window.setSemester = (sem) => { 
    currentSem = sem; 
    updateSemesterUI(); 
    renderLessonLibrary(); 
    loadHistoryData(); 
};

window.closeResultModal = () => { 
    // ซ่อน Modal
    document.getElementById('result-modal').classList.add('hidden'); 
    // ซ่อนหน้าจอทดสอบโดยตรง (กันเหนียว)
    document.getElementById('content-test').classList.add('hidden'); 
    // กลับหน้าหลัก
    switchTab('select'); 
    // โหลดข้อมูลใหม่
    loadHistoryData(); 
};
// แก้ไขฟังก์ชัน runGame เพื่อให้ดึง Level ปัจจุบันของผู้เล่นส่งเข้าเกม
async function runGame(mode, competency = null, chapterName = null) {
    if (!currentUser) return alert("กรุณาเข้าสู่ระบบก่อนครับ");

    // --- [จุดสำคัญ] ดึงค่า Level ปัจจุบันของผู้เล่นจาก UI ---
    let currentLevel = "1"; // ค่าเริ่มต้น
    
    if (mode === 'specific' && competency) {
        // ดึงเลเวลจากตัวเลขบน Skill Card เช่น id="lv-numerical"
        const lvEl = document.getElementById(`lv-${competency}`);
        currentLevel = lvEl ? lvEl.textContent : "1";
    } else if (mode === 'adaptive') {
        // สำหรับโหมด Adaptive รวม อาจจะดึงเลเวลเฉลี่ยหรือเริ่มที่ 1 เพื่อประเมินใหม่
        currentLevel = "1"; 
    } else if (mode === 'chapter') {
        // โหมดบทเรียน ปกติจะเริ่มที่ Level 1 เพื่อปูพื้นฐาน
        currentLevel = "1";
    }

    const targetGrade = userRealGrade || 'M.1';

    // ส่ง currentLevel เป็นพารามิเตอร์ตัวที่ 6 เข้าไปใน game.start
    await game.start(mode, targetGrade, competency, currentSem, chapterName, currentLevel);
    
    // ตรวจสอบว่ามีโจทย์หรือไม่ (ถ้าหาทุก Level แล้วยังไม่มีจริงๆ)
    if (!game.questions || game.questions.length === 0) {
        alert(`ไม่พบข้อสอบสำหรับชั้น ${formatGrade(targetGrade)} ในขณะนี้`);
        return;
    }
    
    switchTab('test');
    updateTestHeader(mode, competency, chapterName, targetGrade);
    
    // เพิ่มการโชว์ Level บนหัวข้อตอนสอบ (เพื่อให้เด็กรู้ว่าตอนนี้ทำระดับไหนอยู่)
    const titleEl = document.getElementById('test-level-title');
    if (titleEl) titleEl.innerHTML += ` <span class="text-sm bg-yellow-600/20 px-2 py-0.5 rounded text-yellow-500 ml-2">Lv.${game.currentLevel || currentLevel}</span>`;
    
    updateQuestionUI();
    startTimer();
}

function updateTestHeader(mode, competency, chapterName, grade) {
    const titleEl = document.getElementById('test-level-title');
    const thaiGrade = formatGrade(grade);
    if (mode === 'chapter') titleEl.textContent = `บทเรียน: ${chapterName} (${thaiGrade})`;
    else if (mode === 'adaptive') titleEl.textContent = `ภารกิจอัจฉริยะ (${thaiGrade})`;
    else titleEl.textContent = `ฝึกทักษะ: ${competency} (${thaiGrade})`;
}

function formatGrade(gradeCode) {
    if (!gradeCode) return '';
    return gradeCode.replace('P.', 'ป.').replace('M.', 'ม.');
}

function updateQuestionUI() { 
    const q = game.getCurrentQuestion(); 
    if (!q) { finishTest(); return; }
    
    document.getElementById('current-question-num').textContent = game.currentIndex + 1;
    document.getElementById('total-questions').textContent = game.questions.length;
    
    const displayDiv = document.getElementById('question-display');
    displayDiv.innerHTML = q.questionText; 
    
    document.getElementById('progress-bar').style.width = `${(game.currentIndex / game.questions.length) * 100}%`;
    const container = document.getElementById('answer-options');
    container.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'bg-white border-2 border-slate-200 hover:border-slate-800 text-slate-700 text-xl font-bold py-4 px-6 rounded transition-all shadow-sm flex items-center gap-3';
        btn.innerHTML = `
            <span class="bg-slate-100 text-slate-500 text-sm px-2 py-1 rounded min-w-[30px] text-center">${['A','B','C','D'][idx]}</span> 
            <div class="math-target flex-1 text-left">${opt}</div>
        `;
        btn.onclick = () => {
            const isCorrect = game.checkAnswer(idx);
            btn.classList.add(isCorrect ? 'bg-green-50' : 'bg-red-50', isCorrect ? 'border-green-500' : 'border-red-500');
            const buttons = container.querySelectorAll('button');
            buttons.forEach(b => b.disabled = true);
            setTimeout(() => { if (game.nextQuestion()) updateQuestionUI(); else finishTest(); }, 800);
        };
        container.appendChild(btn);
    });
}

function calculateDailyDecay(history) {
    if (!history || history.length === 0) return 0;
    const lastTestDate = new Date(history[0].created_at);
    const today = new Date();
    lastTestDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today - lastTestDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * 50 : 0;
}

async function loadHistoryData() {
    if(!currentUser) return;
    const { data: history, error } = await getTestHistory(currentUser.id);
    
    // ถ้าไม่มีประวัติ ให้เซ็ตกราฟเป็น 0 ทั้งหมด
    if (error || !history || history.length === 0) {
        drawSpiderChart({ numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 });
        return;
    }

    // 1. เตรียมตัวแปรสำหรับคำนวณ
    const currentXPs = { numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 };
    const aggregateAccuracy = { numerical: { c: 0, t: 0 }, algebraic: { c: 0, t: 0 }, visual: { c: 0, t: 0 }, data: { c: 0, t: 0 }, logical: { c: 0, t: 0 }, applied: { c: 0, t: 0 } };

    // 2. ประมวลผลคะแนนย้อนหลังตามลำดับเวลา (เก่า -> ใหม่)
    const sortedHistory = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    sortedHistory.forEach(h => {
        const stats = h.competency_stats || {};
        Object.keys(currentXPs).forEach(k => {
            if (stats[k]) {
                let sessionCorrect = 0, sessionTotal = 0;
                if (typeof stats[k] === 'object') {
                    sessionCorrect = stats[k].correct || 0;
                    sessionTotal = stats[k].total || 0;
                } else {
                    sessionCorrect = parseInt(stats[k]) || 0;
                    sessionTotal = sessionCorrect;
                }
                
                const sessionIncorrect = sessionTotal - sessionCorrect;
                // แต้ม Mastery: ถูกได้ 10, ผิดลบ 5 (เพื่อให้กราฟขยับเห็นผลชัดขึ้น)
                const delta = (sessionCorrect * 10) - (sessionIncorrect * 5);

                // [Logic: Cap 400 (Lv 5) & Floor 0]
                currentXPs[k] = Math.max(0, Math.min(400, (currentXPs[k] || 0) + delta));
                
                aggregateAccuracy[k].c += sessionCorrect;
                aggregateAccuracy[k].t += sessionTotal;
            }
        });
    });

    // 3. หัก Daily Decay (แต้มลดลงตามวันที่ไม่ได้เล่น)
    const dailyPenalty = calculateDailyDecay(history);
    const radarScores = {};

    Object.keys(currentXPs).forEach(k => {
        const finalXP = Math.max(0, currentXPs[k] - dailyPenalty);
        
        // --- ส่วนสำคัญ: ส่ง Mastery % (0-100) ไปวาดกราฟ ---
        // สูตร: (XP ปัจจุบัน / XP สูงสุด 400) * 100
        radarScores[k] = (finalXP / 400) * 100; 

        // 4. อัปเดต UI เลเวลและ Progress Bar
        let level = Math.floor(finalXP / 100) + 1;
        level = Math.min(level, 5); 
        const progress = (level === 5) ? 100 : (finalXP % 100);

        const lvEl = document.getElementById(`lv-${k}`);
        if(lvEl) lvEl.textContent = level;

        const bar = document.getElementById(`bar-${k}`);
        if(bar) bar.style.width = `${progress}%`;
    });

    // 5. วาดกราฟใยแมงมุมด้วยค่า Mastery สะสม
    drawSpiderChart(radarScores);
    
    // 6. อัปเดตสถิติตัวเลขหน้า Dashboard
    updateCenterStats(history);
}

function renderSkillsGrid() {
    const container = document.getElementById('skills-grid');
    if (!container) return;
    const skills = [
        { id: 'numerical', name: 'Numerical', icon: '🧮', color: 'blue' },
        { id: 'algebraic', name: 'Algebraic', icon: '⚖️', color: 'yellow' },
        { id: 'visual', name: 'Visual', icon: '📐', color: 'emerald' },
        { id: 'data', name: 'Data', icon: '📊', color: 'rose' },
        { id: 'logical', name: 'Logical', icon: '🧩', color: 'indigo' },
        { id: 'applied', name: 'Applied', icon: '🛠️', color: 'orange' }
    ];
    container.innerHTML = skills.map(skill => `
        <div onclick="startSpecificTest('${skill.id}')" 
             class="bg-slate-50 hover:bg-${skill.color}-50 border border-slate-100 hover:border-${skill.color}-200 rounded-xl p-3 cursor-pointer transition-all group flex flex-col justify-between min-h-[90px]">
            <div class="flex justify-between items-start">
                <span class="text-xs font-bold text-slate-700">${skill.name}</span>
                <span class="text-lg">${skill.icon}</span>
            </div>
            <div>
                <div class="flex justify-between text-[9px] font-bold text-slate-500 mb-1">
                    <span>Lv.<span id="lv-${skill.id}">1</span></span>
                </div>
                <div class="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div id="bar-${skill.id}" class="h-full bg-${skill.color}-500 w-0 transition-all duration-500"></div>
                </div>
            </div>
        </div>
    `).join('');
}

// --- ฟังก์ชันอื่นๆ (Authentication & UI Setup) ---

async function checkAuth() { 
    currentUser = await getCurrentUser(); 
    if (currentUser) { await checkRoleAndRedirect(); await fetchRealUserGrade(); showApp(); } 
    else { showLogin(); } 
}

async function fetchRealUserGrade() {
    if (!currentUser) return;
    const studentIdFromEmail = currentUser.email.split('@')[0];
    const { data } = await supabase.from('students').select('grade').eq('student_id', studentIdFromEmail).single();
    if (data && data.grade) userRealGrade = data.grade;
}

async function checkRoleAndRedirect() { 
    const { data: admins } = await supabase.from('app_admins').select('email').eq('email', currentUser.email); 
    if (admins && admins.length > 0) { window.location.href = 'admin.html'; } 
}

function showLogin() { document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('main-app').classList.add('hidden'); }

function showApp() { 
    document.getElementById('login-screen').classList.add('hidden'); 
    document.getElementById('main-app').classList.remove('hidden'); 
    renderSkillsGrid();
    updateUserDisplay(); 
    renderLessonLibrary(); 
    switchTab('select'); 
    loadHistoryData(); 
}

function setupEventListeners() { 
    const loginForm = document.getElementById('login-form'); 
    if (loginForm) loginForm.addEventListener('submit', handleLogin); 
    const logoutBtn = document.getElementById('btn-logout'); 
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout); 
    const quitBtn = document.getElementById('btn-quit-test'); 
    if (quitBtn) quitBtn.addEventListener('click', () => { clearInterval(timerInterval); switchTab('select'); }); 
}

async function handleLogin(e) { 
    e.preventDefault(); 
    const idInput = document.getElementById('student-id'); 
    const passInput = document.getElementById('password'); 
    const { error } = await login(idInput.value, passInput.value); 
    if(error) { 
        const errDiv = document.getElementById('login-error');
        errDiv.textContent = "ID หรือรหัสผ่านไม่ถูกต้อง"; errDiv.classList.remove('hidden'); 
    } else { checkAuth(); } 
}

async function handleLogout() { await logout(); currentUser = null; showLogin(); }

function startTimer() { 
    let s = 0; clearInterval(timerInterval); 
    timerInterval = setInterval(() => { s++; const m = Math.floor(s/60); const sec = s%60; const el = document.getElementById('timer'); if(el) el.textContent = `${m}:${sec.toString().padStart(2, '0')}`; }, 1000); 
}

async function finishTest() { 
    clearInterval(timerInterval); 
    const res = game.getScore(); 
    document.getElementById('result-score').textContent = `${res.correct}/${res.total}`; 
    document.getElementById('result-percent').textContent = `${Math.round(res.score)}%`; 
    document.getElementById('result-modal').classList.remove('hidden'); 
    if (currentUser) { 
        await saveTestResult({ user_id: currentUser.id, test_level: res.level, score: res.score, total_questions: res.total, correct_answers: res.correct, competency_stats: res.competencyStats }); 
        loadHistoryData(); 
    } 
}

function renderLessonLibrary() {
    const container = document.getElementById('chapter-list');
    if (!container || !currentUser) return;
    const chapters = curriculumData[userRealGrade]?.[currentSem] || [];
    container.innerHTML = ''; 
    chapters.forEach(chap => {
        const btn = document.createElement('div');
        btn.className = "w-full min-h-[64px] bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-800 rounded-xl px-4 py-2 cursor-pointer flex items-center justify-between group transition-all relative overflow-hidden mb-2";
        btn.onclick = () => window.startChapterTest(chap);
        btn.innerHTML = `<div class="flex-1 min-w-0 pr-3 relative z-10"><h4 class="font-bold text-slate-700 text-sm md:text-base truncate">${chap}</h4></div>`;
        container.appendChild(btn);
    });
}

function updateSemesterUI() {
    const btn1 = document.getElementById('sem-btn-1');
    const btn2 = document.getElementById('sem-btn-2');
    
    // ตรวจสอบว่ามีปุ่มอยู่ในหน้าจอจริงหรือไม่ก่อนรัน
    if (!btn1 || !btn2) return;

    if (currentSem === '1') {
        // ใช้ชื่อคลาสที่ตรงกับที่เราเขียนล็อกขนาดไว้ใน index.html
        btn1.className = "sem-btn sem-active";
        btn2.className = "sem-btn sem-inactive";
    } else {
        btn1.className = "sem-btn sem-inactive";
        btn2.className = "sem-btn sem-active";
    }
}

function updateUserDisplay() {
    const nameEl = document.getElementById('display-name');
    const gradeEl = document.getElementById('display-grade');
    const avatarEl = document.getElementById('user-avatar');
    if (currentUser) {
        const fullName = currentUser.user_metadata?.name || 'Scholar';
        const grade = formatGrade(userRealGrade || 'M.1');
        if(nameEl) nameEl.textContent = fullName;
        if(gradeEl) gradeEl.textContent = grade;
        if(avatarEl) {
            const seed = currentUser.email.split('@')[0]; 
            avatarEl.src = `https://api.dicebear.com/9.x/icons/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc,b6f4d1&backgroundType=solid&radius=50`;
        }
    }
}

function updateCenterStats(history) {
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const totalQuestions = history.reduce((sum, h) => sum + (h.correct_answers || 0), 0);
    document.getElementById('stat-total-mission').textContent = history.length;
    document.getElementById('stat-accuracy').textContent = `${avg(history.map(h => h.score))}%`;
    document.getElementById('stat-questions').textContent = totalQuestions;
    const container = document.getElementById('center-stats-list');
    if(!container) return;
    container.innerHTML = '';
    const allChapters = curriculumData[userRealGrade]?.[currentSem] || [];
    const historyMap = {};
    history.forEach(h => {
        if(!historyMap[h.test_level]) historyMap[h.test_level] = { scores: [], count: 0 };
        historyMap[h.test_level].scores.push(h.score);
        historyMap[h.test_level].count++;
    });
    allChapters.forEach(chap => {
        const isPlayed = !!historyMap[chap];
        const percent = isPlayed ? avg(historyMap[chap].scores) : 0;
        const item = document.createElement('div');
        item.className = "flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm mb-2";
        item.innerHTML = `<div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-lg ${isPlayed ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'} flex items-center justify-center text-lg font-bold">${chap.substring(0,1)}</div><div class="min-w-0"><div class="font-bold text-slate-700 text-sm truncate">${chap}</div></div></div><div class="font-bold text-base px-3 py-1 rounded-lg ${isPlayed ? 'text-emerald-700 bg-emerald-100' : 'text-slate-300 bg-slate-50'}">${isPlayed ? percent + '%' : '-'}</div>`;
        container.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', async () => { 
    renderSkillsGrid(); 
    await checkAuth(); 
    setupEventListeners(); 
});
