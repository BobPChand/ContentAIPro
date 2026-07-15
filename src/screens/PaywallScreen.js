import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from 'react-native-vector-icons';
import { isSubscribed, setSubscribed } from '../services/ApiService';

// NOTE ON APPLE COMPLIANCE (Guideline 3.1.1):
// On iOS, subscriptions MUST go through Apple's native In-App Purchase (StoreKit),
// not an external payment link. This screen routes iOS purchases through RevenueCat.
// Web and Android continue to use Stripe Checkout directly.

const REVENUECAT_IOS_KEY = 'appl_mQirzUNOkoyePqxgcGTIMavyzzQ'; // TODO: Replace with your RevenueCat iOS public key

const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';

// RevenueCat package identifiers - must match App Store Connect & RevenueCat dashboard
const RC_MONTHLY_ID = '$rc_monthly';
const RC_ANNUAL_ID = '$rc_annual';
const RC_AGENCY_ID = 'agency';

export default function PaywallScreen() {
  const [subscribed, setSubStatus] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [packages, setPackages] = React.useState([]);

  React.useEffect(() => {
    checkStatus();
    if (Platform.OS === 'ios') {
      initRevenueCat();
    }
  }, []);

  const checkStatus = async () => {
    const sub = await isSubscribed();
    setSubStatus(sub);
  };

  const initRevenueCat = async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (e) {
      console.log('RevenueCat init error:', e);
    }
  };

  const handleRestore = async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      const info = await Purchases.restorePurchases();
      if (Object.keys(info.entitlements.active).length > 0) {
        await setSubscribed(true);
        setSubStatus(true);
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('Nothing to restore', 'No active subscription found.');
      }
    } catch(e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleSubscribeIOS = async (planId) => {
    setLoading(true);
    try {
      const Purchases = require('react-native-purchases').default;
      // Find matching package
      const pkg = packages.find(p =>
        (planId === 'monthly' && p.packageType === 'MONTHLY') ||
        (planId === 'yearly' && p.packageType === 'ANNUAL') ||
        (planId === 'agency' && p.identifier === RC_AGENCY_ID)
      ) || packages[0];

      if (!pkg) {
        Alert.alert('Not available', 'Subscription products are being configured. Please try again shortly.');
        setLoading(false);
        return;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active['pro']) {
        await setSubscribed(true);
        setSubStatus(true);
        Alert.alert('Welcome to ContentAI Pro!', 'Your subscription is now active.');
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase failed', e.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeWeb = async (planId) => {
    const links = {
      monthly: 'https://buy.stripe.com/5kQ9AT1kEcsjgxZ1Ag6Vq06',
      yearly: 'https://buy.stripe.com/7sY14ngfy3VN0z1diY6Vq09',
      agency: 'https://buy.stripe.com/14A4gz7J277Z4Phen26Vq0a',
    };
    Linking.openURL(links[planId]);
    Alert.alert(
      'Complete checkout',
      'Your browser will open to complete the Stripe checkout. Return to the app after subscribing.',
      [{
        text: "I've Subscribed",
        onPress: async () => {
          await setSubscribed(true);
          setSubStatus(true);
        },
      }]
    );
  };

  const handleSubscribe = (planId) => {
    if (Platform.OS === 'ios') {
      handleSubscribeIOS(planId);
    } else {
      handleSubscribeWeb(planId);
    }
  };

  const plans = [
    {
      name: 'Pro Monthly',
      price: 'CA$29.99',
      period: '/month',
      features: [
        'Unlimited content generation',
        'All platforms supported',
        'Ad copy & email campaigns',
        'Blog articles & SEO',
        'Brand voice customization',
        'Content history & drafts',
      ],
      plan: 'monthly',
      popular: false,
    },
    {
      name: 'Pro Yearly',
      price: 'CA$249.99',
      period: '/year',
      features: [
        'Everything in Pro Monthly',
        'Save 30% (2 months free)',
        'Priority AI processing',
        'Early access features',
        'Premium support',
      ],
      plan: 'yearly',
      popular: true,
      badge: 'Save 30%',
    },
    {
      name: 'Agency',
      price: 'CA$49.99',
      period: '/month',
      features: [
        'Everything in Pro',
        'Multiple brand profiles',
        'Bulk content generation',
        'Team collaboration',
        'White-label exports',
      ],
      plan: 'agency',
      popular: false,
    },
  ];

  if (subscribed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subscribedView}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={48} color="white" />
          </View>
          <Text style={styles.subscribedTitle}>You're a Pro Member!</Text>
          <Text style={styles.subscribedSub}>Enjoy unlimited AI content generation</Text>
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => Linking.openURL('https://billing.stripe.com/p/login/')}
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <View style={styles.heroBadge}>
            <Ionicons name="rocket" size={16} color="white" />
            <Text style={styles.heroBadgeText}>7-DAY FREE TRIAL</Text>
          </View>
          <Text style={styles.title}>Unlock Unlimited Content</Text>
          <Text style={styles.subtitle}>No more limits. Generate as much content as you need.</Text>
        </View>

        {plans.map((plan, index) => (
          <View key={index} style={[styles.planCard, plan.popular && styles.planCardPopular]}>
            {plan.badge && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>{plan.badge}</Text>
              </View>
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
            </View>
            <View style={styles.featuresList}>
              {plan.features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={THEME} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.subscribeBtn, plan.popular ? styles.subscribeBtnPrimary : styles.subscribeBtnSecondary]}
              onPress={() => handleSubscribe(plan.plan)}
              disabled={loading}
            >
              <Text style={[styles.subscribeBtnText, plan.popular ? {} : { color: THEME }]}>
                {loading ? 'Loading...' : 'Start Free Trial'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.legalText}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage or cancel subscriptions in your Apple ID Account Settings.
        </Text>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        </TouchableOpacity>

        <View style={styles.trustRow}>
          <Ionicons name="lock-closed" size={14} color="#999" />
          <Text style={styles.trustText}>Cancel anytime · Secure payment</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 100, marginBottom: 16 },
  heroBadgeText: { color: 'white', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#999', textAlign: 'center', marginTop: 8 },
  planCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, borderWidth: 2, borderColor: '#F0F0F0', position: 'relative' },
  planCardPopular: { borderColor: THEME },
  popularBadge: { position: 'absolute', top: -12, left: '50%', transform: [{ translateX: -50 }], backgroundColor: THEME, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 100 },
  popularBadgeText: { color: 'white', fontSize: 12, fontWeight: '700' },
  planName: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  planPrice: { fontSize: 40, fontWeight: '900', color: '#1C1C1E' },
  planPeriod: { fontSize: 16, color: '#999', marginLeft: 4 },
  featuresList: { marginTop: 16, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#555' },
  subscribeBtn: { marginTop: 20, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  subscribeBtnPrimary: { backgroundColor: THEME },
  subscribeBtnSecondary: { backgroundColor: THEME_LIGHT },
  subscribeBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  legalText: { fontSize: 11, color: '#999', textAlign: 'center', marginHorizontal: 24, marginTop: 20, lineHeight: 16 },
  restoreBtn: { marginTop: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  restoreBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 14 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  trustText: { fontSize: 13, color: '#999' },
  subscribedView: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  subscribedTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  subscribedSub: { fontSize: 16, color: '#999', marginTop: 8, textAlign: 'center' },
  manageBtn: { marginTop: 24, backgroundColor: THEME_LIGHT, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  manageBtnText: { color: THEME, fontWeight: '600', fontSize: 15 },
});