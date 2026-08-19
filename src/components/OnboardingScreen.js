import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'onboarding_completed';
const PERSONA_KEY = 'user_persona';

export const APP_CONFIGS = {
  InvoiceAI: {
    appName: 'Invoice AI',
    welcomeTitle: 'Welcome to Invoice AI',
    welcomeSubtitle: 'Create, send & track professional invoices in seconds',
    icon: 'document-text',
    keyFeatures: ['Instant Invoice Generation', 'Automatic Tax Calculations', 'Track Payment Status'],
    personaQuestion: 'What best describes your business?',
    personaOptions: ['Freelancer / Contractor', 'Small Business Owner', 'Agency / Consultant', 'Other'],
    useCaseQuestion: 'How often do you invoice clients?',
    useCaseOptions: ['Daily / Weekly', 'A few times a month', 'Occasionally', 'Just getting started'],
    demoContent: 'Generated Invoice #1001 for $1,250.00',
    premiumFeatures: ['Unlimited Invoices & Estimates', 'Custom Logo & Branding', 'Multi-currency support', 'Export to PDF & Share'],
  },
  ProposalAI: {
    appName: 'Proposal AI',
    welcomeTitle: 'Welcome to Proposal AI',
    welcomeSubtitle: 'Generate winning proposals & pitch decks in minutes',
    icon: 'briefcase',
    keyFeatures: ['AI-Powered Proposal Writing', 'Interactive Pitch Decks', 'Custom Scope & Pricing'],
    personaQuestion: 'What type of proposals do you create?',
    personaOptions: ['Client Proposals & Bids', 'Sales & Pitch Decks', 'RFP Responses', 'Project Scopes'],
    useCaseQuestion: 'What is your primary goal?',
    useCaseOptions: ['Win more clients', 'Save time writing', 'Look more professional', 'Close deals faster'],
    demoContent: 'AI Proposal for Website Redesign - $5,000',
    premiumFeatures: ['Unlimited AI Proposals & Decks', 'Custom Branding & Templates', 'Pitch Deck Slides & Video', 'Export to PDF & Share'],
  },
  ContentAIPro: {
    appName: 'ContentAI Pro',
    welcomeTitle: 'Welcome to ContentAI Pro',
    welcomeSubtitle: 'Generate high-converting social media content in seconds',
    icon: 'sparkles',
    keyFeatures: ['AI Social Post Generator', 'AI Voice Over & Audio', 'Brand Voice Customization'],
    personaQuestion: 'Where do you post content most?',
    personaOptions: ['Instagram / TikTok', 'LinkedIn / Twitter', 'YouTube / Blog', 'All Platforms'],
    useCaseQuestion: 'What is your main content goal?',
    useCaseOptions: ['Grow audience', 'Drive sales', 'Save creation time', 'Maintain consistency'],
    demoContent: 'Generated 5 high-converting posts for Instagram & LinkedIn',
    premiumFeatures: ['Unlimited AI Generations', 'All Social Platforms & Formats', 'AI Voice Over Engine', 'Brand Voice Kit'],
  },
  AIResumeBuilder: {
    appName: 'AI Resume Builder',
    welcomeTitle: 'Welcome to AI Resume Builder',
    welcomeSubtitle: 'Build ATS-optimized resumes that land interviews',
    icon: 'file-tray-full',
    keyFeatures: ['ATS Compatibility Check', 'AI Bullet Point Generator', 'Tailored Cover Letters'],
    personaQuestion: 'What is your target career level?',
    personaOptions: ['Entry Level / Graduate', 'Mid-Level Professional', 'Senior / Executive', 'Career Changer'],
    useCaseQuestion: 'What is your biggest job search challenge?',
    useCaseOptions: ['Passing ATS screeners', 'Writing impact bullet points', 'Tailoring per job', 'Designing clean PDF'],
    demoContent: 'Resume ATS Score: 92/100 - Strong Match',
    premiumFeatures: ['Unlimited Resumes & Cover Letters', 'Real-time ATS Keyword Match', 'Premium Clean PDF Templates', 'Interview Practice'],
  },
  AIBookkeeperPro: {
    appName: 'AI Bookkeeper Pro',
    welcomeTitle: 'Welcome to AI Bookkeeper Pro',
    welcomeSubtitle: 'Scan receipts & track tax deductions automatically',
    icon: 'calculator',
    keyFeatures: ['AI Receipt Scanning', 'Automatic Expense Categorization', 'Tax Savings Discovery'],
    personaQuestion: 'What describes your bookkeeping setup?',
    personaOptions: ['Sole Proprietor', 'LLC / Small Business', 'Freelancer', 'Personal Expense Tracker'],
    useCaseQuestion: 'What is your biggest pain point?',
    useCaseOptions: ['Lost paper receipts', 'Tax season stress', 'Untracked deductions', 'Manual entry'],
    demoContent: 'Scanned receipt: $42.50 -> Categorized: Meals (Deductible)',
    premiumFeatures: ['Unlimited Receipt Scans', 'Automated Tax Deduction Finder', 'Profit & Loss Reports', 'Export CSV/PDF for Accountant'],
  },
};

function WelcomeStep({ step, onNext }) {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name={step.icon || 'star'} size={48} color="#7C3AED" />
      </View>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
      <View style={styles.featureList}>
        {step.features?.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.ctaBtn} onPress={onNext}>
        <Text style={styles.ctaBtnText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

function QuestionStep({ step, onAnswer }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>{step.question}</Text>
      <View style={styles.optionsList}>
        {step.options?.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.optionBtn} onPress={() => onAnswer(opt)}>
            <Text style={styles.optionText}>{opt}</Text>
            <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DemoStep({ step, onNext }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>{step.title}</Text>
      <View style={styles.demoCard}>
        <Ionicons name="sparkles" size={32} color="#7C3AED" />
        <Text style={styles.demoText}>{step.demo}</Text>
      </View>
      <TouchableOpacity style={styles.ctaBtn} onPress={onNext}>
        <Text style={styles.ctaBtnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

function PaywallPreviewStep({ step, onCTA }) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>{step.title}</Text>
      <View style={styles.featureList}>
        {step.features?.map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.ctaBtn} onPress={onCTA}>
        <Text style={styles.ctaBtnText}>Start Free Trial</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OnboardingScreen({ appConfig = APP_CONFIGS.InvoiceAI, onComplete }) {
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState({});
  const fadeAnim = useState(new Animated.Value(1))[0];

  const handleNext = (key, value) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setPersona(prev => ({ ...prev, [key]: value }));
      setStep(prev => prev + 1);
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    });
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(PERSONA_KEY, JSON.stringify(persona));
    onComplete?.(persona);
  };

  const steps = [
    { type: 'welcome', title: appConfig.welcomeTitle, subtitle: appConfig.welcomeSubtitle, icon: appConfig.icon, features: appConfig.keyFeatures },
    { type: 'question', question: appConfig.personaQuestion, options: appConfig.personaOptions, key: 'role' },
    { type: 'question', question: appConfig.useCaseQuestion, options: appConfig.useCaseOptions, key: 'useCase' },
    { type: 'demo', title: 'See it in action', demo: appConfig.demoContent },
    { type: 'paywall', title: 'Start your 7-day free trial', features: appConfig.premiumFeatures },
  ];

  const currentStep = steps[step];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>
      <TouchableOpacity style={styles.skipBtn} onPress={handleComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {currentStep.type === 'welcome' && <WelcomeStep step={currentStep} onNext={() => setStep(1)} />}
        {currentStep.type === 'question' && <QuestionStep step={currentStep} onAnswer={(val) => handleNext(currentStep.key, val)} />}
        {currentStep.type === 'demo' && <DemoStep step={currentStep} onNext={() => setStep(step + 1)} />}
        {currentStep.type === 'paywall' && <PaywallPreviewStep step={currentStep} onCTA={handleComplete} />}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  progressDotActive: { backgroundColor: '#7C3AED', width: 16 },
  skipBtn: { position: 'absolute', top: 16, right: 20, zIndex: 10 },
  skipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  stepContainer: { alignItems: 'center', width: '100%' },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F3EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  featureList: { width: '100%', marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12 },
  featureText: { fontSize: 16, color: '#374151', marginLeft: 12, fontWeight: '500' },
  optionsList: { width: '100%', marginTop: 16 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12 },
  optionText: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  demoCard: { backgroundColor: '#F3EEFF', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center', marginVertical: 32 },
  demoText: { fontSize: 16, fontWeight: '600', color: '#6D28D9', marginTop: 12, textAlign: 'center' },
  ctaBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 16, width: '100%', alignItems: 'center', marginTop: 16 },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
