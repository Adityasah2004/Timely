import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { colors, radius, shadows } from '../../lib/tokens';
import { useStore } from '../../lib/store';
import { Icon } from '../../components/Icon';
import { ScreenHeader, Card, Tag, Divider, IconBtn } from '../../components/Primitives';
import { supabase } from '../../lib/supabase';
import type { StartupDoc, DocAttachment } from '../../lib/types';

const DEFAULT_TAGS = ['spec', 'pitch', 'metrics', 'feedback', 'ideas', 'retro'];

// ─── Interactive Audio Player Card (expo-audio SDK 56) ────────
function AudioPlayerCard({ uri, name }: { uri: string; name: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const handlePlayPause = async () => {
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '0:00';
    const totalSecs = Math.floor(seconds);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = status.duration ? status.currentTime / status.duration : 0;

  return (
    <View style={dc.audioCard}>
      <TouchableOpacity onPress={handlePlayPause} style={dc.audioPlayBtn}>
        <Icon name={status.playing ? 'pause' : 'play'} size={12} color="#fff" />
      </TouchableOpacity>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={dc.audioName} numberOfLines={1}>{name}</Text>
        <View style={dc.audioProgressRow}>
          <View style={dc.audioTrack}>
            <View style={[dc.audioProgress, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={dc.audioTime}>
            {formatTime(status.currentTime)} / {formatTime(status.duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Docs Screen ─────────────────────────────────────────
export function DocsScreen() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<StartupDoc | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docTags, setDocTags] = useState<string[]>([]);
  const [docAttachments, setDocAttachments] = useState<DocAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Custom Tag State inside Editor
  const [newTagText, setNewTagText] = useState('');

  // Voice Memo Recorder Hooks (expo-audio SDK 56)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 1000);

  // Dynamic tags list compiling all default tags and custom ones currently in database
  const allTags = Array.from(
    new Set([
      ...DEFAULT_TAGS,
      ...state.docs.flatMap(d => d.tags || []),
    ])
  );

  // Filtered documents
  const filteredDocs = state.docs.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag ? doc.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const openEditor = (doc?: StartupDoc) => {
    if (doc) {
      setEditingDoc(doc);
      setDocTitle(doc.title);
      setDocContent(doc.content);
      setDocTags(doc.tags);
      setDocAttachments(doc.attachments || []);
    } else {
      setEditingDoc(null);
      setDocTitle('');
      setDocContent('');
      setDocTags(['spec']);
      setDocAttachments([]);
    }
    setNewTagText('');
    setEditorOpen(true);
  };

  const toggleTagSelection = (tag: string) => {
    if (docTags.includes(tag)) {
      setDocTags(docTags.filter(t => t !== tag));
    } else {
      setDocTags([...docTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = newTagText
      .trim()
      .toLowerCase()
      .replace(/#/g, '')
      .replace(/\s+/g, '-');
    if (!clean) return;

    if (!docTags.includes(clean)) {
      setDocTags([...docTags, clean]);
    }
    setNewTagText('');
  };

  // Pick general file attachments
  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setUploadingFile(true);

      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const fileExt = asset.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${state.householdId}/${fileName}`;

        // Attempt Supabase storage upload
        const { data, error } = await supabase.storage
          .from('doc-attachments')
          .upload(filePath, blob, {
            contentType: asset.mimeType || 'application/octet-stream',
          });

        let fileUri = '';
        if (error) {
          console.warn('Supabase storage upload failed, using local URI fallback:', error);
          fileUri = asset.uri;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('doc-attachments')
            .getPublicUrl(filePath);
          fileUri = publicUrl;
        }

        const newAttachment: DocAttachment = {
          name: asset.name,
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/octet-stream',
          uri: fileUri,
        };

        setDocAttachments([...docAttachments, newAttachment]);
      } catch (err) {
        console.warn('File upload failed, using local URI:', err);
        const newAttachment: DocAttachment = {
          name: asset.name,
          size: asset.size || 0,
          mimeType: asset.mimeType || 'application/octet-stream',
          uri: asset.uri,
        };
        setDocAttachments([...docAttachments, newAttachment]);
      } finally {
        setUploadingFile(false);
      }
    } catch (err) {
      console.warn('Document picker error:', err);
    }
  };

  // Start Audio Recording for Voice Memo (expo-audio SDK 56)
  const handleStartRecording = async () => {
    try {
      const { status } = await getRecordingPermissionsAsync();
      let granted = status === 'granted';

      if (!granted) {
        const req = await requestRecordingPermissionsAsync();
        granted = req.granted;
      }

      if (!granted) {
        Alert.alert('Microphone Access Required', 'Please enable microphone access in settings to record voice memos.');
        return;
      }

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.warn('Audio recording start failed:', err);
    }
  };

  // Stop Audio Recording and upload voice memo
  const handleStopRecording = async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (uri) {
        setUploadingFile(true);
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          const fileName = `${Date.now()}-voice-memo.m4a`;
          const filePath = `${state.householdId}/${fileName}`;

          // Upload to Supabase Storage
          const { data, error } = await supabase.storage
            .from('doc-attachments')
            .upload(filePath, blob, {
              contentType: 'audio/m4a',
            });

          let fileUri = '';
          if (error) {
            console.warn('Voice memo upload failed, fallback to local URI:', error);
            fileUri = uri;
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('doc-attachments')
              .getPublicUrl(filePath);
            fileUri = publicUrl;
          }

          const newAttachment: DocAttachment = {
            name: `Voice Memo (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`,
            size: blob.size || 0,
            mimeType: 'audio/m4a',
            uri: fileUri,
          };

          setDocAttachments([...docAttachments, newAttachment]);
        } catch (err) {
          console.warn('Voice memo upload failed, local fallback:', err);
          const newAttachment: DocAttachment = {
            name: `Voice Memo (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`,
            size: 0,
            mimeType: 'audio/m4a',
            uri,
          };
          setDocAttachments([...docAttachments, newAttachment]);
        } finally {
          setUploadingFile(false);
        }
      }
    } catch (err) {
      console.warn('Audio recording stop failed:', err);
    }
  };

  const handleOpenAttachment = async (uri: string) => {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) {
        await Linking.openURL(uri);
      } else {
        Alert.alert('Attachment Preview', `Streaming link:\n${uri}`);
      }
    } catch (err) {
      console.warn('Open link failed:', err);
      Alert.alert('Attachment Preview', `Streaming link:\n${uri}`);
    }
  };

  const handleSave = async () => {
    if (!docTitle.trim() || !docContent.trim()) {
      Alert.alert('Incomplete Spec', 'Please provide a title and content for your startup document.');
      return;
    }

    if (!state.householdId || !state.userId) return;

    setSaving(true);
    try {
      if (editingDoc) {
        // Update existing document
        const { error } = await supabase
          .from('docs')
          .update({
            title: docTitle.trim(),
            content: docContent.trim(),
            tags: docTags,
            attachments: docAttachments,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingDoc.id);

        if (error) throw error;
      } else {
        // Create new document
        const { error } = await supabase.from('docs').insert({
          household_id: state.householdId,
          title: docTitle.trim(),
          content: docContent.trim(),
          tags: docTags,
          attachments: docAttachments,
          created_by: state.userId,
        });

        if (error) throw error;
      }
      setEditorOpen(false);
    } catch (err) {
      console.warn('Docs save error:', err);
      Alert.alert('Save Failed', 'Could not sync document to Supabase. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId: string) => {
    Alert.alert('Delete Document', 'Are you sure you want to permanently delete this startup spec?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('docs').delete().eq('id', docId);
            if (error) throw error;
            setEditorOpen(false);
          } catch (err) {
            console.warn('Delete error:', err);
          }
        },
      },
    ]);
  };

  const formatDuration = (millis: number) => {
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const remainingSecs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={dc.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 130 }}
      >
        <ScreenHeader
          eyebrow={`WIKI · ${filteredDocs.length} DOC${filteredDocs.length === 1 ? '' : 'S'}`}
          title="Specs"
          ghost="and drafts in one place."
          sub="PRDs, pitch outlines, sprint goals, and research wiki."
          right={
            <IconBtn inv onPress={() => openEditor()}>
              <Icon name="plus" size={18} color="#fff" />
            </IconBtn>
          }
        />

        {/* Search Input */}
        <View style={dc.searchContainer}>
          <Icon name="search" size={16} color={colors.fg6} />
          <TextInput
            style={dc.searchInput}
            placeholder="Search specs, ideas or metrics..."
            placeholderTextColor={colors.fg6}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Tag Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 14 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          <TouchableOpacity
            style={[dc.filterChip, !selectedTag && dc.filterChipActive]}
            onPress={() => setSelectedTag(null)}
          >
            <Text style={[dc.filterChipText, !selectedTag && dc.filterChipTextActive]}>ALL</Text>
          </TouchableOpacity>
          {allTags.map(tag => {
            const active = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[dc.filterChip, active && dc.filterChipActive]}
                onPress={() => setSelectedTag(active ? null : tag)}
              >
                <Text style={[dc.filterChipText, active && dc.filterChipTextActive]}>
                  #{tag.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredDocs.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 80 }}>
            <Icon name="note" size={40} color={colors.fg8} />
            <Text style={dc.emptyText}>No documents found. Define your next big feature.</Text>
          </View>
        ) : (
          filteredDocs.map(doc => {
            const dateStr = new Date(doc.updatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const attCount = doc.attachments?.length || 0;

            return (
              <TouchableOpacity key={doc.id} style={dc.docCard} onPress={() => openEditor(doc)}>
                <Card tight>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={dc.docTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={dc.docDate}>{dateStr}</Text>
                  </View>
                  <Text style={dc.docExcerpt} numberOfLines={3}>
                    {doc.content}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' }}>
                    {doc.tags.map(t => (
                      <Tag key={t} ghost>
                        <Text style={dc.docTagText}>#{t}</Text>
                      </Tag>
                    ))}
                    {attCount > 0 && (
                      <View style={dc.cardAttBadge}>
                        <Icon name="note" size={10} color={colors.fg4} />
                        <Text style={dc.cardAttBadgeText}>{attCount} file{attCount > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Full Page Spec Editor Modal */}
      <Modal animationType="slide" visible={editorOpen} onRequestClose={() => setEditorOpen(false)}>
        <View style={[dc.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={dc.modalHeader}>
            <IconBtn onPress={() => setEditorOpen(false)}>
              <Icon name="x" size={16} />
            </IconBtn>
            <Text style={dc.modalTitle}>{editingDoc ? 'Edit Spec' : 'New Spec'}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {editingDoc && (
                <IconBtn onPress={() => handleDelete(editingDoc.id)}>
                  <Icon name="reset" size={14} color={colors.destructive} />
                </IconBtn>
              )}
              <TouchableOpacity style={dc.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={dc.saveBtnText}>SAVE</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 18 }}>
            <Text style={dc.inputLabel}>Title</Text>
            <TextInput
              style={dc.titleInput}
              placeholder="e.g. PRD: Stripe Subscriptions"
              value={docTitle}
              onChangeText={setDocTitle}
            />

            <Text style={dc.inputLabel}>Tags (Tap to toggle)</Text>
            
            {/* Custom Tag Input */}
            <View style={dc.customTagInputRow}>
              <TextInput
                style={dc.customTagInput}
                placeholder="Add custom tag (e.g. stripe, marketing-v2)..."
                placeholderTextColor={colors.fg6}
                value={newTagText}
                onChangeText={setNewTagText}
                onSubmitEditing={handleAddCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity style={dc.customTagAddBtn} onPress={handleAddCustomTag}>
                <Icon name="plus" size={14} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {/* List of active/selected tags & popular ones */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {Array.from(new Set([...docTags, ...allTags])).map(tag => {
                const selected = docTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[dc.editorTagChip, selected && dc.editorTagChipActive]}
                    onPress={() => toggleTagSelection(tag)}
                  >
                    <Text style={[dc.editorTagText, selected && dc.editorTagTextActive]}>
                      #{tag.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Divider />

            {/* Attachments Section */}
            <Text style={dc.inputLabel}>Attachments ({docAttachments.length})</Text>
            <View style={dc.attSection}>
              {docAttachments.map((att, idx) => {
                const isAudio = att.mimeType.startsWith('audio/') || att.name.includes('Voice Memo');

                if (isAudio) {
                  return (
                    <View key={idx} style={{ position: 'relative' }}>
                      <AudioPlayerCard uri={att.uri} name={att.name} />
                      <TouchableOpacity
                        style={dc.audioRemoveBtn}
                        onPress={() => setDocAttachments(docAttachments.filter((_, i) => i !== idx))}
                      >
                        <Icon name="x" size={10} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View key={idx} style={dc.attRow}>
                    <Icon name="note" size={13} color={colors.foreground} />
                    <Text style={dc.attName} numberOfLines={1}>
                      {att.name}
                    </Text>
                    <Text style={dc.attSize}>
                      ({att.size > 1024 * 1024 ? `${(att.size / (1024 * 1024)).toFixed(1)} MB` : `${(att.size / 1024).toFixed(0)} KB`})
                    </Text>

                    {/* Open Button */}
                    <TouchableOpacity style={dc.attActionBtn} onPress={() => handleOpenAttachment(att.uri)}>
                      <Icon name="arrow" size={11} color={colors.fg2} />
                    </TouchableOpacity>

                    {/* Remove Button */}
                    <TouchableOpacity
                      style={dc.attActionBtn}
                      onPress={() => setDocAttachments(docAttachments.filter((_, i) => i !== idx))}
                    >
                      <Icon name="x" size={11} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {recorderState.isRecording ? (
                <View style={dc.recordingHud}>
                  <View style={dc.recRow}>
                    <View style={dc.recIndicatorPulse} />
                    <Text style={dc.recText}>RECORDING MEMO · {formatDuration(recorderState.durationMillis)}</Text>
                  </View>
                  <TouchableOpacity style={dc.recStopBtn} onPress={handleStopRecording}>
                    <Icon name="reset" size={12} color="#fff" />
                    <Text style={dc.recStopBtnText}>STOP & SAVE</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[dc.attAddBtn, { flex: 1 }]} onPress={handlePickAttachment} disabled={uploadingFile}>
                    {uploadingFile ? (
                      <ActivityIndicator size="small" color={colors.foreground} />
                    ) : (
                      <>
                        <Icon name="plus" size={12} color={colors.foreground} />
                        <Text style={dc.attAddBtnText}>ATTACH FILE</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={[dc.attAddBtn, { flex: 1 }]} onPress={handleStartRecording} disabled={uploadingFile}>
                    <Icon name="bolt" size={12} color={colors.foreground} />
                    <Text style={dc.attAddBtnText}>🎙️ RECORD MEMO</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Divider />

            <Text style={dc.inputLabel}>Content / Specification Draft</Text>
            <TextInput
              style={dc.contentInput}
              placeholder="Draft your pitch deck outline, metrics target, features lists or meeting takeaways here..."
              placeholderTextColor={colors.fg6}
              multiline
              textAlignVertical="top"
              value={docContent}
              onChangeText={setDocContent}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const dc = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.foreground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  newBtnText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTint02,
    borderWidth: 1,
    borderColor: colors.border10,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    marginLeft: 8,
  },
  tagScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.bgTint04,
    borderWidth: 1,
    borderColor: colors.border08,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  filterChipText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '700',
    color: colors.foreground,
  },
  filterChipTextActive: {
    color: '#fff',
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
  docCard: {
    marginVertical: 6,
  },
  docTitle: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.foreground,
    flex: 1,
  },
  docDate: {
    fontFamily: 'Courier',
    fontSize: 9,
    color: colors.fg6,
  },
  docExcerpt: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '300',
    color: colors.fg3,
    marginTop: 6,
  },
  docTagText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '700',
    color: colors.fg5,
  },
  cardAttBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgTint02,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  cardAttBadgeText: {
    fontFamily: 'Courier',
    fontSize: 8,
    fontWeight: '600',
    color: colors.fg5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border06,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgTint04,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: colors.foreground,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220,38,38,0.06)',
    marginRight: 6,
  },
  saveBtn: {
    backgroundColor: colors.foreground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  saveBtnText: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  inputLabel: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.fg6,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border12,
    paddingBottom: 6,
    marginBottom: 16,
  },
  // Custom Tag Input styling
  customTagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  customTagInput: {
    flex: 1,
    height: 36,
    backgroundColor: colors.bgTint02,
    borderWidth: 1,
    borderColor: colors.border10,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.foreground,
  },
  customTagAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.bgTint04,
    borderWidth: 1,
    borderColor: colors.border08,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorTagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.bgTint04,
    borderWidth: 1,
    borderColor: colors.border08,
  },
  editorTagChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  editorTagText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '700',
    color: colors.foreground,
  },
  editorTagTextActive: {
    color: '#fff',
  },
  attSection: {
    marginBottom: 16,
    gap: 6,
  },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgTint02,
    borderWidth: 1,
    borderColor: colors.border06,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  attName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.foreground,
    flex: 1,
  },
  attSize: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: colors.fg6,
  },
  attActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  attAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border20,
    borderRadius: 10,
    height: 40,
    backgroundColor: colors.bgTint02,
  },
  attAddBtnText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    color: colors.foreground,
  },
  // Voice Memo / Audio player styling
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.foreground,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    ...shadows.sm,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  audioProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  audioProgress: {
    height: '100%',
    backgroundColor: '#fff',
  },
  audioTime: {
    fontFamily: 'Courier',
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
  },
  audioRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: colors.border12,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    zIndex: 10,
  },
  // Recording HUD styling
  recordingHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.destructive,
    borderRadius: 10,
    padding: 10,
    height: 46,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recIndicatorPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  recText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  recStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 28,
    gap: 4,
  },
  recStopBtnText: {
    fontFamily: 'Courier',
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
  contentInput: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.foreground,
    minHeight: 300,
    paddingBottom: 40,
  },
});
