import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from 'react-native-vector-icons';
import * as Clipboard from 'expo-clipboard';
import { canGenerate, getRemainingFreeGenerations, isSubscribed, getSavedContent } from '../services/ApiService';

const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';

export default function HomeScreen({ navigation }) {
  const [remaining, setRemaining] = React.useState(0);
  const [subscribed, setSubscribed] = React.useState(false);
  const [recentContent, setRecentContent] = React.useState([]);

  React.useEffect(() => {
    loadDashboard();
  }, []);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadDashboard);
    return unsubscribe;
  }, [navigation]);

  const loadDashboard = async () => {
    const rem = await getRemainingFreeGenerations();
    const sub = await isSubscribed();
    const saved = await getSavedContent();
    setRemaining(rem);
    setSubscribed(sub);
    setRecentContent(saved.slice(0, 3));
  };

  const quickActions = [
    { icon: 'logo-instagram', label: 'Instagram Post', color: '#E1306C', type: 'social_post', platform: 'instagram' },
    { icon: 'logo-facebook', label: 'Facebook Post', color: '#1877F2', type: 'social_post', platform: 'facebook' },
    { icon: 'logo-linkedin', label: 'LinkedIn Post', color: '#0A66C2', type: 'social_post', platform: 'linkedin' },
    { icon: 'mail', label: 'Email Campaign', color: '#EA4335', type: 'email_campaign', platform: 'email' },
    { icon: 'document-text', label: 'Blog Article', color: '#34C759', type: 'blog_article', platform: 'blog' },
    { icon: 'megaphone', label: 'Ad Copy', color: '#FF9500', type: 'ad_copy', platform: 'google_ads' },
  ];

  const handleQuickAction = (action) => {
    navigation.navigate('Generate', {
      presetType: action.type,
      presetPlatform: action.platform,
    });
  };

  const copyToClipboard = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Content copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.title}>ContentAI Pro</Text>
        </View>

        {/* Subscription Status Card */}
        <View style={[styles.card, styles.statusCard]}>
          <View style={styles.statusHeader}>
            <Ionicons name={subscribed ? 'checkmark-circle' : 'time'} size={24} color={subscribed ? '#34C759' : THEME} />
            <Text style={styles.statusText}>
              {subscribed ? 'Pro Member' : 'Free Plan'}
            </Text>
          </View>
          <Text style={styles.statusSub}>
            {subscribed
              ? 'Unlimited content generation active'
              : `${remaining === Infinity ? '∞' : remaining} free generations remaining`}
          </Text>
          {!subscribed && (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Upgrade')}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Pro →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Generate</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickCard}
              onPress={() => handleQuickAction(action)}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '20' }]}>
                <Ionicons name={action.icon} size={28} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Content */}
        {recentContent.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Content</Text>
            {recentContent.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentCard}
                onPress={() => copyToClipboard(item.content)}
              >
                <View style={styles.recentHeader}>
                  <Text style={styles.recentType}>{item.contentType}</Text>
                  <Text style={styles.recentDate}>{new Date(item.savedAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.recentContent} numberOfLines={3}>{item.content}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Floating Generate Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Generate')}
      >
        <Ionicons name="sparkles" size={24} color="white" />
        <Text style={styles.fabText}>Generate</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  greeting: { fontSize: 14, color: '#999' },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
  card: { marginHorizontal: 20, marginVertical: 8, backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  statusCard: { backgroundColor: THEME_LIGHT },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  statusSub: { fontSize: 14, color: '#666', marginTop: 6 },
  upgradeBtn: { marginTop: 12, backgroundColor: THEME, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 100, alignSelf: 'flex-start' },
  upgradeBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  quickCard: { width: '33%', padding: 8, alignItems: 'center' },
  quickIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#333', marginTop: 8, textAlign: 'center' },
  recentCard: { marginHorizontal: 20, marginBottom: 10, backgroundColor: 'white', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  recentType: { fontSize: 12, fontWeight: '600', color: THEME, textTransform: 'capitalize' },
  recentDate: { fontSize: 12, color: '#999' },
  recentContent: { fontSize: 14, color: '#555', lineHeight: 20 },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: THEME, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 100, shadowColor: THEME, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  fabText: { color: 'white', fontWeight: '700', fontSize: 16, marginLeft: 8 },
});
