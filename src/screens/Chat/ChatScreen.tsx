import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { colors, radius, shadows, SLOT_COLORS } from '../../lib/tokens';
import { useStore } from '../../lib/store';
import { Icon } from '../../components/Icon';
import { ScreenHeader, UserChip, Card } from '../../components/Primitives';
import { supabase } from '../../lib/supabase';
import { deriveKey, encryptText, decryptText } from '../../lib/crypto';
import type { UserId } from '../../lib/types';

function getFriendlyDateLabel(createdAt?: string): string {
  if (!createdAt) return 'TODAY';
  const messageDate = new Date(createdAt);
  if (isNaN(messageDate.getTime())) return 'TODAY';

  const today = new Date();
  const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d2 = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'TODAY';
  } else if (diffDays === 1) {
    return 'YESTERDAY';
  } else {
    return messageDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  }
}

export function ChatScreen() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [bottomInset, setBottomInset] = useState(insets.bottom);
  
  // Autocomplete overlays
  const [showCommands, setShowCommands] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  // E2EE States
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Load E2EE key from SecureStore on mount/household change
  useEffect(() => {
    async function loadKey() {
      if (!state.householdId) return;
      try {
        const stored = await SecureStore.getItemAsync(`sprint_key_${state.householdId}`);
        if (stored) {
          const derived = deriveKey(stored);
          setEncryptionKey(derived);
          setIsUnlocked(true);
        } else {
          setEncryptionKey(null);
          setIsUnlocked(false);
        }
      } catch (err) {
        console.warn('SecureStore load error:', err);
      }
    }
    loadKey();
  }, [state.householdId]);

  // Handle Passphrase Unlock
  const handleUnlock = async () => {
    if (!passphraseInput.trim() || !state.householdId) return;
    try {
      const trimmed = passphraseInput.trim();
      const derived = deriveKey(trimmed);
      await SecureStore.setItemAsync(`sprint_key_${state.householdId}`, trimmed);
      setEncryptionKey(derived);
      setIsUnlocked(true);
      setUnlockError('');
      setPassphraseInput('');
    } catch (err) {
      setUnlockError('Failed to save secure key');
    }
  };

  // Handle Locking / Key Rotation
  const handleLock = async () => {
    if (!state.householdId) return;
    try {
      await SecureStore.deleteItemAsync(`sprint_key_${state.householdId}`);
      setEncryptionKey(null);
      setIsUnlocked(false);
    } catch (err) {
      console.warn('SecureStore lock error:', err);
    }
  };

  useEffect(() => {
    if (insets.bottom > 0) {
      setBottomInset(insets.bottom);
    }
  }, [insets.bottom]);

  // Monitor keyboard visibility and height to dynamically position the input box
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Monitor text changes to toggle slash commands and @ mentions autocomplete
  const handleTextChange = (val: string) => {
    setText(val);
    
    // 1. Slash commands autocomplete check
    if (val === '/') {
      setShowCommands(true);
      setShowMentions(false);
    } else if (val.startsWith('/') && !val.includes(' ')) {
      setShowCommands(true);
      setShowMentions(false);
    } else {
      setShowCommands(false);
    }

    // 2. Mentions autocomplete check (matches the word currently being typed starting with @)
    const words = val.split(' ');
    const lastWord = words[words.length - 1] || '';
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionSearch(lastWord.slice(1));
      setShowCommands(false);
    } else {
      setShowMentions(false);
    }
  };

  // Handle selecting a mention from autocomplete
  const handleSelectMention = (displayName: string) => {
    const words = text.split(' ');
    words.pop(); // remove the partial @mention search
    words.push(`@${displayName} `);
    setText(words.join(' '));
    setShowMentions(false);
  };

  const SLASH_COMMANDS = [
    { cmd: '/todo ', desc: 'Create a shared sprint task', icon: 'check' },
    { cmd: '/event ', desc: 'Schedule a roadmap meeting', icon: 'cal' },
    { cmd: '/status', desc: 'Generate daily AI dispatcher status digest', icon: 'bolt' },
    { cmd: '/help', desc: 'Show AI assistant commands and shortcuts', icon: 'user' },
  ];

  const filteredCommands = SLASH_COMMANDS.filter(item =>
    item.cmd.toLowerCase().startsWith(text.toLowerCase())
  );

  // Filter other household members for tagging (excluding oneself)
  const filteredProfiles = Object.entries(state.profiles)
    .filter(([slot, prof]) => {
      if (slot === state.viewer) return false;
      if (!mentionSearch) return true;
      return prof.displayName.toLowerCase().includes(mentionSearch.toLowerCase());
    })
    .map(([slot, prof]) => ({ slot: slot as UserId, ...prof }));

  // Auto-scroll to bottom on mount or when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [state.messages, isUnlocked]);

  const handleSend = async (customText?: string) => {
    const msgText = (customText || text).trim();
    if (!msgText || !state.householdId || !state.userId) return;

    if (!customText) setText('');
    setLoading(true);

    try {
      const myDisplayName = state.profiles[state.viewer as UserId]?.displayName || `Founder ${state.viewer}`;

      // ENCRYPT the user message before sending to database!
      const encryptedContent = encryptionKey ? encryptText(msgText, encryptionKey) : msgText;

      // 1. Send the user's message
      const { error } = await supabase.from('messages').insert({
        household_id: state.householdId,
        sender_id: state.userId,
        sender_short: state.viewer,
        content: encryptedContent,
        is_system: false,
      });

      if (error) throw error;

      // 2. PARSE FOR MENTIONS (and trigger real-time system notifications)
      Object.entries(state.profiles).forEach(async ([slot, prof]) => {
        const mentionTag = `@${prof.displayName}`;
        if (msgText.toLowerCase().includes(mentionTag.toLowerCase()) && slot !== state.viewer) {
          // Insert a secure push notification inside Supabase for tagged member
          await supabase.from('notifications').insert({
            household_id: state.householdId,
            for_user:     slot,
            kind:         'chat',
            title:        'Sync War Room Tag',
            body:         `${myDisplayName} mentioned you: "${msgText.substring(0, 60)}"`,
            urgent:       true,
          });
        }
      });

      // 3. Local Smart Dispatcher AI Parser (operates on decrypted msgText)
      const lower = msgText.toLowerCase();

      if (lower.startsWith('/todo ')) {
        const todoText = msgText.slice(6).trim();
        if (todoText) {
          // Create the todo
          await supabase.from('todos').insert({
            household_id: state.householdId,
            owner_id: state.userId,
            text: todoText,
            is_shared: true,
            priority: 2,
            due_label: 'TODAY',
          });

          // Encrypt dispatcher message response!
          const dispatcherContent = `🤖 **DISPATCHER:** Added task **"${todoText}"** to the shared backlog.`;
          const encryptedDispatcher = encryptionKey ? encryptText(dispatcherContent, encryptionKey) : dispatcherContent;

          // Dispatcher response
          await supabase.from('messages').insert({
            household_id: state.householdId,
            sender_short: 'S',
            content: encryptedDispatcher,
            is_system: true,
          });
        }
      } else if (lower.startsWith('/event ')) {
        const eventParts = msgText.slice(7).trim().split(' at ');
        const eventTitle = eventParts[0]?.trim();
        let eventTime = '12:00:00';
        if (eventParts[1]) {
          const rawTime = eventParts[1].trim();
          eventTime = rawTime.includes(':') ? `${rawTime}:00` : `${rawTime}:00:00`;
        }

        if (eventTitle) {
          // Create calendar event
          await supabase.from('events').insert({
            household_id: state.householdId,
            owner_id: state.userId,
            title: eventTitle,
            start_time: eventTime,
            end_time: eventTime, // simpler for quick creations
            event_date: new Date().toISOString().split('T')[0],
            who: 'B',
            is_private: false,
          });

          // Encrypt dispatcher message response!
          const dispatcherContent = `🤖 **DISPATCHER:** Scheduled **"${eventTitle}"** today at ${eventTime.slice(0, 5)} in the roadmap.`;
          const encryptedDispatcher = encryptionKey ? encryptText(dispatcherContent, encryptionKey) : dispatcherContent;

          // Dispatcher response
          await supabase.from('messages').insert({
            household_id: state.householdId,
            sender_short: 'S',
            content: encryptedDispatcher,
            is_system: true,
          });
        }
      } else if (
        lower.includes('@dispatcher') ||
        lower.includes('@coordinator') ||
        lower === 'help' ||
        lower === '/help' ||
        lower === '/status'
      ) {
        let content = '';
        if (
          lower.includes('summarize') ||
          lower.includes('agenda') ||
          lower.includes('status') ||
          lower === '/status'
        ) {
          // Compile daily status summary
          const todayEvents = state.events.filter(e => {
            const todayStr = new Date().toISOString().split('T')[0];
            return e.day === todayStr;
          });
          const activeTodos = state.todos.filter(t => !t.done);

          content = `🤖 **DISPATCHER DIGEST:**\n\n📅 **Today's Roadmap:**\n${
            todayEvents.length > 0
              ? todayEvents.map(e => `• ${e.start} - ${e.title}`).join('\n')
              : '• No sessions scheduled for today.'
          }\n\n✅ **Sprint Backlog (${activeTodos.length} active):**\n${
            activeTodos.length > 0
              ? activeTodos.slice(0, 5).map(t => `• ${t.text}`).join('\n') + (activeTodos.length > 5 ? '\n• ...and more' : '')
              : '• Backlog is clear! Excellent job.'
          }`;
        } else {
          content = `🤖 **DISPATCHER HELP:**\n\nI parse your messages in real-time to automate co-founder coordination:\n\n• **Create Tasks**: Type \`/todo [task]\` (e.g. \`/todo Review pitch deck\`)\n• **Schedule Roadmaps**: Type \`/event [meeting] at [HH:MM]\` (e.g. \`/event VC call at 16:30\`)\n• **Get Status**: Type \`/status\` (or \`@dispatcher summarize\`)\n• **Help**: Type \`/help\` (or \`@dispatcher help\``;
        }

        // Encrypt dispatcher message response!
        const encryptedContent = encryptionKey ? encryptText(content, encryptionKey) : content;

        await supabase.from('messages').insert({
          household_id: state.householdId,
          sender_short: 'S',
          content: encryptedContent,
          is_system: true,
        });
      }
    } catch (err) {
      console.warn('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔒 Frosted Glass / Security Unlock HUD
  const Container = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const containerProps = Platform.OS === 'ios' ? {
    behavior: 'padding' as const,
    keyboardVerticalOffset: insets.top + 60
  } : {};

  if (!isUnlocked) {
    return (
      <Container
        style={{ flex: 1, backgroundColor: '#0a0a0a', paddingBottom: Platform.OS === 'android' ? (keyboardHeight > 0 ? keyboardHeight : 0) : 0 }}
        {...containerProps}
      >
        <View style={ch.unlockContainer}>
          <Card tight style={ch.unlockCard}>
            <View style={ch.lockIconWrapper}>
              <Icon name="lock" size={26} color={colors.foreground} />
            </View>
            <Text style={ch.unlockTitle}>Sync War Room</Text>
            <Text style={ch.unlockSub}>
              Messages in this chat are secured with end-to-end encryption. Enter your shared secret passphrase to decrypt.
            </Text>

            <TextInput
              secureTextEntry
              style={ch.unlockInput}
              placeholder="Co-founder Passphrase"
              placeholderTextColor={colors.fg5}
              value={passphraseInput}
              onChangeText={setPassphraseInput}
              onSubmitEditing={handleUnlock}
              autoFocus
            />

            {unlockError ? <Text style={ch.unlockErr}>{unlockError}</Text> : null}

            <TouchableOpacity style={ch.unlockBtn} onPress={handleUnlock}>
              <Text style={ch.unlockBtnText}>UNLOCK DECRYPT</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Container>
    );
  }

  // Lock button placed on header right
  const lockHeaderButton = (
    <TouchableOpacity onPress={handleLock} style={ch.lockHeaderBtn}>
      <Icon name="lock" size={11} color={colors.foreground} />
      <Text style={ch.lockHeaderBtnText}>LOCK</Text>
    </TouchableOpacity>
  );

  return (
    <Container
      style={{ flex: 1, backgroundColor: '#fff', paddingBottom: Platform.OS === 'android' ? (keyboardHeight > 0 ? keyboardHeight + 12 : 0) : 0 }}
      {...containerProps}
    >
      <View style={ch.container}>
        {/* Sticky Screen Header at the top of the chat area */}
        <View style={{ paddingHorizontal: 18, paddingTop: 18, borderBottomWidth: 1, borderBottomColor: colors.border06, backgroundColor: '#fff', paddingBottom: 10 }}>
          <ScreenHeader
            eyebrow={`🔒 SECURE E2EE · ${state.messages.length} MESSAGE${state.messages.length === 1 ? '' : 'S'}`}
            title="Sync"
            ghost="at the speed of thought."
            sub="Zero-knowledge co-founder messaging & automated AI dispatcher."
            right={lockHeaderButton}
          />
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 18, paddingBottom: 20 }}
        >
          {state.messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 80 }}>
              <Icon name="message" size={40} color={colors.fg8} />
              <Text style={ch.emptyText}>Feed is clear. Start planning your next sprint.</Text>
            </View>
          ) : (
            (() => {
              let lastDateLabel = '';
              return state.messages.map((msg) => {
                const dateLabel = getFriendlyDateLabel(msg.createdAt);
                const showHeader = dateLabel !== lastDateLabel;
                lastDateLabel = dateLabel;

                const isMe = msg.senderShort === state.viewer;
                const isSystem = msg.isSystem || msg.senderShort === 'S';

                // DECRYPT ciphertext locally on device!
                const decryptedContent = encryptionKey ? decryptText(msg.content, encryptionKey) : msg.content;
                const isLocked = decryptedContent.startsWith('🔒 [Decryption failed');

                const senderProfile = state.profiles[msg.senderShort as UserId];
                const slotColor = SLOT_COLORS[msg.senderShort] || SLOT_COLORS['1'];

                return (
                  <View key={msg.id} style={{ width: '100%' }}>
                    {showHeader && (
                      <View style={ch.dateHeaderContainer}>
                        <View style={ch.dateHeaderLine} />
                        <View style={ch.dateHeaderPill}>
                          <Text style={ch.dateHeaderText}>{dateLabel}</Text>
                        </View>
                        <View style={ch.dateHeaderLine} />
                      </View>
                    )}

                    {isSystem ? (
                      <View style={ch.systemContainer}>
                        <Card tight style={ch.systemCard}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Icon name="bolt" size={12} color={colors.foreground} />
                            <Text style={ch.systemBadge}>DISPATCHER</Text>
                            <Text style={ch.systemTime}>{msg.timestamp}</Text>
                          </View>
                          <Text style={ch.systemContent}>{decryptedContent}</Text>
                        </Card>
                      </View>
                    ) : (
                      <View style={[ch.messageRow, isMe ? ch.rowRight : ch.rowLeft]}>
                        {/* Incoming message avatar aligned to the bottom-left */}
                        {!isMe && (
                          <View style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 2 }}>
                            <UserChip id={msg.senderShort as UserId} size="sm" />
                          </View>
                        )}
                        
                        <View style={{ maxWidth: '78%' }}>
                          <View
                            style={[
                              ch.bubble,
                              isMe ? ch.bubbleMe : [ch.bubblePartner, { borderColor: slotColor.border }],
                              isLocked && (isMe ? ch.bubbleLockedMe : ch.bubbleLockedPartner)
                            ]}
                          >
                            {isLocked ? (
                              <View style={{ paddingVertical: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <Icon name="lock" size={13} color={isMe ? 'rgba(255,255,255,0.45)' : colors.fg5} />
                                  <Text style={[ch.lockedTitleText, { color: isMe ? 'rgba(255,255,255,0.55)' : colors.fg5 }]}>
                                    ENCRYPTED CHAT
                                  </Text>
                                </View>
                                <Text style={[ch.lockedSubText, { color: isMe ? 'rgba(255,255,255,0.35)' : colors.fg6 }]}>
                                  Enter correct secret passphrase to decrypt this co-founder message.
                                </Text>
                              </View>
                            ) : (
                              <Text style={[ch.messageText, isMe ? ch.textMe : ch.textPartner]}>
                                {decryptedContent}
                              </Text>
                            )}
                            
                            {/* Integrated E2E lock security badge, sender name & timestamp */}
                            <View style={{ flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 4, marginTop: 4 }}>
                              <Text style={[ch.messageSender, { color: isMe ? 'rgba(255,255,255,0.6)' : slotColor.fg }]}>
                                {isMe ? 'YOU' : (senderProfile?.displayName || `Founder ${msg.senderShort}`)}
                              </Text>
                              <Text style={{ fontSize: 8, color: isMe ? 'rgba(255,255,255,0.4)' : colors.fg6 }}>·</Text>
                              <Icon name="lock" size={8} color={isMe ? 'rgba(255,255,255,0.45)' : colors.fg6} />
                              <Text style={[ch.messageTime, isMe ? ch.timeMe : ch.timePartner]}>
                                {msg.timestamp}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              });
            })()
          )}
        </ScrollView>

        {/* Input Bar & Autocomplete overlays */}
        <View style={[ch.inputWrapper, { marginBottom: keyboardVisible ? 8 : (12 + bottomInset + 64 + 4) }]}>
          
          {/* 1. Slash Commands Autocomplete Overlay */}
          {showCommands && filteredCommands.length > 0 && (
            <Card tight style={ch.autocompleteCard}>
              <Text style={ch.autocompleteHeader}>SLASH COMMANDS</Text>
              {filteredCommands.map((item, idx) => (
                <TouchableOpacity
                  key={item.cmd}
                  style={[
                    ch.autocompleteRow,
                    idx < filteredCommands.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border06 }
                  ]}
                  onPress={() => {
                    setText(item.cmd);
                    setShowCommands(false);
                  }}
                >
                  <Icon name={item.icon as any} size={12} color={colors.foreground} />
                  <View style={{ flex: 1 }}>
                    <Text style={ch.autocompleteCmd}>{item.cmd}</Text>
                    <Text style={ch.autocompleteDesc}>{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          {/* 2. Co-Founder Mentions Autocomplete Overlay */}
          {showMentions && filteredProfiles.length > 0 && (
            <Card tight style={ch.autocompleteCard}>
              <Text style={ch.autocompleteHeader}>MENTION TEAM</Text>
              {filteredProfiles.map((item, idx) => (
                <TouchableOpacity
                  key={item.slot}
                  style={[
                    ch.autocompleteRow,
                    idx < filteredProfiles.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border06 }
                  ]}
                  onPress={() => handleSelectMention(item.displayName)}
                >
                  <UserChip id={item.slot} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text style={ch.mentionName}>{item.displayName}</Text>
                    {item.roleLabel ? <Text style={ch.mentionRole}>{item.roleLabel}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </Card>
          )}

          <View style={ch.inputContainer}>
            <TextInput
              style={ch.input}
              placeholder="Message co-founders or use /todo, /event..."
              placeholderTextColor={colors.fg6}
              value={text}
              onChangeText={handleTextChange}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[ch.sendBtn, !text.trim() && { opacity: 0.4 }]}
              onPress={() => handleSend()}
              disabled={!text.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="arrow" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Container>
  );
}

const ch = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontFamily: 'Courier',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.fg6,
    textAlign: 'center',
    marginTop: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  senderName: {
    fontSize: 10,
    fontFamily: 'Courier',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.foreground,
    fontWeight: '800',
  },
  senderRole: {
    fontSize: 9,
    fontFamily: 'Courier',
    textTransform: 'uppercase',
    color: colors.fg5,
    letterSpacing: 0.5,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    ...shadows.sm,
  },
  bubbleMe: {
    backgroundColor: colors.foreground,
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: '#fff',
  },
  textPartner: {
    color: colors.foreground,
  },
  messageSender: {
    fontFamily: 'Courier',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bubbleLockedMe: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  bubbleLockedPartner: {
    backgroundColor: colors.bgTint02,
    borderWidth: 1,
    borderColor: colors.border08,
    borderStyle: 'dashed',
  },
  lockedTitleText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  lockedSubText: {
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 8,
    fontFamily: 'Courier',
  },
  timeMe: {
    color: 'rgba(255,255,255,0.6)',
  },
  timePartner: {
    color: colors.fg6,
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
  },
  systemCard: {
    width: '94%',
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border12,
  },
  systemBadge: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.foreground,
  },
  systemTime: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: colors.fg6,
    marginLeft: 'auto',
  },
  systemContent: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.foreground,
  },
  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.border06,
    paddingVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.bgTint02,
    borderWidth: 1,
    borderColor: colors.border10,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.foreground,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  autocompleteCard: {
    backgroundColor: '#fff',
    borderColor: colors.border12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
    marginHorizontal: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  autocompleteHeader: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    color: colors.fg5,
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  autocompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  autocompleteCmd: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
  },
  autocompleteDesc: {
    fontSize: 10,
    color: colors.fg5,
    marginTop: 2,
  },
  mentionName: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '800',
    color: colors.foreground,
  },
  mentionRole: {
    fontSize: 10,
    color: colors.fg5,
    marginTop: 2,
  },
  // E2EE Lock / Unlock styles
  unlockContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  unlockCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    ...shadows.md,
  },
  lockIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgTint04,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unlockTitle: {
    fontSize: 18,
    fontFamily: 'Courier',
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  unlockSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.fg5,
    textAlign: 'center',
    marginBottom: 20,
  },
  unlockInput: {
    width: '100%',
    height: 48,
    backgroundColor: colors.bgTint02,
    borderWidth: 1,
    borderColor: colors.border12,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 12,
  },
  unlockBtn: {
    width: '100%',
    height: 48,
    backgroundColor: colors.foreground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  unlockBtnText: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  unlockErr: {
    color: colors.destructive,
    fontSize: 11,
    fontFamily: 'Courier',
    marginBottom: 8,
  },
  lockHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.bgTint02,
    marginTop: 4,
  },
  lockHeaderBtnText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: 1,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
    width: '100%',
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border06,
  },
  dateHeaderPill: {
    borderWidth: 1,
    borderColor: colors.border12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    ...shadows.sm,
  },
  dateHeaderText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    color: colors.fg5,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
