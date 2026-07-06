const API_BASE = 'https://superagent-02ccfade.base44.app/functions';

export async function generateContent(params) {
  try {
    const response = await fetch(`${API_BASE}/aiContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function startSubscription(plan, email) {
  try {
    const response = await fetch(`${API_BASE}/contentCheckout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, user_email: email }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    return { error: error.message };
  }
}

// Stripe Payment Links (for direct web sales)
export const PAYMENT_LINKS = {
  monthly: 'https://buy.stripe.com/8x214n7J2fEv4Ph4Ms6Vq03',
  yearly: 'https://buy.stripe.com/7sY6oH7J2dwnepRen26Vq04',
  agency: 'https://buy.stripe.com/6oUdR9gfydwnepR4Ms6Vq05',
};

// Storage keys
export const STORAGE_KEYS = {
  IS_SUBSCRIBED: 'contentai_subscribed',
  GENERATIONS_USED: 'contentai_generations_used',
  BRAND_PROFILE: 'contentai_brand',
  SAVED_CONTENT: 'contentai_saved_content',
  USER_EMAIL: 'contentai_user_email',
};

const FREE_TIER_LIMIT = 3;

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getGenerationsUsed() {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.GENERATIONS_USED);
  return val ? parseInt(val) : 0;
}

export async function incrementGenerationsUsed() {
  const current = await getGenerationsUsed();
  await AsyncStorage.setItem(STORAGE_KEYS.GENERATIONS_USED, String(current + 1));
  return current + 1;
}

export async function isSubscribed() {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.IS_SUBSCRIBED);
  return val === 'true';
}

export async function setSubscribed(value) {
  await AsyncStorage.setItem(STORAGE_KEYS.IS_SUBSCRIBED, value ? 'true' : 'false');
}

export async function canGenerate() {
  const subscribed = await isSubscribed();
  if (subscribed) return true;
  const used = await getGenerationsUsed();
  return used < FREE_TIER_LIMIT;
}

export async function getRemainingFreeGenerations() {
  const subscribed = await isSubscribed();
  if (subscribed) return Infinity;
  const used = await getGenerationsUsed();
  return Math.max(0, FREE_TIER_LIMIT - used);
}

export async function saveBrandProfile(profile) {
  await AsyncStorage.setItem(STORAGE_KEYS.BRAND_PROFILE, JSON.stringify(profile));
}

export async function getBrandProfile() {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.BRAND_PROFILE);
  return val ? JSON.parse(val) : null;
}

export async function saveContent(content) {
  const existing = await getSavedContent();
  const newContent = { id: Date.now().toString(), ...content, savedAt: new Date().toISOString() };
  const updated = [newContent, ...existing].slice(0, 50);
  await AsyncStorage.setItem(STORAGE_KEYS.SAVED_CONTENT, JSON.stringify(updated));
  return newContent;
}

export async function getSavedContent() {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_CONTENT);
  return val ? JSON.parse(val) : [];
}

export async function deleteSavedContent(id) {
  const existing = await getSavedContent();
  const updated = existing.filter(item => item.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.SAVED_CONTENT, JSON.stringify(updated));
}

export async function getUserEmail() {
  return await AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL);
}

export async function setUserEmail(email) {
  await AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
}

export const FREE_LIMIT = FREE_TIER_LIMIT;
