import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LAYOUT } from './src/config/responsive';
import { useStore } from './src/store';
import { themes } from './src/config/theme';
import { ChatScreen } from './src/screens/ChatScreen';
import { SkillsScreen } from './src/screens/SkillsScreen';
import { EvolutionScreen } from './src/screens/EvolutionScreen';
import { TasksScreen } from './src/screens/TasksScreen';
import { MemoryScreen } from './src/screens/MemoryScreen';
import { ChannelsScreen } from './src/screens/ChannelsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function AppContent() {
  const config = useStore(s => s.config);
  const isConfigLoaded = useStore(s => s.isConfigLoaded);
  const pendingEvolutions = useStore(s => s.pendingEvolutions);
  const memoryCount = useStore(s => s.memoryCount);
  const themeColors = themes[config.theme].colors;

  if (!isConfigLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  const navTheme = {
    ...(config.theme === 'light' ? DefaultTheme : DarkTheme),
    colors: {
      ...(config.theme === 'light' ? DefaultTheme : DarkTheme).colors,
      background: themeColors.background,
      card: themeColors.tabBar,
      border: themeColors.border,
      primary: themeColors.primary,
      text: themeColors.text,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={config.theme === 'light' ? 'dark' : 'light'} backgroundColor={themeColors.statusBar} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: themeColors.tabBar,
            borderTopColor: themeColors.border,
            height: LAYOUT.tabBar.height,
            paddingBottom: LAYOUT.tabBar.paddingBottom,
            paddingTop: 4,
          },
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textMuted,
          tabBarLabelStyle: {
            fontSize: LAYOUT.tabBar.labelSize,
            fontWeight: '600',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;
            switch (route.name) {
              case 'Chat':
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                break;
              case 'Skills':
                iconName = focused ? 'extension-puzzle' : 'extension-puzzle-outline';
                break;
              case 'Evolution':
                iconName = focused ? 'flask' : 'flask-outline';
                break;
              case 'Memory':
                iconName = focused ? 'library' : 'library-outline';
                break;
              case 'Channels':
                iconName = focused ? 'globe' : 'globe-outline';
                break;
              case 'Tasks':
                iconName = focused ? 'calendar' : 'calendar-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'help-outline';
            }
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Memory" component={MemoryScreen}
          options={{
            tabBarBadge: memoryCount > 0 ? memoryCount : undefined,
            tabBarBadgeStyle: { backgroundColor: themeColors.primary, fontSize: 9 },
          }}
        />
        <Tab.Screen name="Channels" component={ChannelsScreen} />
        <Tab.Screen name="Skills" component={SkillsScreen} />
        <Tab.Screen
          name="Evolution"
          component={EvolutionScreen}
          options={{
            tabBarBadge: pendingEvolutions.length > 0 ? pendingEvolutions.length : undefined,
            tabBarBadgeStyle: { backgroundColor: themeColors.warning, fontSize: 10 },
          }}
        />
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const initialize = useStore(s => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return <AppContent />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
