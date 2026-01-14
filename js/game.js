// js/game.js
import { supabase } from './config.js';

export class MathGame {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.correctCount = 0;
        this.level = 'easy';
        this.startTime = null;
        this.isLoading = false;
    }

    // [UPDATED] รับ userGrade มาด้วยเพื่อดึงข้อสอบให้ตรงชั้น
    async start(level, userGrade) {
        this.isLoading = true;
        this.level = level;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.questions = [];
        this.startTime = Date.now();

        try {
            console.log(`กำลังโหลดข้อสอบ Level: ${level}, Grade: ${userGrade}...`);
            
            if (!supabase) {
                throw new Error("ไม่พบการตั้งค่า Supabase กรุณาตรวจสอบไฟล์ config.js");
            }

            // [UPDATED] ดึงโจทย์โดยกรองทั้ง level และ grade
            const { data, error } = await supabase
                .from('advanced_questions')
                .select('*')
                .eq('level', level)
                .eq('grade', userGrade); // <--- เพิ่มเงื่อนไขนี้

            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                const formattedQuestions = data.map(q => ({
                    id: q.id,
                    questionText: q.question_text,
                    mathExpression: q.math_expression,
                    imageUrl: q.question_image_url,
                    options: q.options,
                    correctIndex: q.correct_option_index,
                    explanation: q.explanation
                }));

                this.questions = this.shuffleArray(formattedQuestions).slice(0, 10);
                console.log(`โหลดข้อสอบสำเร็จ: ${this.questions.length} ข้อ`);
            } else {
                console.warn(`ไม่พบข้อสอบ Grade: ${userGrade}, Level: ${level}`);
                // เราจะไม่ Alert ที่นี่แล้ว ให้ app.js เป็นคนจัดการ UI
            }

        } catch (error) {
            console.error("Critical Error:", error);
            alert("เกิดข้อผิดพลาดในการโหลดข้อสอบ:\n" + error.message);
        } finally {
            this.isLoading = false;
        }
    }

    shuffleArray(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    getCurrentQuestion() {
        return this.questions[this.currentIndex];
    }

    checkAnswer(selectedIndex) {
        if (!this.questions[this.currentIndex]) return false;

        const currentQ = this.questions[this.currentIndex];
        const isCorrect = (selectedIndex === currentQ.correctIndex);

        if (isCorrect) this.correctCount++;
        return isCorrect;
    }

    nextQuestion() {
        this.currentIndex++;
        return this.currentIndex < this.questions.length;
    }

    getScore() {
        if (this.questions.length === 0) return { score: 0, correct: 0, total: 0, timeSpent: 0, level: this.level };

        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        return {
            score: (this.correctCount / this.questions.length) * 100,
            correct: this.correctCount,
            total: this.questions.length,
            timeSpent: timeSpent,
            level: this.level
        };
    }
}