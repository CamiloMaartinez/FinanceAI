import React, { useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../constants/theme';

const SWIPE_THRESHOLD = -70; // qué tanto hay que deslizar para que "abra"
const MAX_SWIPE = -90;       // dónde queda enganchado el panel de eliminar

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
}

// Envoltura reutilizable: desliza hacia la izquierda para revelar un botón
// de "Eliminar". No depende de react-native-gesture-handler — usa solo
// PanResponder y Animated, que ya vienen incluidos en React Native.
export function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const c = useColors();
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        const base = isOpenRef.current ? MAX_SWIPE : 0;
        const next = base + gesture.dx;
        translateX.setValue(Math.max(MAX_SWIPE, Math.min(0, next)));
      },
      onPanResponderRelease: (_, gesture) => {
        const base = isOpenRef.current ? MAX_SWIPE : 0;
        const finalDX = base + gesture.dx;

        if (finalDX < SWIPE_THRESHOLD) {
          isOpenRef.current = true;
          Animated.spring(translateX, { toValue: MAX_SWIPE, useNativeDriver: true, bounciness: 4 }).start();
        } else {
          isOpenRef.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, { toValue: -420, duration: 200, useNativeDriver: true }).start(() => {
      onDelete();
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={[StyleSheet.absoluteFill, styles.deleteBg, { backgroundColor: c.expense }]}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[styles.foreground, { backgroundColor: c.background, transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden' },
  deleteBg: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  foreground: {},
});