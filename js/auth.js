// js/auth.js
import { supabase } from './config.js';

const DOMAIN_SUFFIX = '@school.local';

// ฟังก์ชันแปลงรหัสนักเรียนเป็นอีเมล
function convertToEmail(studentId) {
    const cleanId = studentId.trim().toLowerCase();
    if (cleanId.includes('@')) return cleanId;
    return `${cleanId}${DOMAIN_SUFFIX}`;
}

export async function login(studentId, password) {
    const email = convertToEmail(studentId);
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function logout() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// [สำคัญ] ต้องมีฟังก์ชันนี้ ไม่งั้น app.js จะ Error จนหน้าเว็บวนลูป
export async function updateUserGrade(grade) {
    const { data, error } = await supabase.auth.updateUser({
        data: { grade: grade }
    });
    return { data, error };
}

// (ฟังก์ชัน signup ไม่ต้องใช้แล้วในเวอร์ชันครูสร้างให้)
export async function signup() {
    return { error: { message: "ปิดรับสมัครชั่วคราว (กรุณาติดต่อครู)" } };
}
