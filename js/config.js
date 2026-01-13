// js/config.js
// ใส่ข้อมูลจาก Supabase Project Settings > API ของคุณที่นี่
const SUPABASE_URL = 'https://fhsbpyvzxypsxtxpulxf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoc2JweXZ6eHlwc3h0eHB1bHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODg1NzMsImV4cCI6MjA4Mzg2NDU3M30.MMdQxNI_aZHRnSoBMHbz7sY-eXVUEO_Lk_ziqalW2Lk';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);