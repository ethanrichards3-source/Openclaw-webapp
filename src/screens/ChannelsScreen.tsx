import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';
import { getTelegramService } from '../services/telegram';
import { getDiscordService } from '../services/discord';

export function ChannelsScreen() {
  const config = useStore(s => s.config);
  const updateConfig = useStore(s => s.updateConfig);
  const colors = themes[config.theme].colors;
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [discordStatus, setDiscordStatus] = useState<string | null>(null);

  const testTelegram = async () => {
    setTelegramStatus('Testing...');
    const telegram = getTelegramService(config.telegramConfig);
    const result = await telegram.testConnection();
    setTelegramStatus(result.ok ? `Connected: @${result.botName}` : `Error: ${result.error}`);
  };

  const testDiscord = async () => {
    setDiscordStatus('Testing...');
    const discord = getDiscordService(config.discordConfig);
    const result = await discord.testConnection();
    setDiscordStatus(result.ok ? `Connected: ${result.botName}` : `Error: ${result.error}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Channels</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Chat with OpenClaw from Telegram, Discord, and more
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Telegram */}
        <View style={[styles.channelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.channelHeader}>
            <View style={[styles.channelIcon, { backgroundColor: '#0088cc20' }]}>
              <Ionicons name="paper-plane" size={24} color="#0088cc" />
            </View>
            <View style={styles.channelInfo}>
              <Text style={[styles.channelName, { color: colors.text }]}>Telegram</Text>
              <Text style={[styles.channelDesc, { color: colors.textMuted }]}>
                {config.telegramConfig.enabled
                  ? config.telegramConfig.botToken ? 'Configured' : 'Token needed'
                  : 'Disabled'}
              </Text>
            </View>
            <View style={[
              styles.statusDot,
              { backgroundColor: config.telegramConfig.enabled && config.telegramConfig.botToken ? colors.secondary : colors.textMuted }
            ]} />
          </View>

          <View style={styles.channelBody}>
            <Text style={[styles.setupGuide, { color: colors.textSecondary }]}>
              1. Message @BotFather on Telegram{'\n'}
              2. Create a new bot with /newbot{'\n'}
              3. Copy the bot token to Settings{'\n'}
              4. Enable Telegram in Settings
            </Text>

            {config.telegramConfig.enabled && config.telegramConfig.botToken && (
              <View style={styles.channelActions}>
                <Pressable style={[styles.testBtn, { backgroundColor: '#0088cc20' }]} onPress={testTelegram}>
                  <Text style={[styles.testBtnText, { color: '#0088cc' }]}>Test Connection</Text>
                </Pressable>
                {telegramStatus && (
                  <Text style={[styles.statusText, { color: telegramStatus.startsWith('Error') ? colors.error : colors.secondary }]}>
                    {telegramStatus}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Discord */}
        <View style={[styles.channelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.channelHeader}>
            <View style={[styles.channelIcon, { backgroundColor: '#5865F220' }]}>
              <Ionicons name="logo-discord" size={24} color="#5865F2" />
            </View>
            <View style={styles.channelInfo}>
              <Text style={[styles.channelName, { color: colors.text }]}>Discord</Text>
              <Text style={[styles.channelDesc, { color: colors.textMuted }]}>
                {config.discordConfig.enabled
                  ? config.discordConfig.botToken ? 'Configured' : 'Token needed'
                  : 'Disabled'}
              </Text>
            </View>
            <View style={[
              styles.statusDot,
              { backgroundColor: config.discordConfig.enabled && config.discordConfig.botToken ? colors.secondary : colors.textMuted }
            ]} />
          </View>

          <View style={styles.channelBody}>
            <Text style={[styles.setupGuide, { color: colors.textSecondary }]}>
              1. Go to Discord Developer Portal{'\n'}
              2. Create a new application and bot{'\n'}
              3. Enable MESSAGE CONTENT intent{'\n'}
              4. Copy bot token to Settings{'\n'}
              5. Invite bot to your server
            </Text>

            {config.discordConfig.enabled && config.discordConfig.botToken && (
              <View style={styles.channelActions}>
                <Pressable style={[styles.testBtn, { backgroundColor: '#5865F220' }]} onPress={testDiscord}>
                  <Text style={[styles.testBtnText, { color: '#5865F2' }]}>Test Connection</Text>
                </Pressable>
                {discordStatus && (
                  <Text style={[styles.statusText, { color: discordStatus.startsWith('Error') ? colors.error : colors.secondary }]}>
                    {discordStatus}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* How it works */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            When a channel bot is enabled, messages sent to the bot are processed by OpenClaw using
            the same AI model and system prompt. Responses are sent back through the same channel.
            All conversations use persistent memory.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 4 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  content: { flex: 1 },
  contentInner: { padding: 20, gap: 16 },
  channelCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  channelHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  channelIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelInfo: { flex: 1, gap: 2 },
  channelName: { fontSize: 17, fontWeight: '600' },
  channelDesc: { fontSize: 13 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  channelBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  setupGuide: { fontSize: 13, lineHeight: 22 },
  channelActions: { gap: 8 },
  testBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  testBtnText: { fontSize: 14, fontWeight: '600' },
  statusText: { fontSize: 13, fontWeight: '500' },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
