// js/db.js
import { supabase } from './config.js';

export async function saveTestResult(resultData) {
    const { data, error } = await supabase
        .from('test_results')
        .insert([resultData])
        .select();
    return { data, error };
}

export async function getTestHistory(userId) {
    const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return { data, error };
}