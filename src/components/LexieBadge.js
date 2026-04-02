import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LexieBadge({ style }) {
  return (
    <View style={[lb.wrap, style]}>
      <Text style={lb.owl}>🦉</Text>
      <View style={lb.textWrap}>
        <Text style={lb.small}>LEXIE'S</Text>
        <Text style={lb.big}>WORD LAB</Text>
      </View>
    </View>
  );
}

const lb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  owl:   { fontSize: 18 },
  textWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  small: {
    fontFamily: 'Nunito_700Bold', fontSize: 10,
    color: 'rgba(255,220,100,0.95)', letterSpacing: 2,
  },
  big: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 14,
    color: 'white', letterSpacing: 1,
  },
});
