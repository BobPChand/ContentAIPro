import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { generateContent, generateVoice, canGenerate, incrementGenerationsUsed, isSubscribed, getBrandProfile, saveContent, saveAudioRecord, hasAIConsent, setAIConsent } from '../services/ApiService';
import VideoCreator from '../components/VideoCreator';

const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';

const CONTENT_TYPES = [
  { label: 'Social Post', value: 'social_post', icon: 'chatbubble' },
  { label: 'Ad Copy', value: 'ad_copy', icon: 'megaphone' },
  { label: 'Blog Article', value: 'blog_article', icon: 'document-text' },
  { label: 'Email Campaign', value: 'email_campaign', icon: 'mail' },
  { label: 'Caption', value: 'caption', icon: 'text' },
  { label: 'Video Script', value: 'video_script', icon: 'videocam' },
  { label: 'Voice Over', value: 'voice_over', icon: 'mic' },
];

const PLATFORMS = [
  { label: 'Instagram', value: 'instagram', icon: 'logo-instagram' },
  { label: 'Facebook', value: 'facebook', icon: 'logo-facebook' },
  { label: 'LinkedIn', value: 'linkedin', icon: 'logo-linkedin' },
  { label: 'X/Twitter', value: 'twitter', icon: 'logo-twitter' },
  { label: 'TikTok', value: 'tiktok', icon: 'logo-tiktok' },
  { label: 'YouTube', value: 'youtube', icon: 'logo-youtube' },
  { label: 'Reels', value: 'reels', icon: 'film' },
  { label: 'Google Ads', value: 'google_ads', icon: 'megaphone' },
  { label: 'Facebook Ads', value: 'facebook_ads', icon: 'logo-facebook' },
  { label: 'Email', value: 'email', icon: 'mail' },
  { label: 'Blog', value: 'blog', icon: 'document-text' },
  { label: 'Podcast', value: 'podcast', icon: 'podium' },
];

const TONES = [
  { label: 'Professional', value: 'professional' },
  { label: 'Casual', value: 'casual' },
  { label: 'Friendly', value: 'friendly' },
  { label: 'Humorous', value: 'humorous' },
  { label: 'Luxury', value: 'luxury' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'Inspirational', value: 'inspirational' },
];

const VOICES = [
  { label: 'Nova', value: 'nova', desc: 'Female, warm' },
  { label: 'Alloy', value: 'alloy', desc: 'Neutral' },
  { label: 'Echo', value: 'echo', desc: 'Male, calm' },
  { label: 'Fable', value: 'fable', desc: 'British, neutral' },
  { label: 'Onyx', value: 'onyx', desc: 'Male, deep' },
  { label: 'Shimmer', value: 'shimmer', desc: 'Female, bright' },
];

export default function GenerateScreen({ route, navigation }) {
  const [prompt, setPrompt] = React.useState('');
  const [contentType, setContentType] = React.useState(route.params?.presetType || 'social_post');
  const [platform, setPlatform] = React.useState(route.params?.presetPlatform || 'instagram');
  const [tone, setTone] = React.useState('friendly');
  const [variations, setVariations] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showConsent, setShowConsent] = React.useState(false);
  const [showVoicePicker, setShowVoicePicker] = React.useState(null);
  const [voiceLoading, setVoiceLoading] = React.useState(null);
  const [audioState, setAudioState] = React.useState({});
  const [sound, setSound] = React.useState(null);
  const [playingId, setPlayingId] = React.useState(null);
  const [showVideoCreator, setShowVideoCreator] = React.useState(null);

  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Enter a prompt', 'Describe what content you want to generate.');
      return;
    }

    const consented = await hasAIConsent();
    if (!consented) {
      setShowConsent(true);
      return;
    }

    await proceedWithGeneration();
  };

  const proceedWithGeneration = async () => {
    const allowed = await canGenerate();
    if (!allowed) {
      Alert.alert(
        'Free limit reached',
        'You\'ve used all 3 free generations. Upgrade to Pro for unlimited content.',
        [
          { text: 'Upgrade', onPress: () => navigation.navigate('Upgrade') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setLoading(true);
    setError('');
    setVariations([]);
    setAudioState({});

    const brand = await getBrandProfile();

    const result = await generateContent({
      prompt,
      content_type: contentType,
      platform,
      tone,
      brand_name: brand?.name,
      brand_industry: brand?.industry,
      brand_description: brand?.description,
      target_audience: brand?.target_audience,
      brand_voice: brand?.brand_voice,
      count: 2,
    });

    setLoading(false);

    if (result.success && result.data?.variations) {
      setVariations(result.data.variations);
      await incrementGenerationsUsed();
      await saveContent({
        content: result.data.variations[0].content,
        contentType,
        platform,
        tone,
        prompt,
        hashtags: result.data.variations[0].hashtags || [],
      });
    } else {
      setError(result.error || 'Failed to generate content. Try again.');
    }
  };

  const handleConsentAccept = async () => {
    await setAIConsent(true);
    setShowConsent(false);
    await proceedWithGeneration();
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
    Alert.alert('Consent required', 'You must consent to AI data processing to use content generation.');
  };

  const copyContent = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Content copied to clipboard.');
  };

  const handleGenerateVoice = async (variationId, text, voice) => {
    setShowVoicePicker(null);
    setVoiceLoading(variationId);

    try {
      const cleanText = text.replace(/#[\w]+/g, '').replace(/\n{3,}/g, '\n\n').trim();

      const result = await generateVoice(cleanText, voice);

      if (result.success && result.data?.audio) {
        const fileName = `voice_${Date.now()}.mp3`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, result.data.audio, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setAudioState(prev => ({
          ...prev,
          [variationId]: { 
            fileUri, 
            voice: result.data.voice, 
            duration: result.data.duration_estimate,
            audioBase64: result.data.audio,
            cleanText: cleanText
          }
        }));

        await saveAudioRecord({
          text: cleanText.slice(0, 100),
          voice: result.data.voice,
          fileUri,
          contentType,
        });

        await playAudio(variationId, fileUri);
      } else {
        Alert.alert('Voice generation failed', result.error || 'Please try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to generate voice.');
    } finally {
      setVoiceLoading(null);
    }
  };

  const playAudio = async (variationId, fileUri) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingId(variationId);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (err) {
      Alert.alert('Playback error', err.message);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setPlayingId(null);
    }
  };

  const shareAudio = async (fileUri) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'audio/mp3',
          dialogTitle: 'Share Voice Over',
        });
      } else {
        Alert.alert('Sharing not available', 'Cannot share audio on this device.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Split content into video scenes
  const getScenesFromContent = (content) => {
    // Split by [Scene markers or by double newlines
    let scenes = [];
    
    // Try to split by [Scene: ...] markers
    if (content.includes('[Scene') || content.includes('[scene')) {
      const parts = content.split(/\[Scene[^\]]*\]/i).filter(s => s.trim());
      // Also extract voiceover text
      for (const part of parts) {
        const voMatch = part.match(/\[Voiceover\]?:?\s*"([^"]+)"/i) || part.match(/\[Voiceover\]?:?\s*(.+?)(?:\n|$)/i);
        if (voMatch) {
          scenes.push(voMatch[1].trim());
        } else {
          // Use the text without on-screen markers
          const cleaned = part
            .replace(/\[On-Screen[^]]*\]/gi, '')
            .replace(/\[Voiceover[^\]]*\]/gi, '')
            .replace(/\[End Screen[^\]]*\]/gi, '')
            .replace(/[🎬📸🎥🎬]/g, '')
            .trim();
          if (cleaned) scenes.push(cleaned);
        }
      }
    }
    
    // Fallback: split by paragraphs
    if (scenes.length < 2) {
      scenes = content
        .replace(/#[\w]+/g, '')
        .replace(/\[Scene[^\]]*\]/gi, '')
        .replace(/\[On-Screen[^\]]*\]/gi, '')
        .replace(/\[Voiceover\]?:?/gi, '')
        .replace(/\[End Screen[^\]]*\]/gi, '')
        .split(/\n\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 5)
        .slice(0, 8);
    }
    
    // If still too few, split by sentences
    if (scenes.length < 2) {
      scenes = content
        .replace(/#[\w]+/g, '')
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5)
        .slice(0, 8);
    }
    
    // Limit each scene to ~150 chars for display
    scenes = scenes.map(s => {
      if (s.length > 150) {
        return s.slice(0, 147) + '...';
      }
      return s;
    });
    
    return scenes.slice(0, 8); // Max 8 scenes
  };

  const handleCreateVideo = (variationId, variation) => {
    const audio = audioState[variationId];
    if (!audio || !audio.audioBase64) {
      Alert.alert('Generate voice first', 'Please generate a voice over before creating a video.');
      return;
    }

    const scenes = getScenesFromContent(variation.content);
    if (scenes.length < 1) {
      Alert.alert('No content', 'Cannot extract scenes from the content.');
      return;
    }

    setShowVideoCreator({
      scenes,
      audioBase64: audio.audioBase64,
      brandName: '', // Could fetch from brand profile
    });
  };

  const isVideoOrVoice = contentType === 'video_script' || contentType === 'voice_over';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Generate Content</Text>
            <Text style={styles.subtitle}>Text, scripts, voice & video — AI does it all</Text>
          </View>

          {/* Content Type Selector */}
          <Text style={styles.label}>Content Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {CONTENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.chip, contentType === type.value && styles.chipActive]}
                onPress={() => setContentType(type.value)}
              >
                <Ionicons name={type.icon} size={16} color={contentType === type.value ? 'white' : THEME} />
                <Text style={[styles.chipText, contentType === type.value && styles.chipTextActive]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Platform Selector */}
          <Text style={styles.label}>Platform</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, platform === p.value && styles.chipActive]}
                onPress={() => setPlatform(p.value)}
              >
                <Ionicons name={p.icon} size={16} color={platform === p.value ? 'white' : THEME} />
                <Text style={[styles.chipText, platform === p.value && styles.chipTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tone Selector */}
          <Text style={styles.label}>Tone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {TONES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.chipTone, tone === t.value && styles.chipToneActive]}
                onPress={() => setTone(t.value)}
              >
                <Text style={[styles.chipToneText, tone === t.value && styles.chipToneTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Prompt Input */}
          <Text style={styles.label}>
            {isVideoOrVoice
              ? 'Describe your video or voice project'
              : 'What do you want to create?'}
          </Text>
          <TextInput
            style={styles.promptInput}
            multiline
            numberOfLines={4}
            placeholder={
              contentType === 'video_script'
                ? 'e.g., 30-second TikTok about our new skincare line, focus on natural ingredients'
                : contentType === 'voice_over'
                ? 'e.g., Professional narration for a product demo video, friendly tone'
                : 'e.g., Promote our summer sale with 30% off all products. Focus on urgency and FOMO.'
            }
            value={prompt}
            onChangeText={setPrompt}
            textAlignVertical="top"
          />

          {/* Generate Button */}
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name={isVideoOrVoice ? 'videocam' : 'sparkles'} size={20} color="white" />
                <Text style={styles.generateBtnText}>
                  {isVideoOrVoice ? 'Generate Script' : 'Generate Content'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Results */}
          {variations.map((variation, index) => {
            const vId = `v${index}`;
            const hasAudio = audioState[vId];
            const isPlaying = playingId === vId;
            const isVoiceLoadingThis = voiceLoading === vId;

            return (
              <View key={index} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultBadge}>Variation {index + 1}</Text>
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={styles.voiceBtn}
                      onPress={() => setShowVoicePicker(vId)}
                      disabled={isVoiceLoadingThis}
                    >
                      {isVoiceLoadingThis ? (
                        <ActivityIndicator size={16} color={THEME} />
                      ) : (
                        <>
                          <Ionicons name="mic" size={16} color={THEME} />
                          <Text style={styles.voiceBtnText}>Voice</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => copyContent(variation.content)} style={styles.copyBtn}>
                      <Ionicons name="copy-outline" size={16} color="#555" />
                      <Text style={styles.copyText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.resultContent}>{variation.content}</Text>

                {variation.hashtags && variation.hashtags.length > 0 && (
                  <View style={styles.hashtagsRow}>
                    {variation.hashtags.map((tag, i) => (
                      <Text key={i} style={styles.hashtag}>#{tag}</Text>
                    ))}
                  </View>
                )}

                <Text style={styles.wordCount}>{variation.word_count} words</Text>

                {/* Audio Player */}
                {hasAudio && (
                  <View style={styles.audioPlayer}>
                    <TouchableOpacity
                      style={styles.playBtn}
                      onPress={isPlaying ? stopAudio : () => playAudio(vId, hasAudio.fileUri)}
                    >
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="white" />
                    </TouchableOpacity>
                    <View style={styles.audioInfo}>
                      <Text style={styles.audioVoiceText}>Voice: {hasAudio.voice}</Text>
                      <Text style={styles.audioDurationText}>~{hasAudio.duration}s</Text>
                    </View>
                    <TouchableOpacity style={styles.shareBtn} onPress={() => shareAudio(hasAudio.fileUri)}>
                      <Ionicons name="share-outline" size={18} color={THEME} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Create Video Button - shows after voice is generated */}
                {hasAudio && (
                  <TouchableOpacity
                    style={styles.createVideoBtn}
                    onPress={() => handleCreateVideo(vId, variation)}
                  >
                    <Ionicons name="videocam" size={18} color="white" />
                    <Text style={styles.createVideoBtnText}>Create Video</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Consent Modal */}
      <Modal visible={showConsent} transparent animationType="fade" onRequestClose={handleConsentDecline}>
        <View style={styles.consentOverlay}>
          <View style={styles.consentCard}>
            <View style={styles.consentIcon}>
              <Ionicons name="shield-checkmark" size={40} color={THEME} />
            </View>
            <Text style={styles.consentTitle}>AI Data Processing Consent</Text>
            <Text style={styles.consentBody}>
              ContentAI Pro uses AI to generate content. Your prompts and brand information will be sent to our AI provider (OpenAI) for processing.{"\n\n"}Your data is never stored by the AI provider and is only used to generate your content.
            </Text>
            <View style={styles.consentButtons}>
              <TouchableOpacity style={styles.consentDeclineBtn} onPress={handleConsentDecline}>
                <Text style={styles.consentDeclineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.consentAcceptBtn} onPress={handleConsentAccept}>
                <Text style={styles.consentAcceptText}>I Consent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Voice Picker Modal */}
      <Modal visible={showVoicePicker !== null} transparent animationType="fade" onRequestClose={() => setShowVoicePicker(null)}>
        <View style={styles.consentOverlay}>
          <View style={styles.voicePickerCard}>
            <Text style={styles.voicePickerTitle}>Choose a Voice</Text>
            <Text style={styles.voicePickerSubtitle}>AI will read the content aloud</Text>
            {VOICES.map((v) => (
              <TouchableOpacity
                key={v.value}
                style={styles.voiceOption}
                onPress={() => {
                  const variation = variations[parseInt(showVoicePicker.replace('v', ''))];
                  if (variation) handleGenerateVoice(showVoicePicker, variation.content, v.value);
                }}
              >
                <View style={styles.voiceOptionLeft}>
                  <Ionicons name="mic-outline" size={20} color={THEME} />
                  <View>
                    <Text style={styles.voiceOptionName}>{v.label}</Text>
                    <Text style={styles.voiceOptionDesc}>{v.desc}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.voicePickerCancel} onPress={() => setShowVoicePicker(null)}>
              <Text style={styles.voicePickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video Creator Modal */}
      {showVideoCreator && (
        <VideoCreator
          visible={true}
          onClose={() => setShowVideoCreator(null)}
          scenes={showVideoCreator.scenes}
          audioBase64={showVideoCreator.audioBase64}
          brandName={showVideoCreator.brandName}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 8, paddingHorizontal: 20 },
  chipScroll: { paddingLeft: 20, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, backgroundColor: THEME_LIGHT, marginRight: 8, gap: 6 },
  chipActive: { backgroundColor: THEME },
  chipText: { fontSize: 13, fontWeight: '600', color: THEME },
  chipTextActive: { color: 'white' },
  chipTone: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 100, backgroundColor: '#F0F0F0', marginRight: 8 },
  chipToneActive: { backgroundColor: '#333' },
  chipToneText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipToneTextActive: { color: 'white' },
  promptInput: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'white', borderRadius: 16, padding: 16, fontSize: 15, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E5E5EA' },
  generateBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: THEME, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 8 },
  generateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  errorBox: { marginHorizontal: 20, marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3F3', padding: 16, borderRadius: 12 },
  errorText: { color: '#FF3B30', fontSize: 14, flex: 1 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultBadge: { fontSize: 12, fontWeight: '700', color: THEME, backgroundColor: THEME_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  resultActions: { flexDirection: 'row', gap: 8 },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: THEME_LIGHT, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  voiceBtnText: { fontSize: 12, fontWeight: '600', color: THEME },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  copyText: { fontSize: 12, fontWeight: '600', color: '#555' },
  resultContent: { fontSize: 15, color: '#1C1C1E', lineHeight: 22 },
  hashtagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  hashtag: { fontSize: 13, color: THEME, fontWeight: '600' },
  wordCount: { fontSize: 12, color: '#999', marginTop: 12 },
  audioPlayer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: THEME_LIGHT, borderRadius: 12, padding: 12, gap: 12 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center' },
  audioInfo: { flex: 1 },
  audioVoiceText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  audioDurationText: { fontSize: 12, color: '#999', marginTop: 2 },
  shareBtn: { padding: 8 },
  createVideoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, backgroundColor: '#1C1C1E', paddingVertical: 14, borderRadius: 12 },
  createVideoBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  consentOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  consentCard: { backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center' },
  consentIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: THEME_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  consentTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 12, textAlign: 'center' },
  consentBody: { fontSize: 14, color: '#555', lineHeight: 20, textAlign: 'center', marginBottom: 24 },
  consentButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  consentDeclineBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center' },
  consentDeclineText: { fontSize: 15, fontWeight: '600', color: '#555' },
  consentAcceptBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: THEME, alignItems: 'center' },
  consentAcceptText: { fontSize: 15, fontWeight: '700', color: 'white' },
  voicePickerCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360 },
  voicePickerTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  voicePickerSubtitle: { fontSize: 14, color: '#999', marginBottom: 20 },
  voiceOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  voiceOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  voiceOptionName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  voiceOptionDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  voicePickerCancel: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  voicePickerCancelText: { fontSize: 15, fontWeight: '600', color: '#999' },
});
