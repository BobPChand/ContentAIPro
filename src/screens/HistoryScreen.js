import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getSavedContent, deleteSavedContent } from '../services/ApiService';

const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';

export default function HistoryScreen() {
  const [content, setContent] = React.useState([]);

  const loadContent = async () => {
    const saved = await getSavedContent();
    setContent(saved);
  };

  React.useEffect(() => {
    loadContent();
  }, []);

  const handleCopy = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Content copied to clipboard.');
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete content?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSavedContent(id);
            loadContent();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.contentType}</Text></View>
          <View style={[styles.badge, styles.badgePlatform]}><Text style={styles.badgeText}>{item.platform}</Text></View>
        </View>
        <Text style={styles.date}>{new Date(item.savedAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.prompt} numberOfLines={1}>📝 {item.prompt}</Text>
      <Text style={styles.content} numberOfLines={4}>{item.content}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleCopy(item.content)}>
          <Ionicons name="copy-outline" size={18} color={THEME} />
          <Text style={styles.actionText}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Content History</Text>
        <Text style={styles.subtitle}>{content.length} saved {content.length === 1 ? 'item' : 'items'}</Text>
      </View>

      {content.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="file-tray-outline" size={64} color="#DDD" />
          <Text style={styles.emptyText}>No content yet</Text>
          <Text style={styles.emptySub}>Generated content will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={content}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadContent}
          refreshing={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { backgroundColor: THEME_LIGHT, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  badgePlatform: { backgroundColor: '#F0F0F0' },
  badgeText: { fontSize: 11, fontWeight: '600', color: THEME, textTransform: 'capitalize' },
  date: { fontSize: 12, color: '#999' },
  prompt: { fontSize: 13, color: '#777', marginBottom: 8, fontStyle: 'italic' },
  content: { fontSize: 14, color: '#333', lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: THEME_LIGHT },
  deleteBtn: { backgroundColor: '#FFEAEA' },
  actionText: { fontSize: 13, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#CCC', marginTop: 4 },
});
