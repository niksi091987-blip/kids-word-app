import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ProgressProvider } from './src/context/ProgressContext';
import { GameProvider } from './src/context/GameContext';
import { UserProvider } from './src/context/UserContext';

import HomeScreen from './src/screens/HomeScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';
import GameScreen from './src/screens/GameScreen';
import ResultScreen from './src/screens/ResultScreen';
import WordLearnScreen from './src/screens/WordLearnScreen';
import IntroScreen from './src/screens/IntroScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AvatarScreen from './src/screens/AvatarScreen';
import LoginScreen from './src/screens/LoginScreen';

import { COLORS } from './src/constants/colors';

const Stack = createNativeStackNavigator();
const INTRO_KEY = 'wm_intro_v1';

function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(INTRO_KEY).then(val => {
      setInitialRoute('Intro'); // TEMP: force for testing
    });
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: COLORS.bgDark || COLORS.background },
      }}
    >
      <Stack.Screen name="Intro"    component={IntroScreen}    options={{ animation: 'fade' }} />
      <Stack.Screen name="Welcome"  component={WelcomeScreen}  options={{ animation: 'fade' }} />
      <Stack.Screen name="Login"    component={LoginScreen}    options={{ animation: 'fade' }} />
      <Stack.Screen name="Avatar"   component={AvatarScreen}   options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Home"     component={HomeScreen} />
      <Stack.Screen
        name="LevelSelect"
        component={LevelSelectScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name="WordLearn"
        component={WordLearnScreen}
        options={{ animation: 'fade_from_bottom', gestureEnabled: false }}
      />
      <Stack.Screen
        name="Result"
        component={ResultScreen}
        options={{ animation: 'fade', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <UserProvider>
        <ProgressProvider>
          <GameProvider>
            <NavigationContainer>
              <AppNavigator />
              <StatusBar style="dark" />
            </NavigationContainer>
          </GameProvider>
        </ProgressProvider>
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
