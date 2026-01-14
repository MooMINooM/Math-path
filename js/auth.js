// js/auth.js
import { supabase } from './config.js';

/**
 * สมัครสมาชิกโดยใช้ ID (ระบบจะแปลงเป็น ID@mathpath.com ให้อัตโนมัติใน app.js)
 */
export async function signup(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    return { data, error };
}

/**
 * เข้าสู่ระบบด้วย ID
 */
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
    return { data, error };
}

/**
 * ออกจากระบบ
 */
export async function logout() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบัน
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) return null;
        return user;
    } catch (err) {
        return null;
    }
}
