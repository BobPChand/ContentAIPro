import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import GenerateScreen from './src/screens/GenerateScreen';
import BrandScreen from './src/screens/BrandScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import PaywallScreen from './src/screens/PaywallScreen';

const Tab = createBottomTabNavigator();

const THEME_COLOR = '#7C3AED';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Generate') iconName = focused ? 'sparkles' : 'sparkles-outline';
              else if (route.name === 'Brand') iconName = focused ? 'business' : 'business-outline';
              else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
              else if (route.name === 'Upgrade') iconName = focused ? 'rocket' : 'rocket-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: THEME_COLOR,
            tabBarInactiveTintColor: '#999',
            tabBarStyle: { paddingBottom: 5, height: 60 },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Generate" component={GenerateScreen} />
          <Tab.Screen name="Brand" component={BrandScreen} />
          <Tab.Screen name="History" component={HistoryScreen} />
          <Tab.Screen name="Upgrade" component={PaywallScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
