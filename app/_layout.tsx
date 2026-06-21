import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { seedIfEmpty } from '../src/database/seed';

LogBox.ignoreLogs(['A props object containing a "key" prop']);

export default function RootLayout() {
  useEffect(() => {
    seedIfEmpty();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}