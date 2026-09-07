import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { journeyText, type AppLanguage, type SyncState } from '@niubi/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlatformGlassView } from './ui/PlatformGlassView';

export default function CreationGuide(props: { lang: AppLanguage; authenticated: boolean; hasPractice: boolean; state: SyncState; limited: boolean; onStart: () => void; onLogin: () => void; onPublish: () => void; onShare: () => void }) {
  const [open, setOpen] = useState(true);
  const insets = useSafeAreaInsets();
  const t = (key: Parameters<typeof journeyText>[0]) => journeyText(key, props.lang);
  return <View style={[styles.container, { top: insets.top + 64 }]} pointerEvents="box-none">
    {open ? <View style={styles.card}>
      <View style={styles.row}><Text style={styles.tag}>YOUR WORLD, YOUR CANVAS</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('close')} style={styles.close} onPress={() => setOpen(false)}><Feather name="x" size={18} color="#39275c" /></TouchableOpacity></View>
      <Text style={styles.title}>{t('title')}</Text>
      <Text style={styles.body}>{t('intro')}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('start')} style={styles.start} onPress={() => { props.onStart(); setOpen(false); }}><Feather name="edit-2" size={16} color="white" /><Text style={styles.startText}>{t('start')}</Text></TouchableOpacity>
    </View> : <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('explore')} onPress={() => setOpen(true)}><PlatformGlassView style={styles.pill}><Feather name="compass" size={16} color="#45277a" /><Text style={styles.link}>{t('explore')}</Text></PlatformGlassView></TouchableOpacity>}
    <PlatformGlassView style={styles.status}>
      {!props.authenticated ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('preview')} onPress={props.onLogin}><Text style={styles.body}>{t('preview')}</Text></TouchableOpacity> : <>
        <Text accessibilityLiveRegion="polite" style={styles.body}>{t(props.state === 'connected' ? 'saved' : props.state === 'connecting' ? 'saving' : props.state === 'error' ? 'error' : 'pending')}</Text>
        {props.hasPractice && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('publish')} style={styles.action} onPress={props.onPublish}><Text style={styles.link}>{t('publish')}</Text></TouchableOpacity>}
      </>}
      {props.limited && <Text style={styles.body}>{t('dense')}</Text>}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('share')} style={styles.action} onPress={props.onShare}><Feather name="share-2" size={14} color="#45277a" /><Text style={styles.link}>{t('share')}</Text></TouchableOpacity>
    </PlatformGlassView>
  </View>;
}
const styles = StyleSheet.create({
  container: { position: 'absolute', left: 12, width: 285, maxWidth: '85%', zIndex: 20 },
  card: { backgroundColor: '#fffbeb', borderRadius: 24, borderWidth: 1, borderColor: '#ffffff', padding: 16, shadowColor: '#39275c', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { color: '#78350f', fontSize: 10, fontWeight: '700' },
  close: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#241b32', fontSize: 21, lineHeight: 27, fontWeight: '700', marginTop: 4 },
  body: { color: '#534b5e', fontSize: 12, lineHeight: 18, marginTop: 4 },
  start: { backgroundColor: '#7c3aed', borderRadius: 24, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  startText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pill: { borderRadius: 24, paddingHorizontal: 16, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden' },
  status: { marginTop: 8, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, overflow: 'hidden' },
  action: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
  link: { fontSize: 12, fontWeight: '600', color: '#45277a' },
});
