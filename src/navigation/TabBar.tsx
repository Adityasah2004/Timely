import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/tokens';
import { useStore } from '../lib/store';
import { Icon } from '../components/Icon';
import type { TabName } from '../lib/types';
import type { IconName } from '../components/Icon';

const TABS: { id: TabName; label: string; icon: IconName }[] = [
  { id: 'today',  label: 'Today',  icon: 'home'    },
  { id: 'plan',   label: 'Plan',   icon: 'cal'     },
  { id: 'todos',  label: 'To-do',  icon: 'check'   },
  { id: 'chat',   label: 'Chat',   icon: 'message' },
  { id: 'docs',   label: 'Docs',   icon: 'note'    },
];

export function TabBar() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [bottomInset, setBottomInset] = useState(insets.bottom);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (insets.bottom > 0) {
      setBottomInset(insets.bottom);
    }
  }, [insets.bottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={[tb.container, { bottom: 12 + bottomInset }]}>
      {TABS.map(tab => {
        const active = state.tab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[tb.tab, active && tb.tabActive]}
            onPress={() => dispatch({ t: 'tab', tab: tab.id })}
          >
            <Icon name={tab.icon} size={18} color={active ? '#fff' : colors.fg6} />
            <Text style={[tb.label, active && tb.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 64,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border12,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  tab: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabActive: {
    backgroundColor: colors.foreground,
  },
  label: {
    fontFamily: 'Courier',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: colors.fg6,
  },
  labelActive: {
    color: 'rgba(255,255,255,0.6)',
  },
});
