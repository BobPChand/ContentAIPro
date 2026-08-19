import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// PUSH NOTIFICATION MANAGER - Pre-prompt + Behavioral Triggers
// Research: Pre-prompts increase opt-in from 40% to 65-70%
// Behavioral triggers: re-engage after inactivity, pending value reminders

const PUSH_PREF_KEY = 'push_permission_shown';
const NOTIFICATION_PREF_KEY = 'notifications_enabled';

// STEP 1: Show pre-prompt explaining benefits BEFORE the native dialog
// Never show the native dialog cold - always explain value first
export async function shouldShowPushPrePrompt() {
  const shown = await AsyncStorage.getItem(PUSH_PREF_KEY);
  const enabled = await AsyncStorage.getItem(NOTIFICATION_PREF_KEY);
  return !shown && !enabled;
}

// Show pre-prompt UI (call this from your screen component)
// Returns true if user agreed, false if declined
export async function handlePushPrePromptResponse(agreed) {
  await AsyncStorage.setItem(PUSH_PREF_KEY, 'true');
  if (agreed) {
    await requestPushPermission();
  } else {
    await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
  }
}

// Request actual push permission
async function requestPushPermission() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
      return true;
    }
    await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
    return false;
  } catch (error) {
    console.log('Push permission error:', error);
    return false;
  }
}

// STEP 2: Schedule behavioral notifications per app
// These are the re-engagement triggers that drive retention

export const NOTIFICATION_CONFIGS = {
  ContentAIPro: {
    // Remind users to create weekly content
    weeklyContentReminder: {
      title: 'Time to create this week\'s content',
      body: 'Your audience is waiting. Generate a week of posts in 2 minutes.',
      trigger: { weekday: 1, hour: 9, minute: 0 }, // Monday 9am
      id: 'contentai_weekly',
    },
    // Re-engage inactive users after 5 days
    reEngagement: {
      title: 'Your content calendar is waiting',
      body: 'Generate fresh social posts, blog articles, and ads in seconds.',
      triggerInactivityDays: 5,
      id: 'contentai_reengage',
    },
  },
  AIResumeBuilder: {
    // Remind to keep resume updated
    monthlyUpdate: {
      title: 'Is your resume up to date?',
      body: 'New achievements? Update your resume in 2 minutes with AI.',
      trigger: { day: 1, hour: 10, minute: 0 }, // 1st of each month
      id: 'resume_monthly',
    },
    reEngagement: {
      title: 'Don\'t let your resume get stale',
      body: 'Update your resume and run an ATS check to stay job-ready.',
      triggerInactivityDays: 14,
      id: 'resume_reengage',
    },
  },
  InvoiceAI: {
    // Remind about overdue/pending invoices
    invoiceReminder: {
      title: 'You have pending invoices',
      body: 'Check your invoice status and send reminders to clients.',
      trigger: { weekday: 2, hour: 9, minute: 0 }, // Tuesday 9am
      id: 'invoice_weekly',
    },
    reEngagement: {
      title: 'Time to send invoices',
      body: 'Create and send professional invoices in under 60 seconds.',
      triggerInactivityDays: 7,
      id: 'invoice_reengage',
    },
  },
  ProposalAI: {
    // Remind to follow up on proposals
    proposalFollowup: {
      title: 'Follow up on your proposals',
      body: 'Check proposal status and send follow-ups to close deals.',
      trigger: { weekday: 3, hour: 9, minute: 0 }, // Wednesday 9am
      id: 'proposal_weekly',
    },
    reEngagement: {
      title: 'Win more clients this week',
      body: 'Create AI proposals that close deals faster.',
      triggerInactivityDays: 10,
      id: 'proposal_reengage',
    },
  },
  AIBookkeeperPro: {
    // Weekly receipt reminder
    weeklyReceiptScan: {
      title: 'Scan this week\'s receipts',
      body: 'Snap your receipts and let AI handle the data entry.',
      trigger: { weekday: 5, hour: 18, minute: 0 }, // Friday 6pm
      id: 'bookkeeper_weekly',
    },
    // Monthly tax deduction reminder
    monthlyTaxReminder: {
      title: 'Check your tax deductions',
      body: 'See how much you\'ve saved in tax deductions this month.',
      trigger: { day: 28, hour: 10, minute: 0 }, // 28th of each month
      id: 'bookkeeper_monthly',
    },
    reEngagement: {
      title: 'Don\'t miss tax deductions',
      body: 'Scan receipts and let AI find deductions you might be missing.',
      triggerInactivityDays: 7,
      id: 'bookkeeper_reengage',
    },
  },
};

// Schedule notifications for an app
export async function scheduleNotifications(appKey) {
  const enabled = await AsyncStorage.getItem(NOTIFICATION_PREF_KEY);
  if (enabled !== 'true') return;

  const configs = NOTIFICATION_CONFIGS[appKey];
  if (!configs) return;

  // Cancel existing notifications first
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule each notification
  for (const [name, config] of Object.entries(configs)) {
    if (config.trigger) {
      // Calendar-based trigger
      await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          sound: true,
        },
        trigger: config.trigger,
        identifier: config.id,
      });
    }
  }
}

// Check for re-engagement (call on app open)
export async function checkReEngagement(appKey) {
  const configs = NOTIFICATION_CONFIGS[appKey];
  if (!configs?.reEngagement) return;

  const lastActiveKey = `last_active_${appKey}`;
  const lastActive = await AsyncStorage.getItem(lastActiveKey);

  if (lastActive) {
    const daysInactive = (Date.now() - parseInt(lastActive)) / (1000 * 60 * 60 * 24);
    if (daysInactive >= configs.reEngagement.triggerInactivityDays) {
      // User has been inactive - schedule immediate notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: configs.reEngagement.title,
          body: configs.reEngagement.body,
          sound: true,
        },
        trigger: { seconds: 1 },
        identifier: configs.reEngagement.id,
      });
    }
  }

  // Update last active timestamp
  await AsyncStorage.setItem(lastActiveKey, Date.now().toString());
}
