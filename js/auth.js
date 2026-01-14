import { supabase } from './config.js';

// ฟังก์ชันแปลง ID เป็นรูปแบบ Email ที่ Supabase ต้องการ
const formatIdToEmail = (id) => `${id.trim()}@mathpath.io`;

export async function login(studentId, password) {
    const email = formatIdToEmail(studentId);
    return await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });
}

export async function signup(studentId, password) {
    const email = formatIdToEmail(studentId);
    return await supabase.auth.signUp({
        email: email,
        password: password
    });
}

export async function logout() {
    return await supabase.auth.signOut();
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
