import { supabase } from './config.js';

export class MathGame {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.mode = 'standard';
        this.startTime = null;
        this.isLoading = false;
        this.currentSemester = '1';
        this.skippedCount = 0;
        this.activeChapterName = null;
        this.activeCompetency = null;
        this.currentLevel = "1"; // บันทึกเลเวลที่กำลังเล่นอยู่จริง
    }

    /**
     * เริ่มต้นเกมด้วยระบบ Adaptive
     * @param {string} mode - 'chapter', 'specific', 'adaptive'
     * @param {string} userLevel - เลเวลปัจจุบันของผู้เล่น (1-5)
     */
    async start(mode, userGrade, specificCompetency = null, semester = '1', chapterName = null, userLevel = "1") {
        this.isLoading = true;
        this.mode = mode;
        this.currentSemester = semester;
        this.activeChapterName = chapterName;
        this.activeCompetency = specificCompetency;
        this.currentLevel = userLevel;

        this.currentIndex = 0;
        this.correctCount = 0;
        this.skippedCount = 0;
        this.questions = [];
        this.startTime = Date.now();

        try {
            console.log(`🎮 Game Starting | Mode: ${mode} | Target Lv: ${userLevel} | Competency: ${specificCompetency || 'Auto'}`);

            // 1. ลองดึงโจทย์ตามเงื่อนไขที่ส่งมา (ตรงบท ตรงทักษะ ตรงเลเวล)
            let data = await this.fetchQuestions(mode, userGrade, semester, chapterName, specificCompetency, userLevel);

            // 2. [Adaptive Fallback] ถ้าหาโจทย์ในเลเวลนั้นไม่เจอ
            if (!data || data.length === 0) {
                console.warn(`⚠️ No questions for Level ${userLevel}. Starting Fallback Sequence...`);
                
                // ขั้นที่ 1: ลองหาเลเวลที่ต่ำกว่าลงไปเรื่อยๆ ในทักษะเดิม (ทักษะสำคัญกว่าเลเวล)
                for (let fallbackLv = parseInt(userLevel) - 1; fallbackLv >= 1; fallbackLv--) {
                    data = await this.fetchQuestions(mode, userGrade, semester, chapterName, specificCompetency, fallbackLv.toString());
                    if (data && data.length > 0) {
                        this.currentLevel = fallbackLv.toString();
                        console.log(`✅ Fallback Success: Found questions at Level ${fallbackLv}`);
                        break;
                    }
                }

                // ขั้นที่ 2: ถ้าในบทนั้นทักษะนั้นไม่มีโจทย์เลย (ทุกเลเวล) ให้ดึงโจทย์สุ่มในบทเดียวกัน (ถ้าอยู่ในโหมด Chapter)
                if ((!data || data.length === 0) && mode === 'chapter') {
                    console.log(`🔍 Try searching any competency in chapter: ${chapterName}`);
                    data = await this.fetchQuestions('chapter_random', userGrade, semester, chapterName, null, "1");
                }
            }

            if (!data || data.length === 0) {
                console.error("❌ No questions found after all fallback attempts.");
                this.questions = [];
                return;
            }

            // 3. จัดรูปแบบข้อมูลโจทย์
            const formattedQuestions = data.map(q => ({
                id: q.id,
                questionText: q.question_text,
                mathExpression: q.math_expression,
                imageUrl: q.question_image_url,
                options: q.options,
                correctIndex: q.correct_option_index,
                competency: q.competency,
                chapter: q.chapter,
                level: q.level,
                userResult: null,
                userSkipped: false
            }));

            // สุ่มโจทย์และเลือกมา 10 ข้อ
            this.questions = this.shuffleArray(formattedQuestions).slice(0, 10);

        } catch (error) {
            console.error("🔥 Game Load Error:", error);
            alert("เกิดข้อผิดพลาดในการโหลดโจทย์: " + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * ดึงโจทย์จาก Database ตามเงื่อนไข Matrix
     */
    async fetchQuestions(mode, grade, sem, chapter, competency, lv) {
        let query = supabase
            .from('advanced_questions')
            .select('*')
            .eq('grade', grade)
            .eq('semester', sem.toString());

        // กรองตามเลเวล (ยกเว้นโหมดสุ่มพิเศษ)
        if (mode !== 'chapter_random') {
            query = query.eq('level', lv.toString());
        }

        if (mode === 'chapter') {
            // ต้องตรงบท และตรงทักษะ (ตามหลักการ Matrix)
            query = query.eq('chapter', chapter).eq('competency', competency);
        } 
        else if (mode === 'chapter_random') {
            // กรณี Fallback: เอาทักษะอะไรก็ได้ในบทนี้
            query = query.eq('chapter', chapter);
        }
        else if (mode === 'specific') {
            // ไม่สนบท สนแต่ทักษะ
            query = query.eq('competency', competency);
        }
        // ถ้าเป็นโหมด adaptive รวม จะกรองแค่ทักษะอ่อนที่ส่งมา (ซึ่งจัดการผ่าน competency param อยู่แล้ว)

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    checkAnswer(selectedIndex) {
        if (!this.questions[this.currentIndex]) return false;
        const currentQ = this.questions[this.currentIndex];
        const isCorrect = (selectedIndex === currentQ.correctIndex);
        currentQ.userResult = isCorrect;
        if (isCorrect) this.correctCount++;
        return isCorrect;
    }

    nextQuestion() {
        this.currentIndex++;
        return this.currentIndex < this.questions.length;
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    getScore() {
        const total = this.questions.length;
        const scorePercent = total === 0 ? 0 : (this.correctCount / total) * 100;
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);

        // บันทึกชื่อ Label สำหรับ Database
        let levelLabel = this.mode;
        if (this.mode === 'chapter' && this.activeChapterName) {
            levelLabel = this.activeChapterName;
        } else if (this.mode === 'specific' && this.activeCompetency) {
            levelLabel = this.activeCompetency;
        }

        const breakdown = { numerical: 0, algebraic: 0, visual: 0, data: 0, logical: 0, applied: 0 };
        this.questions.forEach(q => {
            if (q.userResult === true && breakdown.hasOwnProperty(q.competency)) {
                breakdown[q.competency]++;
            }
        });

        return {
            score: scorePercent,
            correct: this.correctCount,
            total: total,
            timeSpent: timeSpent,
            level: levelLabel,
            competencyStats: breakdown,
            playedLevel: this.currentLevel // ส่งเลเวลที่เล่นจริงกลับไปบันทึก/แสดงผล
        };
    }
}
