import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVENUECAT_IOS_KEY = 'appl_lYJGcqPZIuYaWevlqKbxRCghHuY';
const THEME = '#7C3AED';
const THEME_LIGHT = '#F3EEFF';
const ENTITLEMENT_ID = 'pro';
const STORAGE_KEY = 'contentai_pro_status';

export default function PaywallScreen() {
  const [subscribed, setSubStatus] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [packages, setPackages] = React.useState([]);

  React.useEffect(() => {
    initAndCheck();
  }, []);

  const initAndCheck = async () => {
    try {
      const Purchases = require('react-native-purchases').default;
      await Purchases.configure({ apiKey: REVENUECAT_IOS_KEY });

      // Check subscription status from RevenueCat (receipt-verified)
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
          await AsyncStorage.setItem(STORAGE_KEY, 'pro');
          setSubStatus(true);
          setChecking(false);
          return;
        }
      } catch (e) {
        console.log('CustomerInfo check failed:', e);
      }

      // Also check local cache
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached === 'pro') {
        setSubStatus(true);
      }

      // Load offerings for dynamic pricing
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.log('Offerings error:', e);
      }
    } catch (e) {
      console.log('RevenueCat init error:', e);
    }
    setChecking(false);
  };

  const formatPrice = (pkg) => {
    if (!pkg || !pkg.product) return '';
    const product = pkg.product;
    if (product.priceString) return product.priceString;
    return `$${(product.price || 0).toFixed(2)}`;
  };

  const getPricePeriod = (pkg) => {
    if (!pkg) return '';
    switch (pkg.packageType) {
      case 'MONTHLY': return '/month';
      case 'ANNUAL': return '/year';
      default: return '';
    }
  };

  const handlePurchase = async (pkg) => {
    if (!pkg) {
      Alert.alert('Not available', 'Subscription products are being configured. Please try again shortly.');
      return;
    }
    setLoading(true);
    try {
      const Purchases = require('react-native-purchases').default;
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (customerInfo.entitlements.active[ENTITLEMENT_ID]) {
        await AsyncStorage.setItem(STORAGE_KEY, 'pro');
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

  const handleRestore = async () => {
    setLoading(true);
    try {
      const Purchases = require('react-native-purchases').default;
      const info = await Purchases.restorePurchases();
      if (info.entitlements.active[ENTITLEMENT_ID]) {
        await AsyncStorage.setItem(STORAGE_KEY, 'pro');
        setSubStatus(true);
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('Nothing to restore', 'No active subscription found.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingView}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Find packages from RevenueCat offerings
  const monthlyPkg = packages.find(p => p.packageType === 'MONTHLY') || packages.find(p => p.identifier === '$rc_monthly');
  const annualPkg = packages.find(p => p.packageType === 'ANNUAL') || packages.find(p => p.identifier === '$rc_annual');

  const plans = [];
  if (annualPkg) {
    plans.push({
      name: 'Pro Yearly',
      price: formatPrice(annualPkg),
      period: getPricePeriod(annualPkg),
      features: [
        'Everything in Pro Monthly',
        'Save vs monthly billing',
        'Priority AI processing',
        'Early access features',
        'Premium support',
      ],
      pkg: annualPkg,
      popular: true,
      badge: 'Best Value',
    });
  }
  if (monthlyPkg) {
    plans.push({
      name: 'Pro Monthly',
      price: formatPrice(monthlyPkg),
      period: getPricePeriod(monthlyPkg),
      features: [
        'Unlimited content generation',
        'All platforms supported',
        'Ad copy & email campaigns',
        'Blog articles & SEO',
        'Brand voice customization',
        'Content history & drafts',
      ],
      pkg: monthlyPkg,
      popular: false,
    });
  }

  // Fallback if no packages loaded yet
  if (plans.length === 0) {
    plans.push(
      {
        name: 'Pro Yearly',
        price: '',
        period: '/year',
        features: ['Everything in Pro Monthly', 'Save vs monthly billing', 'Priority AI processing', 'Early access features', 'Premium support'],
        pkg: null,
        popular: true,
        badge: 'Best Value',
      },
      {
        name: 'Pro Monthly',
        price: '',
        period: '/month',
        features: ['Unlimited content generation', 'All platforms supported', 'Ad copy & email campaigns', 'Blog articles & SEO', 'Brand voice customization', 'Content history & drafts'],
        pkg: null,
        popular: false,
      }
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
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
              onPress={() => handlePurchase(plan.pkg)}
              disabled={loading}
            >
              <Text style={[styles.subscribeBtnText, plan.popular ? {} : { color: THEME }]}>
                {loading ? 'Loading...' : 'Upgrade to Pro'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.legalText}>
          Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. Manage or cancel subscriptions in your Apple ID Account Settings at any time.
        </Text>

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
          <Text style={styles.restoreBtnText}>Restore Purchases</Text>
        </TouchableOpacity>

        <View style={styles.trustRow}>
          <Ionicons name="lock-closed" size={14} color="#999" />
          <Text style={styles.trustText}>Cancel anytime - Secure payment</Text>
        </View>

        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => Linking.openURL('https://base44.app/api/apps/6a336a00b083ccbe02ccfade/files/mp/public/6a336a00b083ccbe02ccfade/0f2e386a1_privacy_policy_contentai.html')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://base44.app/api/apps/6a336a00b083ccbe02ccfade/files/mp/public/6a336a00b083ccbe02ccfade/d1e2fd38d_eula_contentai_pro.html')}>
            <Text style={styles.linkText}>Terms of Use</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingView: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#999' },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
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
  linksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  linkText: { color: '#7C3AED', fontSize: 13, fontWeight: '500' },
  linkDivider: { color: '#ccc', fontSize: 13 },
  subscribedView: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: THEME, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  subscribedTitle: { fontSize: 24, fontWeight: '800', color: '#1C1C1E' },
  subscribedSub: { fontSize: 16, color: '#999', marginTop: 8, textAlign: 'center' },
  manageBtn: { marginTop: 24, backgroundColor: THEME_LIGHT, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 100 },
  manageBtnText: { color: THEME, fontWeight: '600', fontSize: 15 },
});
