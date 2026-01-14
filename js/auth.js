// js/auth.js
import { supabase } from './config.js';

/**
 * ฟังก์ชันสมัครสมาชิก
 * @param {string} email - อีเมล (ในระบบเราจะส่งเป็น ID@mathpath.com)
 * @param {string} password - รหัสผ่าน
 */
export async function signup(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    return { data, error };
}

/**
 * ฟังก์ชันเข้าสู่ระบบ
 * @param {string} email - อีเมล (ในระบบเราจะส่งเป็น ID@mathpath.com)
 * @param {string} password - รหัสผ่าน
 */
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    return { data, error };
}

/**
 * ฟังก์ชันออกจากระบบ
 */
export async function logout() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

/**
 * ตรวจสอบสถานะผู้ใช้ปัจจุบัน
 * @returns {Object|null} ข้อมูลผู้ใช้ หรือ null ถ้าไม่ได้ล็อกอิน
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * ตรวจสอบ Session ปัจจุบัน (ใช้สำหรับกรณีต้องการข้อมูล Token)
 */
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
}

/**
 * ฟังก์ชันสำหรับรีเซ็ตรหัสผ่าน (เผื่อใช้ในอนาคต)
 * @param {string} email 
 */
export async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
}
