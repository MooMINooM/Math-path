// js/auth.js
import { supabase } from './config.js';

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return { data, error };
}

export async function signup(email, password) {
    const { data, error } = await supabase.auth.signUp({
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