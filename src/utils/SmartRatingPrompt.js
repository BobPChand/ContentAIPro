import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

// SMART RATING PROMPT - Session-gated SKStoreReviewController
// Research: Apple limits to 3 prompts per 365 days per user
// Top apps trigger at "Moments of Delight" with 3-5 session minimum
// 20-33% of negative reviewers update after developer response

const SESSION_COUNT_KEY = 'session_count';
const LAST_RATING_PROMPT_KEY = 'last_rating_prompt_date';
const RATING_TRIGGERED_KEY = 'rating_triggered_events';

// Track session count - increment on each app open
export async function incrementSessionCount() {
  const count = await AsyncStorage.getItem(SESSION_COUNT_KEY);
  const newCount = (parseInt(count || '0') + 1).toString();
  await AsyncStorage.setItem(SESSION_COUNT_KEY, newCount);
  return parseInt(newCount);
}

// Check if we should show rating prompt
// Conditions: 3+ sessions, not prompted in last 90 days, hasn't been triggered for this event
export async function shouldShowRatingPrompt(triggerEvent) {
  const sessionCount = parseInt(await AsyncStorage.getItem(SESSION_COUNT_KEY) || '0');
  const lastPrompt = await AsyncStorage.getItem(LAST_RATING_PROMPT_KEY);
  const triggeredEvents = JSON.parse(await AsyncStorage.getItem(RATING_TRIGGERED_KEY) || '[]');

  // Need at least 3 sessions
  if (sessionCount < 3) return false;

  // Don't prompt more than once per 90 days
  if (lastPrompt) {
    const daysSince = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
    if (daysSince < 90) return false;
  }

  // Don't trigger for the same event twice
  if (triggeredEvents.includes(triggerEvent)) return false;

  return true;
}

// MOMENTS OF DELIGHT - Each app has specific trigger events
// Trigger only after successful value delivery
export const RATING_TRIGGERS = {
  ContentAIPro: {
    contentGenerated: 'content_generated',      // After AI generates content
    contentShared: 'content_shared',            // After user shares to social
    voiceOverCreated: 'voiceover_created',       // After TTS audio plays
    bulkGenerated: 'bulk_generated',             // After generating 10+ pieces
  },
  AIResumeBuilder: {
    resumeExported: 'resume_exported',            // After PDF export
    atsScoreChecked: 'ats_score_checked',        // After running ATS score
    coverLetterCreated: 'cover_letter_created',   // After cover letter generation
    resumeCompleted: 'resume_completed',          // After full resume is built
  },
  InvoiceAI: {
    invoiceCreated: 'invoice_created',           // After invoice is generated
    invoiceSent: 'invoice_sent',                  // After invoice is sent/shared
    estimateCreated: 'estimate_created',         // After estimate is created
    paymentReceived: 'payment_received',          // After marking as paid
  },
  ProposalAI: {
    proposalGenerated: 'proposal_generated',      // After AI creates proposal
    pitchDeckCreated: 'pitchdeck_created',       // After pitch deck is built
    proposalExported: 'proposal_exported',        // After PDF export
    proposalSent: 'proposal_sent',                // After sharing to client
  },
  AIBookkeeperPro: {
    receiptScanned: 'receipt_scanned',            // After AI extracts receipt data
    deductionFound: 'deduction_found',            // After finding a tax deduction
    reportGenerated: 'report_generated',          // After P&L report is created
    taxEstimated: 'tax_estimated',                 // After quarterly tax estimate
  },
};

// Show the rating prompt using SKStoreReviewController
export async function showRatingPrompt(triggerEvent) {
  const canShow = await shouldShowRatingPrompt(triggerEvent);
  if (!canShow) return false;

  try {
    // Record the trigger event
    const triggeredEvents = JSON.parse(await AsyncStorage.getItem(RATING_TRIGGERED_KEY) || '[]');
    triggeredEvents.push(triggerEvent);
    await AsyncStorage.setItem(RATING_TRIGGERED_KEY, JSON.stringify(triggeredEvents));

    // Record prompt date
    await AsyncStorage.setItem(LAST_RATING_PROMPT_KEY, Date.now().toString());

    // Use expo-store-review to trigger the native iOS prompt
    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      return true;
    }
  } catch (error) {
    console.log('Rating prompt error:', error);
  }
  return false;
}
