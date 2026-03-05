/**
 * Background Service
 *
 * Manages always-on behavior for the assistant:
 * - Background fetch for periodic checks
 * - Keep-awake for always-on display
 * - Foreground notifications for persistent presence
 * - Task scheduling integration
 */

export const BACKGROUND_TASK_NAME = 'OPENCLAW_BACKGROUND_TASK';
export const PROACTIVE_CHECK_TASK = 'OPENCLAW_PROACTIVE_CHECK';

/**
 * Register background tasks with Expo
 * Call this at app startup
 */
export async function registerBackgroundTasks(): Promise<void> {
  try {
    const TaskManager = require('expo-task-manager');
    const BackgroundFetch = require('expo-background-fetch');

    // Define the background task
    TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
      try {
        // This runs periodically in the background
        // Check proactive rules, scheduled tasks, etc.
        console.log('[Background] Running periodic check');

        // Return success to let the OS know the task completed
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('[Background] Task failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register the background fetch
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes minimum (Android restriction)
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[Background] Tasks registered successfully');
  } catch (error) {
    console.warn('[Background] Could not register background tasks:', error);
  }
}

/**
 * Enable keep-awake mode for always-on display
 */
export async function enableKeepAwake(): Promise<void> {
  try {
    const KeepAwake = require('expo-keep-awake');
    KeepAwake.activateKeepAwakeAsync('openclaw-always-on');
    console.log('[KeepAwake] Enabled');
  } catch (error) {
    console.warn('[KeepAwake] Not available:', error);
  }
}

/**
 * Disable keep-awake mode
 */
export async function disableKeepAwake(): Promise<void> {
  try {
    const KeepAwake = require('expo-keep-awake');
    KeepAwake.deactivateKeepAwake('openclaw-always-on');
    console.log('[KeepAwake] Disabled');
  } catch (error) {
    console.warn('[KeepAwake] Not available:', error);
  }
}

/**
 * Setup persistent notification for foreground service behavior
 */
export async function setupPersistentNotification(): Promise<void> {
  try {
    const Notifications = require('expo-notifications');

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return;
    }

    // Set up notification channel (Android)
    await Notifications.setNotificationChannelAsync('openclaw-persistent', {
      name: 'OpenClaw Assistant',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0],
      lightColor: '#6c5ce7',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: false,
    });

    // Schedule a persistent local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'OpenClaw Active',
        body: 'Your AI assistant is running. Tap to open.',
        data: { type: 'persistent' },
        sticky: true,
        autoDismiss: false,
      },
      trigger: null, // Show immediately
    });

    console.log('[Notifications] Persistent notification set up');
  } catch (error) {
    console.warn('[Notifications] Setup failed:', error);
  }
}

/**
 * Send a proactive notification
 */
export async function sendProactiveNotification(title: string, body: string): Promise<void> {
  try {
    const Notifications = require('expo-notifications');

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: 'proactive' },
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('[Notifications] Could not send notification:', error);
  }
}

/**
 * Get device info for optimization
 */
export async function getDeviceInfo(): Promise<{
  model: string;
  osVersion: string;
  isTablet: boolean;
}> {
  try {
    const Device = require('expo-device');
    return {
      model: Device.modelName || 'Unknown',
      osVersion: Device.osVersion || 'Unknown',
      isTablet: Device.deviceType === Device.DeviceType.TABLET,
    };
  } catch {
    return {
      model: 'Unknown',
      osVersion: 'Unknown',
      isTablet: true, // Assume tablet for Samsung Tab S10 FE
    };
  }
}
