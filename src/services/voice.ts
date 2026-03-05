/**
 * Voice Service
 *
 * Handles text-to-speech and speech-to-text for the assistant.
 * Uses expo-speech for TTS and expo-av for audio recording.
 */

// Note: These imports work in Expo runtime, not in Node.js
// import * as Speech from 'expo-speech';
// import { Audio } from 'expo-av';

export class VoiceService {
  private isSpeaking = false;
  private isListening = false;

  async speak(text: string, options?: { rate?: number; pitch?: number; language?: string }): Promise<void> {
    try {
      // Dynamic import for Expo runtime
      const Speech = require('expo-speech');

      if (this.isSpeaking) {
        Speech.stop();
      }

      this.isSpeaking = true;

      return new Promise((resolve) => {
        Speech.speak(text, {
          rate: options?.rate || 1.0,
          pitch: options?.pitch || 1.0,
          language: options?.language || 'en-US',
          onDone: () => {
            this.isSpeaking = false;
            resolve();
          },
          onError: () => {
            this.isSpeaking = false;
            resolve();
          },
        });
      });
    } catch (error) {
      console.warn('Speech not available:', error);
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      const Speech = require('expo-speech');
      Speech.stop();
      this.isSpeaking = false;
    } catch {
      // Speech module not available
    }
  }

  async startListening(): Promise<string | null> {
    // Audio recording for voice input
    // In a full implementation, this would use expo-av to record
    // and a speech-to-text API to transcribe
    try {
      const { Audio } = require('expo-av');

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.warn('Microphone permission not granted');
        return null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      this.isListening = true;
      // In production, integrate with a speech-to-text service
      // For now, this is a placeholder
      return null;
    } catch (error) {
      console.warn('Audio recording not available:', error);
      return null;
    }
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

let voiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!voiceInstance) {
    voiceInstance = new VoiceService();
  }
  return voiceInstance;
}
