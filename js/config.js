// js/config.js

// 1. นำ Project URL จาก Supabase > Settings > API มาใส่ในเครื่องหมาย '' ด้านล่าง
// ตัวอย่าง: 'https://abcdefghijklm.supabase.co' (ไม่มี slash ปิดท้าย)
const SUPABASE_URL = 'https://fhsbpyvzxypsxtxpulxf.supabase.co'; 

// 2. นำ anon public Key จาก Supabase > Settings > API มาใส่ในเครื่องหมาย '' ด้านล่าง
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc2JweXZ6eHlwc3h0eHB1bHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODg1NzMsImV4cCI6MjA4Mzg2NDU3M30.MMdQxNI_aZHRnSoBMHbz7sY-eXVUEO_Lk_ziqalW2Lk';

// --- ส่วนตรวจสอบและ Debug (ช่วยหาสาเหตุ Error) ---
console.log('--- เริ่มต้นเชื่อมต่อ Supabase ---');

if (!window.supabase) {
    console.error('❌ Critical Error: ไม่พบ Supabase SDK ในหน้าเว็บ (window.supabase is undefined)');
    // alert('ไม่พบ Supabase SDK กรุณาตรวจสอบไฟล์ index.html'); // เอาออกเพื่อให้ไม่รบกวนถ้ายังไม่ได้แก้
}

const cleanUrl = SUPABASE_URL ? SUPABASE_URL.trim() : '';
const cleanKey = SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.trim() : '';

if (!cleanUrl) {
    console.error('❌ Error: ยังไม่ได้ใส่ SUPABASE_URL หรือค่าว่างเปล่า');
} else {
    console.log('✅ URL ที่ใช้:', cleanUrl);
}

if (!cleanKey) {
    console.error('❌ Error: ยังไม่ได้ใส่ SUPABASE_ANON_KEY');
} else {
    console.log('✅ Key ที่ใช้: (ซ่อนเพื่อความปลอดภัย) ความยาว', cleanKey.length, 'ตัวอักษร');
}
// ------------------------------------------------

// สร้าง Client พร้อม .trim() เพื่อตัดช่องว่างที่อาจติดมาตอน Copy
export const supabase = window.supabase 
    ? window.supabase.createClient(cleanUrl, cleanKey) 
    : null;
