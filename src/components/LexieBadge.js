import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// ── Letter tile — scales with `size` ──────────────────────────────
function Tile({ letter, bg, dark, size, delay, wobbleDelay }) {
  const sc  = useSharedValue(0);
  const rot = useSharedValue(-20);
  const wob = useSharedValue(0);

  useEffect(() => {
    sc.value  = withDelay(delay, withSpring(1, { damping: 6, stiffness: 100 }));
    rot.value = withDelay(delay, withSpring(0, { damping: 7 }));
    wob.value = withDelay(wobbleDelay, withRepeat(
      withSequence(
        withTiming(-7, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming( 7, { duration: 350, easing: Easing.inOut(Easing.ease) }),
        withTiming( 0, { duration: 180 }),
        withTiming( 0, { duration: 900 }),
      ), -1, false,
    ));
  }, []);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }, { rotate: `${rot.value + wob.value}deg` }],
  }));

  const r = Math.round(size * 0.26);
  return (
    <Animated.View style={anim}>
      <View style={{ position:'absolute', width:size, height:size, borderRadius:r, top:Math.round(size*0.09), left:Math.round(size*0.09), backgroundColor:dark }} />
      <View style={{ width:size, height:size, borderRadius:r, borderWidth:size>40?3:2.5, borderColor:'#1A0A3A', alignItems:'center', justifyContent:'center', overflow:'hidden', backgroundColor:bg }}>
        <View style={{ position:'absolute', top:Math.round(size*0.09), left:Math.round(size*0.09), width:Math.round(size*0.28), height:Math.round(size*0.17), backgroundColor:'rgba(255,255,255,0.55)', borderRadius:4, transform:[{rotate:'-20deg'}] }} />
        <Text style={{ fontFamily:'Nunito_800ExtraBold', fontSize:Math.round(size*0.47), color:'#fff', textShadowColor:'rgba(0,0,0,0.35)', textShadowOffset:{width:1,height:1}, textShadowRadius:2 }}>{letter}</Text>
      </View>
    </Animated.View>
  );
}

function Connector({ delay, large }) {
  const op = useSharedValue(0);
  const sc = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withTiming(1, { duration: 300 }));
    sc.value = withDelay(delay, withSpring(1, { damping: 8 }));
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={anim}>
      <Text style={{ fontSize: large ? 22 : 13, marginHorizontal: large ? 0 : -2 }}>⚡</Text>
    </Animated.View>
  );
}

// ── Badge — use large={true} for HomeScreen hero size ─────────────
export default function LexieBadge({ style, large = false }) {
  const badgeSc = useSharedValue(0);
  const glowOp  = useSharedValue(0.4);

  useEffect(() => {
    badgeSc.value = withSpring(1, { damping: 8, stiffness: 90 });
    glowOp.value  = withRepeat(
      withSequence(
        withTiming(1,   { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
  }, []);

  const badgeAnim = useAnimatedStyle(() => ({ transform: [{ scale: badgeSc.value }] }));
  const glowAnim  = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  const tileSize   = large ? 58 : 34;
  const borderR    = large ? 28 : 22;
  const padH       = large ? 20 : 12;
  const padV       = large ? 14 : 7;
  const gap        = large ? 10 : 6;
  const divH       = large ? 44 : 28;
  const smallSz    = large ? 13 : 9;
  const bigSz      = large ? 26 : 15;
  const smallLS    = large ? 5  : 2.5;

  return (
    <Animated.View style={[{ alignSelf:'center', borderRadius:borderR, overflow:'visible' }, style, badgeAnim]}>
      <Animated.View style={[StyleSheet.absoluteFill, {
        borderRadius:borderR, borderWidth: large ? 2.5 : 2,
        borderColor:'#FFD700',
        shadowColor:'#FFD700', shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius: large ? 18 : 10,
        elevation:0,
      }, glowAnim]} />

      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(20,10,50,0.55)']}
        style={{ flexDirection:'row', alignItems:'center', gap, borderRadius:borderR, paddingHorizontal:padH, paddingVertical:padV, borderWidth:1.5, borderColor:'rgba(255,255,255,0.20)' }}
      >
        <Tile letter="W" bg="#FF6B6B" dark="#C94B4B" size={tileSize} delay={80}  wobbleDelay={1200} />
        <Connector delay={220} large={large} />
        <Tile letter="L" bg="#FFD700" dark="#C9A800" size={tileSize} delay={160} wobbleDelay={1800} />

        <View style={{ width:1.5, height:divH, backgroundColor:'rgba(255,255,255,0.22)', marginHorizontal: large ? 6 : 4 }} />

        <View>
          <Text style={{ fontFamily:'Nunito_700Bold', fontSize:smallSz, color:'rgba(255,220,100,0.95)', letterSpacing:smallLS }}> LEXIE'S</Text>
          <Text style={{ fontFamily:'Nunito_800ExtraBold', fontSize:bigSz, color:'white', letterSpacing:1, textShadowColor:'rgba(0,0,0,0.4)', textShadowOffset:{width:1,height:1}, textShadowRadius:3 }}>WORD LAB</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
