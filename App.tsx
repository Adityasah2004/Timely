import React, { useEffect } from 'react';
import { View, StatusBar, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StoreProvider, useStore } from './src/lib/store';
import { TopBar } from './src/navigation/TopBar';
import { TabBar } from './src/navigation/TabBar';
import { TodayScreen } from './src/screens/Today/TodayScreen';
import { PlanScreen } from './src/screens/Plan/PlanScreen';
import { TodosScreen } from './src/screens/Todos/TodosScreen';
import { ChatScreen } from './src/screens/Chat/ChatScreen';
import { DocsScreen } from './src/screens/Docs/DocsScreen';
import { YouScreen } from './src/screens/You/YouScreen';
import { NotificationsScreen } from './src/screens/Notifications/NotificationsScreen';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { AuthScreen } from './src/screens/Auth/AuthScreen';
import { HouseholdScreen } from './src/screens/Auth/HouseholdScreen';
import { EventSheet, AddEventSheet, AddTodoSheet } from './src/components/Sheets';

function AppInner() {
  const { state, dispatch } = useStore();

  // Intercept Android back gesture/button: go to Today instead of exiting
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.modal) {
        dispatch({ t: 'closeModal' });
        return true;
      }
      if (state.tab !== 'today') {
        dispatch({ t: 'tab', tab: 'today' });
        return true;
      }
      return false; // let the OS minimize/exit on home tab
    });
    return () => sub.remove();
  }, [state.tab, state.modal]);

  // Splash while Supabase restores session
  if (!state.authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#141414" />
      </View>
    );
  }

  // Not signed in
  if (!state.session) {
    return <AuthScreen />;
  }

  // Signed in but no household yet
  if (!state.householdId) {
    return <HouseholdScreen userId={state.userId!} />;
  }

  // Onboarding flow
  if (state.showOnboarding) {
    return <OnboardingScreen onDone={() => dispatch({ t: 'finishOnboard' })} />;
  }

  const tab = state.tab;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <TopBar />
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: tab === 'today' ? 'flex' : 'none' }}><TodayScreen /></View>
        <View style={{ flex: 1, display: tab === 'plan' ? 'flex' : 'none' }}><PlanScreen /></View>
        <View style={{ flex: 1, display: tab === 'todos' ? 'flex' : 'none' }}><TodosScreen /></View>
        <View style={{ flex: 1, display: tab === 'chat' ? 'flex' : 'none' }}><ChatScreen /></View>
        <View style={{ flex: 1, display: tab === 'docs' ? 'flex' : 'none' }}><DocsScreen /></View>
        <View style={{ flex: 1, display: tab === 'you' ? 'flex' : 'none' }}><YouScreen /></View>
        <View style={{ flex: 1, display: tab === 'notifications' ? 'flex' : 'none' }}><NotificationsScreen /></View>
      </View>
      <TabBar />

      <EventSheet />
      <AddEventSheet />
      <AddTodoSheet />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <AppInner />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
