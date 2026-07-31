import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { generateContent, canGenerate, incrementGenerationsUsed, isSubscribed, getBrandProfile, saveContent, hasAIConsent, setAIConsent } from '../services/ApiService';

const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';

const CONTENT_TYPES = [
  { label: 'Social Post', value: 'social_post', icon: 'chatbubble' },
  { label: 'Ad Copy', value: 'ad_copy', icon: 'megaphone' },
  { label: 'Blog Article', value: 'blog_article', icon: 'document-text' },
  { label: 'Email Campaign', value: 'email_campaign', icon: 'mail' },
  { label: 'Caption', value: 'caption', icon: 'text' },
];

const PLATFORMS = [
  { label: 'Instagram', value: 'instagram', icon: 'logo-instagram' },
  { label: 'Facebook', value: 'facebook', icon: 'logo-facebook' },
  { label: 'LinkedIn', value: 'linkedin', icon: 'logo-linkedin' },
  { label: 'X/Twitter', value: 'twitter', icon: 'logo-twitter' },
  { label: 'Google Ads', value: 'google_ads', icon: 'megaphone' },
  { label: 'Facebook Ads', value: 'facebook_ads', icon: 'logo-facebook' },
  { label: 'Email', value: 'email', icon: 'mail' },
  { label: 'Blog', value: 'blog', icon: 'document-text' },
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

export default function GenerateScreen({ route, navigation }) {
  const [prompt, setPrompt] = React.useState('');
  const [contentType, setContentType] = React.useState(route.params?.presetType || 'social_post');
  const [platform, setPlatform] = React.useState(route.params?.presetPlatform || 'instagram');
  const [tone, setTone] = React.useState('friendly');
  const [variations, setVariations] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showConsent, setShowConsent] = React.useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Enter a prompt', 'Describe what content you want to generate.');
      return;
    }

    // Check AI consent first
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Generate Content</Text>
            <Text style={styles.subtitle}>Describe what you need - AI does the rest</Text>
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
          <Text style={styles.label}>What do you want to create?</Text>
          <TextInput
            style={styles.promptInput}
            multiline
            numberOfLines={4}
            placeholder="e.g., Promote our summer sale with 30% off all products. Focus on urgency and FOMO."
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
                <Ionicons name="sparkles" size={20} color="white" />
                <Text style={styles.generateBtnText}>Generate Content</Text>
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
          {variations.map((variation, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultBadge}>Variation {index + 1}</Text>
                <TouchableOpacity onPress={() => copyContent(variation.content)}>
                  <View style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={16} color={THEME} />
                    <Text style={styles.copyText}>Copy</Text>
                  </View>
                </TouchableOpacity>
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
            </View>
          ))}
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
              ContentAI Pro uses OpenAI to generate content. Your prompt text and brand profile information will be sent to OpenAI's servers for processing. This data is used solely to generate your requested content and is not stored permanently.
            </Text>
            <Text style={styles.consentBody}>
              By continuing, you consent to this data processing. You can withdraw consent at any time by contacting support.
            </Text>
            <View style={styles.consentLinks}>
              <Text style={styles.consentLink} onPress={() => Linking.openURL('https://aibusinessassistant.ai/contentai/privacy')}>Privacy Policy</Text>
              <Text style={styles.consentLink} onPress={() => Linking.openURL('https://aibusinessassistant.ai/contentai/terms')}>Terms of Use</Text>
            </View>
            <View style={styles.consentBtns}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 8, paddingHorizontal: 20 },
  chipScroll: { paddingLeft: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: THEME_LIGHT, marginRight: 8 },
  chipActive: { backgroundColor: THEME },
  chipText: { fontSize: 13, fontWeight: '600', color: THEME },
  chipTextActive: { color: 'white' },
  chipTone: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: '#F0F0F0', marginRight: 8 },
  chipToneActive: { backgroundColor: '#1C1C1E' },
  chipToneText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipToneTextActive: { color: 'white' },
  promptInput: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'white', borderRadius: 16, padding: 16, fontSize: 15, minHeight: 100, borderWidth: 1, borderColor: '#E5E5E5' },
  generateBtn: { marginHorizontal: 20, marginTop: 16, backgroundColor: THEME, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  errorBox: { marginHorizontal: 20, marginTop: 12, backgroundColor: '#FFF0F0', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { color: '#FF3B30', fontSize: 14, flex: 1 },
  resultCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: 'white', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F0F0F0' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultBadge: { fontSize: 12, fontWeight: '700', color: THEME, backgroundColor: THEME_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { color: THEME, fontSize: 13, fontWeight: '600' },
  resultContent: { fontSize: 14, color: '#333', lineHeight: 22 },
  hashtagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  hashtag: { fontSize: 13, color: THEME, backgroundColor: THEME_LIGHT, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  wordCount: { fontSize: 12, color: '#999', marginTop: 8 },
  consentOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  consentCard: { backgroundColor: 'white', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360 },
  consentIcon: { alignItems: 'center', marginBottom: 16 },
  consentTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', textAlign: 'center', marginBottom: 12 },
  consentBody: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 10 },
  consentLinks: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8, marginBottom: 20 },
  consentLink: { color: THEME, fontSize: 13, fontWeight: '600' },
  consentBtns: { flexDirection: 'row', gap: 12 },
  consentDeclineBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F0F0F0', alignItems: 'center' },
  consentDeclineText: { color: '#666', fontWeight: '600', fontSize: 15 },
  consentAcceptBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: THEME, alignItems: 'center' },
  consentAcceptText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
