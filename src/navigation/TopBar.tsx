import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../lib/tokens';
import { useStore } from '../lib/store';
import { fmtTopDate } from '../lib/utils';
import { UserChip } from '../components/Primitives';
import { Icon } from '../components/Icon';

export function TopBar() {
  const { state, dispatch, refresh } = useStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const unread = state.notifications.filter(n => !n.read).length;

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <View style={[tb.container, { paddingTop: insets.top + 10 }]}>
      <View>
        <Text style={tb.date}>{fmtTopDate(state.clock)}</Text>
      </View>
      <View style={tb.right}>
        <TouchableOpacity style={tb.iconBtn} onPress={handleRefresh} disabled={refreshing}>
          {refreshing
            ? <ActivityIndicator size="small" color={colors.fg2} />
            : <Icon name="reset" size={16} />}
        </TouchableOpacity>
        <TouchableOpacity style={tb.iconBtn} onPress={() => dispatch({ t: 'tab', tab: 'notifications' })}>
          <Icon name="bell" size={16} />
          {unread > 0 && (
            <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8,
              borderRadius: 4, backgroundColor: colors.foreground, borderWidth: 1.5, borderColor: '#fff' }} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={tb.iconBtn} onPress={() => dispatch({ t: 'tab', tab: 'you' })}>
          <UserChip id={state.viewer} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: '#fff',
    gap: 12,
  },
  date: {
    fontWeight: '800',
    fontSize: 20,
    letterSpacing: -0.6,
    lineHeight: 22,
    marginTop: 6,
  },
  right: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bgTint04,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border08,
  },
});
