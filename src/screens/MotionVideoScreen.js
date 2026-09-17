import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Motion Video Creator — turn app screenshots into an App Store-ready
// preview video (15-30s, Ken Burns motion, transitions, optional script
// burned in as caption cards). Renders server-side; nothing is stored.
const RENDER_API = 'https://motion-render.vercel.app/api/render';
const THEME = '#7C3AED';
const MAX_SCREENSHOTS = 10;
const MIN_SCREENSHOTS = 2;

const PLATFORMS = [
  { id: '1242x2688', label: 'iPhone 6.7"', hint: 'App Store standard' },
  { id: '1284x2778', label: 'iPhone 6.5"', hint: 'Older App Store preset' },
  { id: '2048x2732', label: 'iPad Pro 12.9"', hint: 'iPad App Store preset' },
];

const TRANSITIONS = [
  { id: 'fade', label: 'Fade', icon: 'contrast-outline' },
  { id: 'slide', label: 'Slide', icon: 'arrow-forward-outline' },
  { id: 'zoom', label: 'Zoom', icon: 'expand-outline' },
];

const estimateTotal = (n, clip) => n * clip - (n - 1) * 1;

export default function MotionVideoScreen() {
  const [shots, setShots] = useState([]); // [{uri, width, height}]
  const [appName, setAppName] = useState('App Preview');
  const [platform, setPlatform] = useState(PLATFORMS[0].id);
  const [transition, setTransition] = useState('slide');
  const [clip, setClip] = useState(8);
  const [script, setScript] = useState('');
  const [autoNote, setAutoNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null); // {fileUri, duration}
  const timerRef = useRef(null);

  const n = shots.length;
  const estTotal = n >= MIN_SCREENSHOTS ? estimateTotal(n, clip) : 0;

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Keep the estimated duration inside Apple's 15-30s App Preview rule.
  const adjustClipFor = (count, baseClip) => {
    let c = baseClip;
    let guard = 0;
    while (estimateTotal(count, c) < 16 && c < 10 && guard++ < 40) c = Math.round((c + 0.5) * 2) / 2;
    while (estimateTotal(count, c) > 30 && c > 2 && guard++ < 40) c = Math.round((c - 0.5) * 2) / 2;
    return c;
  };

  const pickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Needed', 'Please allow photo library access to pick screenshots.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: MAX_SCREENSHOTS,
        quality: 0.9,
      });
      if (res.canceled) return;
      const picked = res.assets || [];
      const merged = [...shots, ...picked].slice(0, MAX_SCREENSHOTS);
      setShots(merged);
      setResult(null);
      if (merged.length >= MIN_SCREENSHOTS) {
        const adj = adjustClipFor(merged.length, clip);
        if (adj !== clip) {
          setClip(adj);
          setAutoNote(`Clip duration adjusted to ${adj}s to stay within Apple's 15–30s App Preview limit.`);
        } else {
          setAutoNote('');
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open the photo library.');
    }
  };

  const removeShot = (idx) => {
    const next = shots.filter((_, i) => i !== idx);
    setShots(next);
    setResult(null);
    if (next.length >= MIN_SCREENSHOTS) {
      const adj = adjustClipFor(next.length, clip);
      if (adj !== clip) {
        setClip(adj);
        setAutoNote(`Clip duration adjusted to ${adj}s to stay within Apple's 15–30s App Preview limit.`);
      }
    }
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result || '');
        const idx = s.indexOf(',');
        resolve(idx >= 0 ? s.slice(idx + 1) : s);
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });

  const handleGenerate = () => {
    if (n < MIN_SCREENSHOTS) {
      Alert.alert('Add Screenshots', `Select at least ${MIN_SCREENSHOTS} screenshots (up to ${MAX_SCREENSHOTS}).`);
      return;
    }
    if (estTotal < 15 || estTotal > 30) {
      Alert.alert('Duration Out of Range', `Estimated video is ${estTotal}s. Apple requires 15–30 seconds. Adjust screenshots or clip duration.`);
      return;
    }
    // Explicit consent for sending data to the rendering service (Apple 5.1.1/5.1.2).
    Alert.alert(
      'Consent to Process Data',
      'Your screenshots and script will be sent securely to our rendering service to create your video. They are used only to render this video and are not stored. Do you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Allow & Continue', onPress: startRender },
      ]
    );
  };

  const startRender = async () => {
    setGenerating(true);
    setResult(null);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    try {
      // Downscale screenshots client-side to keep the upload payload small.
      const b64s = [];
      for (const s of shots) {
        const manip = await ImageManipulator.manipulateAsync(
          s.uri,
          [{ resize: { width: 900 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const b64 = await FileSystem.readAsStringAsync(manip.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        b64s.push(b64);
      }

      const [w, h] = platform.split('x').map(Number);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 150000);

      const resp = await fetch(RENDER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_name: (appName || 'App Preview').slice(0, 60),
          width: w,
          height: h,
          clip_duration: clip,
          transition_style: transition,
          script: script.trim().slice(0, 1200),
          screenshots_b64: b64s,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        let msg = `Rendering failed (HTTP ${resp.status}). Please try again.`;
        try {
          const err = await resp.json();
          if (err && err.error) msg = err.error;
        } catch (_) {}
        throw new Error(msg);
      }

      const blob = await resp.blob();
      const videoB64 = await blobToBase64(blob);
      const fileUri = `${FileSystem.cacheDirectory}motion_preview_${Date.now()}.mov`;
      await FileSystem.writeAsStringAsync(fileUri, videoB64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setResult({ fileUri, duration: estTotal });
    } catch (e) {
      const msg = e.name === 'AbortError'
        ? 'Rendering timed out. Please check your connection and try again.'
        : e.message || 'Something went wrong. Please try again.';
      Alert.alert('Render Error', msg);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setGenerating(false);
    }
  };

  const shareVideo = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not Available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(result.fileUri, {
        mimeType: 'video/quicktime',
        dialogTitle: 'Your App Preview Video',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not open the share sheet.');
    }
  };

  const renderDisabled = generating || n < MIN_SCREENSHOTS;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Motion Video Creator</Text>
        <Text style={styles.subtitle}>
          Turn your app screenshots into an App Store-ready preview video with smooth motion — an optional
          script is shown as on-screen captions.
        </Text>

        {/* Screenshots */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Screenshots ({n}/{MAX_SCREENSHOTS})</Text>
          <TouchableOpacity style={styles.pickArea} onPress={pickImages} disabled={generating}>
            <Ionicons name="images-outline" size={34} color={THEME} />
            <Text style={styles.pickText}>
              {n === 0 ? 'Tap to select 2–10 screenshots' : 'Tap to add more'}
            </Text>
          </TouchableOpacity>
          {n > 0 && (
            <View style={styles.thumbRow}>
              {shots.map((s, i) => (
                <TouchableOpacity key={i} style={styles.thumbWrap} onPress={() => removeShot(i)}>
                  <Text style={styles.thumbNum}>{i + 1}</Text>
                  <View style={styles.thumb}>
                    <Text style={styles.thumbX}>✕</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {n > 0 && <Text style={styles.hint}>Tap a thumbnail to remove it.</Text>}
        </View>

        {/* App name */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App name</Text>
          <TextInput
            style={styles.input}
            value={appName}
            onChangeText={setAppName}
            placeholder="App Preview"
            placeholderTextColor="#A0A0B0"
            maxLength={60}
          />
        </View>

        {/* Platform */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Platform</Text>
          <View style={styles.chipRow}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, platform === p.id && styles.chipActive]}
                onPress={() => setPlatform(p.id)}
              >
                <Text style={[styles.chipText, platform === p.id && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>{PLATFORMS.find((p) => p.id === platform)?.hint}</Text>
        </View>

        {/* Transition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Motion style</Text>
          <View style={styles.chipRow}>
            {TRANSITIONS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, transition === t.id && styles.chipActive]}
                onPress={() => setTransition(t.id)}
              >
                <Ionicons name={t.icon} size={16} color={transition === t.id ? '#fff' : THEME} />
                <Text style={[styles.chipText, transition === t.id && styles.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Clip duration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clip duration: {clip}s</Text>
          <View style={styles.chipRow}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, clip === c && styles.chipActive]}
                onPress={() => { setClip(c); setAutoNote(''); }}
              >
                <Text style={[styles.chipText, clip === c && styles.chipTextActive]}>{c}s</Text>
              </TouchableOpacity>
            ))}
          </View>
          {n >= MIN_SCREENSHOTS && (
            <Text style={styles.estText}>Estimated video: {estTotal}s (Apple requires 15–30s)</Text>
          )}
          {autoNote !== '' && <Text style={styles.autoNote}>{autoNote}</Text>}
        </View>

        {/* Script */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Script (optional)</Text>
          <TextInput
            style={[styles.input, styles.scriptInput]}
            value={script}
            onChangeText={setScript}
            placeholder={'What your video should say, e.g.\n"Meet ContentAI Pro. Generate content in seconds."'}
            placeholderTextColor="#A0A0B0"
            multiline
            maxLength={1200}
          />
          <Text style={styles.hint}>
            Your script is split across the clips and shown as on-screen captions ({script.length}/1200 chars).
          </Text>
        </View>

        {/* Generate */}
        <TouchableOpacity
          style={[styles.generateBtn, renderDisabled && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={renderDisabled}
        >
          {generating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="videocam" size={20} color="#fff" />
          )}
          <Text style={styles.generateText}>
            {generating ? `Rendering… ${elapsed}s` : 'Create Motion Video'}
          </Text>
        </TouchableOpacity>
        {generating && <Text style={styles.hintCenter}>This usually takes 30–60 seconds. Keep the app open.</Text>}

        {/* Result */}
        {result && (
          <View style={styles.card}>
            <Ionicons name="checkmark-circle" size={30} color="#34C759" />
            <Text style={styles.resultTitle}>Your {result.duration}s preview video is ready!</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareVideo}>
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.shareText}>Save / Share Video</Text>
            </TouchableOpacity>
            <Text style={styles.hintCenter}>
              Save to Photos or Files, then upload it as your App Preview in App Store Connect.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F7FC' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666680', marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  pickArea: {
    borderWidth: 2, borderColor: '#E4E0F5', borderStyle: 'dashed', borderRadius: 12,
    padding: 24, alignItems: 'center', justifyContent: 'center',
  },
  pickText: { marginTop: 8, color: '#8888A5', fontSize: 14 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  thumbWrap: { marginRight: 8, marginBottom: 8, alignItems: 'center' },
  thumbNum: { fontSize: 11, color: '#8888A5', marginBottom: 2 },
  thumb: {
    width: 44, height: 76, borderRadius: 8, backgroundColor: '#EFEBFA',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbX: { color: THEME, fontWeight: '700' },
  input: {
    backgroundColor: '#F4F2FB', borderRadius: 10, padding: 12, fontSize: 15, color: '#1A1A2E',
  },
  scriptInput: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F4F2FB', marginRight: 8, marginBottom: 8,
  },
  chipActive: { backgroundColor: THEME },
  chipText: { color: THEME, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  hint: { fontSize: 12, color: '#8888A5', marginTop: 8 },
  hintCenter: { fontSize: 12, color: '#8888A5', marginTop: 8, textAlign: 'center' },
  estText: { fontSize: 13, color: '#44445C', marginTop: 6, fontWeight: '600' },
  autoNote: { fontSize: 12, color: THEME, marginTop: 4 },
  generateBtn: {
    backgroundColor: THEME, borderRadius: 14, paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  generateBtnDisabled: { backgroundColor: '#C9C3E3' },
  generateText: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 6 },
  shareBtn: {
    backgroundColor: THEME, borderRadius: 12, paddingVertical: 12, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  shareText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});
