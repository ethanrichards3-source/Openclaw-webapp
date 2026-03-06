import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { themes } from '../config/theme';

const CLAUDE_LOGIN_URL = 'https://claude.ai/login';
const CLAUDE_CHAT_URL = 'https://claude.ai/chat';

/**
 * WebView-based login screen.
 * Loads claude.ai/login, lets the user sign in normally,
 * then captures the session cookie and org ID automatically.
 */
export function ClaudeLoginScreen({ onComplete }: { onComplete: () => void }) {
  const config = useStore(s => s.config);
  const updateConfig = useStore(s => s.updateConfig);
  const colors = themes[config.theme].colors;
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(CLAUDE_LOGIN_URL);
  const [loginStatus, setLoginStatus] = useState<'login' | 'extracting' | 'done'>('login');

  // JavaScript to extract session cookie and org ID from the page
  const extractSessionJS = `
    (function() {
      try {
        // Extract org ID from URL or page content
        var orgMatch = window.location.href.match(/organization\\/([a-f0-9-]+)/);
        var orgId = orgMatch ? orgMatch[1] : '';

        // If we're on the chat page, also try to get org from the page
        if (!orgId) {
          // Try meta tags or script data
          var scripts = document.querySelectorAll('script');
          for (var i = 0; i < scripts.length; i++) {
            var text = scripts[i].textContent || '';
            var match = text.match(/"organizationId"\\s*:\\s*"([a-f0-9-]+)"/);
            if (match) { orgId = match[1]; break; }
            match = text.match(/"uuid"\\s*:\\s*"([a-f0-9-]+)"/);
            if (match && !orgId) { orgId = match[1]; }
          }
        }

        // Try to get org from API
        if (!orgId) {
          fetch('/api/organizations', { credentials: 'include' })
            .then(r => r.json())
            .then(orgs => {
              if (orgs && orgs.length > 0) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'session',
                  orgId: orgs[0].uuid,
                  loggedIn: true
                }));
              }
            })
            .catch(() => {});
        }

        // Get all cookies
        var cookies = document.cookie;
        var sessionMatch = cookies.match(/sessionKey=([^;]+)/);
        var sessionCookie = sessionMatch ? sessionMatch[1] : '';

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'session',
          sessionCookie: sessionCookie,
          orgId: orgId,
          loggedIn: !!sessionCookie,
          url: window.location.href,
          cookies: cookies
        }));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          message: e.message
        }));
      }
    })();
    true;
  `;

  // Alternative: inject cookie extraction via httpOnly cookie workaround
  // We fetch the /api/auth/session endpoint which returns user info if logged in
  const checkAuthJS = `
    (function() {
      fetch('/api/auth/session', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (data && data.user) {
            // User is logged in, get org info
            return fetch('/api/organizations', { credentials: 'include' })
              .then(r => r.json())
              .then(orgs => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'auth_success',
                  user: data.user,
                  orgId: (orgs && orgs[0]) ? orgs[0].uuid : '',
                  orgName: (orgs && orgs[0]) ? orgs[0].name : ''
                }));
              });
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'not_logged_in'
            }));
          }
        })
        .catch(e => {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'auth_check_error',
            message: e.message
          }));
        });
    })();
    true;
  `;

  const handleNavigationChange = useCallback((navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);

    // When user reaches the chat page, they've logged in successfully
    if (navState.url.includes('claude.ai/chat') || navState.url.includes('claude.ai/new')) {
      setLoginStatus('extracting');
      // Give the page a moment to fully load, then extract session
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(checkAuthJS);
        webViewRef.current?.injectJavaScript(extractSessionJS);
      }, 2000);
    }
  }, []);

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'auth_success') {
        // We confirmed the user is logged in
        // Save the org ID
        await updateConfig({
          authMethod: 'session_cookie',
          organizationId: data.orgId || '',
        });

        // Now try to extract the actual session cookie
        webViewRef.current?.injectJavaScript(extractSessionJS);

        if (data.orgId) {
          setLoginStatus('done');
          Alert.alert(
            'Login Successful',
            `Signed in${data.orgName ? ` to ${data.orgName}` : ''}.\n\nNote: The app will use your browser session to communicate with Claude. Your session stays active as long as you're logged in on claude.ai.`,
            [{ text: 'Start Chatting', onPress: onComplete }]
          );
        }
      }

      if (data.type === 'session') {
        if (data.sessionCookie) {
          await updateConfig({
            authMethod: 'session_cookie',
            sessionCookie: data.sessionCookie,
            organizationId: data.orgId || config.organizationId,
          });
        }

        if (data.orgId && !config.organizationId) {
          await updateConfig({ organizationId: data.orgId });
        }

        if ((data.sessionCookie || data.loggedIn) && data.orgId) {
          setLoginStatus('done');
          if (loginStatus !== 'done') {
            Alert.alert(
              'Login Successful',
              'Connected to Claude! Your session has been saved.',
              [{ text: 'Start Chatting', onPress: onComplete }]
            );
          }
        }
      }

      if (data.type === 'not_logged_in') {
        // Still on login page, wait
        setLoginStatus('login');
      }
    } catch {
      // Ignore parse errors from non-JSON messages
    }
  }, [config.organizationId, loginStatus, onComplete, updateConfig]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={onComplete} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {loginStatus === 'login' ? 'Sign in to Claude' :
             loginStatus === 'extracting' ? 'Connecting...' :
             'Connected!'}
          </Text>
          <Text style={[styles.headerUrl, { color: colors.textMuted }]} numberOfLines={1}>
            {currentUrl}
          </Text>
        </View>
        {loginStatus === 'extracting' && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
        {loginStatus === 'done' && (
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        )}
      </View>

      {/* Login hint */}
      {loginStatus === 'login' && (
        <View style={[styles.hintBar, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.primary }]}>
            Sign in with your Claude account. The app will automatically connect when you're logged in.
          </Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: CLAUDE_LOGIN_URL }}
        style={styles.webView}
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleMessage}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        userAgent="Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Claude...</Text>
          </View>
        )}
      />

      {/* Manual retry button */}
      {loginStatus === 'extracting' && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              webViewRef.current?.injectJavaScript(checkAuthJS);
              webViewRef.current?.injectJavaScript(extractSessionJS);
            }}
          >
            <Text style={styles.retryText}>Retry Connection</Text>
          </Pressable>
          <Pressable
            style={[styles.skipButton, { borderColor: colors.border }]}
            onPress={onComplete}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for Now</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerUrl: { fontSize: 11, marginTop: 2 },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hintText: { fontSize: 13, flex: 1 },
  webView: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  retryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipText: { fontSize: 15, fontWeight: '500' },
});
