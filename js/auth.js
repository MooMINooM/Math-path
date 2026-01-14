// js/auth.js
import { supabase } from './config.js';

/**
 * ฟังก์ชันเข้าสู่ระบบโดยเช็คจากตาราง student
 * @param {string} studentId - รหัสประจำตัว (จากช่องกรอก ID)
 * @param {string} password - รหัสผ่าน
 */
export async function login(studentId, password) {
    try {
        // ค้นหาข้อมูลจากตาราง student โดยตรวจสอบ id และ password ที่ตรงกัน
        const { data, error } = await supabase
            .from('student')
            .select('*')
            .eq('student_id', studentId) // ตรวจสอบว่าใน Supabase ตั้งชื่อคอลัมน์ว่า student_id หรือไม่
            .eq('password', password)
            .single(); // ดึงมาแค่รายการเดียว

        if (error || !data) {
            console.error("Login Error:", error);
            return { data: null, error: { message: "ไม่พบข้อมูลผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง" } };
        }

        // หากล็อกอินสำเร็จ ให้เก็บข้อมูลผู้ใช้ไว้ใน LocalStorage เพื่อให้ระบบจำได้ว่าล็อกอินอยู่
        localStorage.setItem('math_path_user', JSON.stringify(data));
        
        return { data, error: null };
    } catch (err) {
        console.error("Unexpected Error:", err);
        return { data: null, error: { message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" } };
    }
}

/**
 * ดึงข้อมูลผู้ใช้ปัจจุบันจาก LocalStorage
 */
export async function getCurrentUser() {
    const userJson = localStorage.getItem('math_path_user');
    if (!userJson) return null;
    try {
        return JSON.parse(userJson);
    } catch (e) {
        return null;
    }
}

/**
 * ออกจากระบบ (ล้างข้อมูลใน LocalStorage)
 */
export async function logout() {
    localStorage.removeItem('math_path_user');
    // ไม่ต้องเรียก supabase.auth.signOut() เพราะเราไม่ได้ใช้ระบบ Auth หลัก
    return { error: null };
}

/**
 * สมัครสมาชิก (เพิ่มข้อมูลลงตาราง student)
 */
export async function signup(studentId, password) {
    // ตรวจสอบก่อนว่ามี ID นี้อยู่แล้วหรือไม่
    const { data: existingUser } = await supabase
        .from('student')
        .select('student_id')
        .eq('student_id', studentId)
        .single();

    if (existingUser) {
        return { data: null, error: { message: "รหัส ID นี้มีอยู่ในระบบแล้ว" } };
    }

    // เพิ่มข้อมูลใหม่
    const { data, error } = await supabase
        .from('student')
        .insert([
            { 
                student_id: studentId, 
                password: password,
                name: `นักเรียน ${studentId}` // ค่าเริ่มต้นสำหรับชื่อ
            }
        ])
        .select();

    return { data, error };
}
