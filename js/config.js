// js/config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ==============================================================================
// ⚙️ การตั้งค่า Supabase (Configuration)
// ==============================================================================

// 1. ใส่ Project URL ของคุณ (ดูได้ที่ Settings > API)
const SUPABASE_URL = 'https://fhsbpyvzxypsxtxpulxf.supabase.co'; 

// 2. ใส่ Anon Key (Public) (ดูได้ที่ Settings > API > Project API keys)
// *คำเตือน: ห้ามใส่ Service Role Key ในไฟล์นี้เด็ดขาด ให้ใช้ Anon Key เท่านั้น*
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc2JweXZ6eHlwc3h0eHB1bHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODg1NzMsImV4cCI6MjA4Mzg2NDU3M30.MMdQxNI_aZHRnSoBMHbz7sY-eXVUEO_Lk_ziqalW2Lk'; 

// ==============================================================================

// ตรวจสอบความถูกต้องเบื้องต้น (เพื่อแจ้งเตือนหากลืมเปลี่ยนค่า)
if (SUPABASE_URL.includes('your-project-url') || SUPABASE_KEY.includes('your-anon-key')) {
    console.error('🚨 ข้อผิดพลาด: คุณยังไม่ได้ตั้งค่า SUPABASE_URL และ SUPABASE_KEY ในไฟล์ js/config.js');
    alert('กรุณาเข้าไปแก้ไขไฟล์ js/config.js เพื่อใส่ข้อมูล Supabase ของคุณก่อนใช้งานครับ');
}

// สร้างและส่งออก Client สำหรับใช้งานในไฟล์อื่นๆ (app.js, admin.html, etc.)
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);