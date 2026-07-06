import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from 'react-native-vector-icons';
import { saveBrandProfile, getBrandProfile } from '../services/ApiService';

const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';

const TONE_OPTIONS = ['Professional', 'Casual', 'Friendly', 'Humorous', 'Luxury', 'Urgent', 'Inspirational'];

export default function BrandScreen() {
  const [profile, setProfile] = React.useState({
    name: '',
    industry: '',
    description: '',
    target_audience: '',
    brand_voice: '',
    tone: 'Professional',
    colors: '',
    website: '',
    tagline: '',
  });
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const existing = await getBrandProfile();
    if (existing) setProfile(existing);
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Brand name required', 'Enter at least your brand name to save.');
      return;
    }
    await saveBrandProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (key, value) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Brand Profile</Text>
          <Text style={styles.subtitle}>Set your brand voice once — applied to every generation</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Brand Name *</Text>
          <TextInput style={styles.input} placeholder="e.g., ContentAI Pro" value={profile.name} onChangeText={(v) => update('name', v)} />

          <Text style={styles.label}>Industry</Text>
          <TextInput style={styles.input} placeholder="e.g., SaaS, E-commerce, Fitness" value={profile.industry} onChangeText={(v) => update('industry', v)} />

          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, { minHeight: 80 }]} multiline placeholder="What does your business do?" value={profile.description} onChangeText={(v) => update('description', v)} textAlignVertical="top" />

          <Text style={styles.label}>Target Audience</Text>
          <TextInput style={styles.input} placeholder="e.g., Small business owners, 25-45" value={profile.target_audience} onChangeText={(v) => update('target_audience', v)} />

          <Text style={styles.label}>Brand Voice</Text>
          <TextInput style={styles.input} placeholder="e.g., Approachable, expert, witty" value={profile.brand_voice} onChangeText={(v) => update('brand_voice', v)} />

          <Text style={styles.label}>Default Tone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {TONE_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.toneChip, profile.tone === t && styles.toneChipActive]}
                onPress={() => update('tone', t)}
              >
                <Text style={[styles.toneChipText, profile.tone === t && styles.toneChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Brand Colors</Text>
          <TextInput style={styles.input} placeholder="e.g., Purple #7C3AED, White" value={profile.colors} onChangeText={(v) => update('colors', v)} />

          <Text style={styles.label}>Website</Text>
          <TextInput style={styles.input} placeholder="https://yourwebsite.com" value={profile.website} onChangeText={(v) => update('website', v)} keyboardType="url" autoCapitalize="none" />

          <Text style={styles.label}>Tagline</Text>
          <TextInput style={styles.input} placeholder="Your brand's tagline" value={profile.tagline} onChangeText={(v) => update('tagline', v)} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color="white" />
            <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Brand Profile'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  card: { marginHorizontal: 20, backgroundColor: 'white', borderRadius: 16, padding: 20, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  toneChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, backgroundColor: '#F0F0F0', marginRight: 8 },
  toneChipActive: { backgroundColor: THEME },
  toneChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  toneChipTextActive: { color: 'white' },
  saveBtn: { marginTop: 24, backgroundColor: THEME, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8 },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
