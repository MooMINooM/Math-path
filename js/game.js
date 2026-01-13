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

    // เริ่มเกม: ดึงข้อมูลจาก DB เท่านั้น ไม่มีการสุ่มเองแล้ว
    async start(level) {
        this.isLoading = true;
        this.level = level;
        this.currentIndex = 0;
        this.correctCount = 0;
        this.questions = [];
        this.startTime = Date.now();

        try {
            console.log(`กำลังโหลดข้อสอบระดับ: ${level}...`);
            
            // เช็คก่อนว่า config เชื่อมต่อได้ไหม
            if (!supabase) {
                throw new Error("ไม่พบการตั้งค่า Supabase กรุณาตรวจสอบไฟล์ config.js");
            }

            // ดึงโจทย์จากตาราง 'advanced_questions'
            const { data, error } = await supabase
                .from('advanced_questions')
                .select('*')
                .eq('level', level);

            if (error) {
                throw error;
            }

            if (data && data.length > 0) {
                // แปลงข้อมูลจาก DB ให้เข้ากับโครงสร้างที่แอปใช้
                const formattedQuestions = data.map(q => ({
                    id: q.id,
                    questionText: q.question_text,
                    mathExpression: q.math_expression,
                    imageUrl: q.question_image_url,
                    options: q.options,         // Array JSON เช่น ["ก", "ข", "ค"]
                    correctIndex: q.correct_option_index, // int เช่น 0
                    explanation: q.explanation
                }));

                // สุ่มลำดับข้อ และตัดมาแค่ 10 ข้อ (หรือทั้งหมดที่มีถ้าไม่ถึง 10)
                this.questions = this.shuffleArray(formattedQuestions).slice(0, 10);
                
                console.log(`โหลดข้อสอบสำเร็จ: ${this.questions.length} ข้อ`);
            } else {
                // กรณีไม่พบข้อมูล: ตรวจสอบเพิ่มเติมเพื่อแจ้งสาเหตุที่ชัดเจนขึ้น
                console.warn(`ไม่พบข้อสอบ level: ${level}`);
                
                // ลองเช็คว่ามีข้อมูลในตารางบ้างไหม (โดยไม่กรอง Level)
                const { count } = await supabase
                    .from('advanced_questions')
                    .select('*', { count: 'exact', head: true });

                let errorMsg = `ไม่พบข้อสอบระดับ "${level}" ในระบบฐานข้อมูล`;
                
                if (count === null || count === 0) {
                     errorMsg += `\n⚠️ สาเหตุที่เป็นไปได้: \n1. ตารางยังว่างเปล่า (ลืม Insert ข้อมูล)\n2. ติดสิทธิ์ RLS (ลองรันคำสั่ง SQL: ALTER TABLE advanced_questions DISABLE ROW LEVEL SECURITY;)`;
                } else {
                     errorMsg += `\nℹ️ (พบข้อมูลในตารางทั้งหมด ${count} ข้อ แต่ไม่มีของระดับ "${level}")\nกรุณาเพิ่มโจทย์ที่มี level = '${level}'`;
                }
                
                alert(errorMsg);
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

    // ตรวจคำตอบ (รับ index ที่ user กด)
    checkAnswer(selectedIndex) {
        if (!this.questions[this.currentIndex]) return false;

        const currentQ = this.questions[this.currentIndex];
        // เทียบ Index ที่ตอบ กับ Index เฉลยจาก DB
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
