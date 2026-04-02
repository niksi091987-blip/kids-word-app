// All imports MUST stay at the very top — never move them
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing, runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');
const INTRO_KEY = 'wm_intro_v1';

// ─── Sound helpers ────────────────────────────────────────────────
const SFX_SOURCES = {
  tile_tap:       require('../../assets/sounds/tile_tap.wav'),
  word_correct:   require('../../assets/sounds/word_correct.wav'),
  star_earned:    require('../../assets/sounds/star_earned.wav'),
  level_complete: require('../../assets/sounds/level_complete.wav'),
};
async function loadSounds() {
  try { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false }); } catch {}
  const out = {};
  for (const [k, src] of Object.entries(SFX_SOURCES)) {
    try { const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false }); out[k] = sound; } catch {}
  }
  return out;
}
async function playSfx(ref, key) {
  try { const s = ref.current[key]; if (!s) return; await s.setPositionAsync(0); await s.playAsync(); } catch {}
}

// ─── Narration ────────────────────────────────────────────────────
const NARRATION = [
  "Hi there! I'm Lexie the owl! Welcome to Word Match Kids! Let's go on a spelling adventure!",
  "First, you'll see a picture. Tap the letters to spell the word! Like this — Cat! You did it!",
  "Next, look at both words and find the same letters! See how A appears in both Cat and Hat? Those letters glow gold!",
  "Then use those glowing letters to build brand new words! A and T makes AT! Build more words for more points!",
  "Complete each level to earn up to three stars! Collect them all and become a Word Match legend! Ready to play?",
];

// ─── Scene config ─────────────────────────────────────────────────
const SCENES = [
  {
    id: 'welcome',
    sky:       ['#87CEEB', '#56B4D3', '#1A6EA8'],
    wallLeft:  '#4CAF50',
    wallRight: '#2E7D32',
    accentTop: '#A5D6A7',
    bannerText: '✨ Word Match Kids ✨',
    mood: 'wave',
    speech: "Hi! I'm Lexie! 🦉\nWelcome to\nWord Match Kids!",
    demo: null,
  },
  {
    id: 'spell',
    sky:       ['#FFF9C4', '#FFD54F', '#FF8F00'],
    wallLeft:  '#FF7043',
    wallRight: '#BF360C',
    accentTop: '#FFCC80',
    bannerText: '✏️  Step 1 — SPELL!',
    mood: 'excited',
    speech: "See a picture…\nTap letters to\nspell the word!",
    demo: 'spell',
  },
  {
    id: 'match',
    sky:       ['#F3E5F5', '#CE93D8', '#7B1FA2'],
    wallLeft:  '#1976D2',
    wallRight: '#0D47A1',
    accentTop: '#B39DDB',
    bannerText: '🌟  Step 2 — MATCH!',
    mood: 'think',
    speech: "Find letters that\nappear in BOTH words!\nThey glow gold!",
    demo: 'match',
  },
  {
    id: 'build',
    sky:       ['#E8F5E9', '#81C784', '#2E7D32'],
    wallLeft:  '#0277BD',
    wallRight: '#01579B',
    accentTop: '#80DEEA',
    bannerText: '🏗️  Step 3 — BUILD!',
    mood: 'happy',
    speech: "Use matched letters\nto make\nnew words!",
    demo: 'build',
  },
  {
    id: 'stars',
    sky:       ['#FFFDE7', '#FFD600', '#FF6F00'],
    wallLeft:  '#7B1FA2',
    wallRight: '#4A148C',
    accentTop: '#FFD54F',
    bannerText: '⭐  Earn Stars!',
    mood: 'celebrate',
    speech: "3 stars per level!\nBecome a\nWord Match Legend!",
    demo: 'stars',
  },
];

const MOOD_COLORS = {
  wave:      ['#FF9A3C', '#FF6B35'],
  excited:   ['#FF6B6B', '#FF4757'],
  think:     ['#54A0FF', '#2E86DE'],
  happy:     ['#2ECC71', '#27AE60'],
  celebrate: ['#A855F7', '#7C3AED'],
};

const TC = [
  ['#FF6B6B', '#C94B4B'],
  ['#FFD700', '#C9A800'],
  ['#4ECDC4', '#2EA89E'],
  ['#A855F7', '#7B2FBE'],
  ['#FF9500', '#C97200'],
  ['#2ECC71', '#27AE60'],
];

// ══════════════════════════════════════════════════════════════════
//  CARTOON ROOM BACKGROUND
// ══════════════════════════════════════════════════════════════════

function DriftCloud({ top, startX, speed, size = 1, opacity = 0.8 }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(SW + 220, { duration: speed, easing: Easing.linear }),
        withTiming(-220, { duration: 0 }),
      ), -1, false,
    );
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const w = 110 * size, h = 40 * size;
  return (
    <Animated.View style={[{ position: 'absolute', top, opacity }, s]}>
      <View style={{ width: w, height: h, backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: h / 2 }} />
      <View style={{ position: 'absolute', left: w * 0.08, top: -h * 0.45, width: h * 1.1, height: h * 1.1, backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 999 }} />
      <View style={{ position: 'absolute', left: w * 0.36, top: -h * 0.7, width: h * 1.4, height: h * 1.4, backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 999 }} />
      <View style={{ position: 'absolute', left: w * 0.68, top: -h * 0.45, width: h * 1.1, height: h * 1.1, backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 999 }} />
    </Animated.View>
  );
}

function CartoonRoom({ scene }) {
  return (
    <>
      {/* Sky / centre backdrop */}
      <LinearGradient colors={scene.sky} style={StyleSheet.absoluteFill} />

      {/* Left stage wing */}
      <View style={[room.wing, room.wingL, { backgroundColor: scene.wallLeft }]}>
        <View style={[room.wingEdge, { backgroundColor: scene.wallRight }]} />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[room.stripe, { left: i * 14 + 4 }]} />
        ))}
        {/* Window / picture frame on left wall */}
        <View style={room.frame}>
          <LinearGradient colors={['#FFE082', '#FF8F00']} style={room.frameInner}>
            <Text style={room.frameEmoji}>🌈</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Right stage wing */}
      <View style={[room.wing, room.wingR, { backgroundColor: scene.wallLeft }]}>
        <View style={[room.wingEdge, room.wingEdgeR, { backgroundColor: scene.wallRight }]} />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[room.stripe, { left: i * 14 + 4 }]} />
        ))}
        {/* Window / picture frame on right wall */}
        <View style={room.frame}>
          <LinearGradient colors={['#80DEEA', '#0288D1']} style={room.frameInner}>
            <Text style={room.frameEmoji}>⭐</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Floor */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.22)', 'rgba(0,0,0,0.40)']}
        style={room.floor}
      />
      {/* Floor planks */}
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[room.plank, { bottom: 18 + i * 18 }]} />
      ))}

      {/* Clouds in center sky */}
      <DriftCloud top={55}  startX={SW * 0.30} speed={20000} size={0.9} opacity={0.75} />
      <DriftCloud top={115} startX={-160}       speed={28000} size={0.65} opacity={0.55} />

      {/* Top accent strip */}
      <LinearGradient
        colors={[scene.accentTop, 'transparent']}
        style={room.topAccent}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  GOLDEN BANNER
// ══════════════════════════════════════════════════════════════════

function GoldenBanner({ text, animStyle }) {
  return (
    <Animated.View style={[ban.outer, animStyle]}>
      {/* Left ribbon tail */}
      <View style={ban.tailL} />
      {/* Right ribbon tail */}
      <View style={ban.tailR} />
      {/* Main ribbon body */}
      <LinearGradient
        colors={['#FFE082', '#FFD600', '#FFA000', '#E65100']}
        style={ban.body}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={ban.shine} />
        <Text style={ban.text}>{text}</Text>
        <View style={ban.shine2} />
      </LinearGradient>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SPEECH BUBBLE
// ══════════════════════════════════════════════════════════════════

function SpeechBubble({ text }) {
  const sc = useSharedValue(0);
  useEffect(() => {
    sc.value = 0;
    sc.value = withSpring(1, { damping: 7, stiffness: 130 });
  }, [text]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <Animated.View style={[sb.bubble, anim]}>
      <Text style={sb.text}>{text}</Text>
      <View style={sb.tail} />
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  LEXIE CHARACTER
// ══════════════════════════════════════════════════════════════════

function LexieCharacter({ mood = 'wave', size = 110 }) {
  const bounceY = useSharedValue(0);
  const waveR   = useSharedValue(0);
  const squishY = useSharedValue(1);
  const squishX = useSharedValue(1);
  const starOp  = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(bounceY); cancelAnimation(waveR);
    cancelAnimation(squishY); cancelAnimation(squishX); cancelAnimation(starOp);
    waveR.value = 0; squishY.value = 1; squishX.value = 1; starOp.value = 0;

    bounceY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 620, easing: Easing.inOut(Easing.ease) }),
        withTiming(0,   { duration: 620, easing: Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
    if (mood === 'wave') {
      waveR.value = withRepeat(
        withSequence(
          withTiming(28,  { duration: 320 }),
          withTiming(-8,  { duration: 280 }),
          withTiming(0,   { duration: 200 }),
          withTiming(0,   { duration: 700 }),
        ), -1, false,
      );
    }
    if (mood === 'celebrate') {
      squishY.value = withRepeat(withSequence(withTiming(1.18,{duration:220}),withTiming(0.88,{duration:180}),withTiming(1,{duration:180})),-1,false);
      squishX.value = withRepeat(withSequence(withTiming(0.88,{duration:220}),withTiming(1.12,{duration:180}),withTiming(1,{duration:180})),-1,false);
      starOp.value  = withRepeat(withSequence(withTiming(1,{duration:400}),withTiming(0.2,{duration:400})),-1,true);
    }
    if (mood === 'excited') {
      squishY.value = withRepeat(withSequence(withTiming(1.12,{duration:260}),withTiming(0.9,{duration:200}),withTiming(1,{duration:160}),withTiming(1,{duration:300})),-1,false);
    }
  }, [mood]);

  const bodyAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }, { scaleY: squishY.value }, { scaleX: squishX.value }],
  }));
  const waveAnim = useAnimatedStyle(() => ({ transform: [{ rotate: `${waveR.value}deg` }] }));
  const starAnim = useAnimatedStyle(() => ({ opacity: starOp.value }));
  const colors   = MOOD_COLORS[mood] || MOOD_COLORS.wave;

  return (
    <View style={{ alignItems: 'center', width: size + 64 }}>
      <Animated.View style={[{ alignItems: 'center' }, bodyAnim]}>
        <Text style={{ fontSize: size * 0.28, position: 'absolute', top: -size * 0.24, zIndex: 2 }}>🎓</Text>
        <LinearGradient colors={colors} style={[ch.body, { width: size, height: size, borderRadius: size / 2 }]}>
          <View style={[ch.ear, { left: size * 0.10, top: -size * 0.09 }]} />
          <View style={[ch.ear, { right: size * 0.10, top: -size * 0.09 }]} />
          <View style={[ch.eyes, { gap: size * 0.12 }]}>
            {[0, 1].map(i => (
              <View key={i} style={[ch.eye, { width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11 }]}>
                <View style={[ch.pupil, { width: size * 0.12, height: size * 0.12, borderRadius: size * 0.06 }]} />
                <View style={ch.eyeShine} />
              </View>
            ))}
          </View>
          <View style={[ch.beak, { borderLeftWidth: size*0.09, borderRightWidth: size*0.09, borderTopWidth: size*0.13 }]} />
          <View style={[ch.cheek, { left: size * 0.10, bottom: size * 0.26 }]} />
          <View style={[ch.cheek, { right: size * 0.10, bottom: size * 0.26 }]} />
          <View style={[ch.belly, { width: size * 0.55, height: size * 0.38, bottom: size * 0.04 }]} />
        </LinearGradient>
        {mood === 'wave' && (
          <Animated.Text style={[{ position:'absolute', right:-30, top:size*0.18, fontSize:size*0.32 }, waveAnim]}>👋</Animated.Text>
        )}
        {mood === 'think' && <Text style={{ position:'absolute', right:-28, top:size*0.15, fontSize:size*0.3 }}>🤔</Text>}
        {mood === 'happy' && <Text style={{ position:'absolute', right:-28, top:size*0.15, fontSize:size*0.3 }}>👍</Text>}
        {mood === 'excited' && <Text style={{ position:'absolute', right:-28, top:size*0.15, fontSize:size*0.3 }}>🤩</Text>}
        {mood === 'celebrate' && (
          <>
            <Animated.Text style={[{ position:'absolute', left:-22, top:-12, fontSize:24 }, starAnim]}>⭐</Animated.Text>
            <Animated.Text style={[{ position:'absolute', right:-22, top:-10, fontSize:20 }, starAnim]}>✨</Animated.Text>
            <Text style={{ position:'absolute', right:-28, top:size*0.18, fontSize:size*0.3 }}>🎉</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DEMO TILE
// ══════════════════════════════════════════════════════════════════

function DemoTile({ letter, ci = 0, delay = 0, isMatch = false, revealed = false, size = 56 }) {
  const sc  = useSharedValue(0);
  const wob = useSharedValue(0);
  useEffect(() => {
    if (revealed) {
      sc.value = withDelay(delay, withSpring(1, { damping: 6, stiffness: 100 }));
      if (isMatch) {
        wob.value = withDelay(delay + 400, withRepeat(
          withSequence(
            withTiming(-7, { duration: 280 }),
            withTiming(7,  { duration: 280 }),
            withTiming(0,  { duration: 140 }),
          ), -1, false,
        ));
      }
    }
  }, [revealed]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }, { rotate: `${wob.value}deg` }] }));
  const [bgColor, dark] = TC[ci % TC.length];
  return (
    <Animated.View style={anim}>
      <View style={[tile.shadow, { width: size, height: size, borderRadius: 13, backgroundColor: isMatch ? '#B7950B' : dark }]} />
      <LinearGradient
        colors={isMatch ? ['#FFE066', '#FFD700'] : [bgColor, dark]}
        style={[tile.face, { width: size, height: size, borderRadius: 13 }, isMatch && tile.faceMatch]}
      >
        <View style={tile.shine} />
        <Text style={[tile.letter, { fontSize: size * 0.42 }, isMatch && { color: '#7B5200' }]}>{letter}</Text>
        {isMatch && <Text style={tile.sparkle}>⭐</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  SCENE DEMOS
// ══════════════════════════════════════════════════════════════════

function SpellDemo({ sfxRef }) {
  const [rev, setRev] = useState(false);
  const emojiS = useSharedValue(0);
  useEffect(() => {
    emojiS.value = withSpring(1, { damping: 6, stiffness: 90 });
    const t = setTimeout(() => {
      setRev(true);
      [0, 1, 2].forEach(i => setTimeout(() => playSfx(sfxRef, 'tile_tap'), i * 250));
    }, 700);
    return () => clearTimeout(t);
  }, []);
  const ea = useAnimatedStyle(() => ({ transform: [{ scale: emojiS.value }] }));
  return (
    <View style={dm.wrap}>
      <View style={dm.picCard}>
        <Animated.Text style={[{ fontSize: 60 }, ea]}>🐱</Animated.Text>
        <Text style={dm.picLabel}>What is this?</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        {['C', 'A', 'T'].map((l, i) => (
          <DemoTile key={i} letter={l} ci={i} delay={700 + i * 250} revealed={rev} size={58} />
        ))}
      </View>
    </View>
  );
}

function MatchDemo({ sfxRef }) {
  const [rev, setRev] = useState(false);
  const beamOp = useSharedValue(0);
  const beamS  = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setRev(true);
      [0,1,2,3,4,5].forEach(i => setTimeout(() => playSfx(sfxRef, 'tile_tap'), i * 160 + 80));
      setTimeout(() => {
        beamOp.value = withTiming(1, { duration: 350 });
        beamS.value  = withSpring(1, { damping: 8 });
        playSfx(sfxRef, 'word_correct');
      }, 6 * 160 + 420);
    }, 400);
    return () => clearTimeout(t);
  }, []);
  const beamAnim = useAnimatedStyle(() => ({ opacity: beamOp.value, transform: [{ scale: beamS.value }] }));
  const row = (word, startD) => word.split('').map((l, i) => (
    <DemoTile key={i} letter={l} ci={i} delay={startD + i * 160} isMatch={l === 'A'} revealed={rev} size={54} />
  ));
  return (
    <View style={dm.wrap}>
      <View style={{ flexDirection: 'row', gap: 8 }}>{row('CAT', 0)}</View>
      <Animated.View style={[dm.beam, beamAnim]}>
        <Text style={dm.beamTxt}>⚡ same letter! ⚡</Text>
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 8 }}>{row('HAT', 3 * 160 + 320)}</View>
    </View>
  );
}

function BuildDemo({ sfxRef }) {
  const [phase, setPhase] = useState(0);
  const resultS = useSharedValue(0);
  const arrowOp = useSharedValue(0);
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase(1);
      playSfx(sfxRef, 'tile_tap');
    }, 500);
    const t2 = setTimeout(() => {
      arrowOp.value = withTiming(1, { duration: 300 });
    }, 1400);
    const t3 = setTimeout(() => {
      setPhase(2);
      resultS.value = withSpring(1, { damping: 5, stiffness: 80 });
      playSfx(sfxRef, 'word_correct');
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const ra = useAnimatedStyle(() => ({ transform: [{ scale: resultS.value }], opacity: resultS.value }));
  const aa = useAnimatedStyle(() => ({ opacity: arrowOp.value }));
  return (
    <View style={dm.wrap}>
      <Text style={dm.label}>Matched letters:</Text>
      {phase >= 1 && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DemoTile letter="A" ci={1} delay={0}   revealed isMatch size={62} />
          <DemoTile letter="T" ci={2} delay={220} revealed isMatch size={62} />
        </View>
      )}
      <Animated.Text style={[dm.arrow, aa]}>↓  combine!  ↓</Animated.Text>
      {phase >= 2 && (
        <Animated.View style={[dm.result, ra]}>
          <Text style={dm.resultTxt}>"AT"</Text>
          <Text style={{ fontSize: 28 }}>⭐</Text>
        </Animated.View>
      )}
    </View>
  );
}

// StarParticle must be its own component so hooks aren't called inside .map()
function StarParticle({ emoji, offsetX, sfxRef, index }) {
  const op = useSharedValue(0);
  const y  = useSharedValue(40);
  useEffect(() => {
    const d = index * 300;
    op.value = withDelay(d, withRepeat(
      withSequence(withTiming(1,{duration:360}), withTiming(0.25,{duration:360})),
      -1, true,
    ));
    y.value = withDelay(d, withRepeat(
      withSequence(
        withTiming(-65, { duration: 950, easing: Easing.out(Easing.quad) }),
        withTiming(40,  { duration: 0 }),
      ), -1, false,
    ));
    setTimeout(() => playSfx(sfxRef, 'star_earned'), d);
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }, { translateX: offsetX }],
  }));
  return <Animated.Text style={[{ fontSize: 30, position: 'absolute', top: 28 }, anim]}>{emoji}</Animated.Text>;
}

const STAR_DATA = [
  { emoji: '⭐', offsetX: -72 },
  { emoji: '🌟', offsetX: -36 },
  { emoji: '⭐', offsetX:   0 },
  { emoji: '✨', offsetX:  36 },
  { emoji: '⭐', offsetX:  72 },
  { emoji: '🌟', offsetX: -54 },
];

function StarsDemo({ sfxRef }) {
  return (
    <View style={[dm.wrap, { height: 100 }]}>
      <Text style={dm.label}>Collect all the stars! 🏆</Text>
      {STAR_DATA.map((d, i) => (
        <StarParticle key={i} index={i} emoji={d.emoji} offsetX={d.offsetX} sfxRef={sfxRef} />
      ))}
    </View>
  );
}

function SceneDemo({ demo, sfxRef }) {
  if (demo === 'spell') return <SpellDemo  sfxRef={sfxRef} />;
  if (demo === 'match') return <MatchDemo  sfxRef={sfxRef} />;
  if (demo === 'build') return <BuildDemo  sfxRef={sfxRef} />;
  if (demo === 'stars') return <StarsDemo  sfxRef={sfxRef} />;
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  FLOATING SPARKLES (ambient bg decoration)
// ══════════════════════════════════════════════════════════════════

function Sparkle({ emoji, startX, delay, duration }) {
  const y  = useSharedValue(-50);
  const op = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(SH * 0.55, { duration, easing: Easing.linear }),
        withTiming(-50, { duration: 0 }),
      ), -1, false,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: 350 }),
        withTiming(1, { duration: duration - 700 }),
        withTiming(0, { duration: 350 }),
        withTiming(0, { duration: 0 }),
      ), -1, false,
    ));
    rot.value = withRepeat(withTiming(360, { duration: duration * 0.8, easing: Easing.linear }), -1, false);
  }, []);
  const anim = useAnimatedStyle(() => ({
    position: 'absolute', left: startX, top: 0,
    opacity: op.value,
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
  }));
  return <Animated.Text style={[anim, { fontSize: 22 }]}>{emoji}</Animated.Text>;
}

const SPARKLE_SETS = {
  welcome: [
    { emoji:'⭐', startX:SW*0.06, delay:0,    duration:4000 },
    { emoji:'✨', startX:SW*0.78, delay:900,  duration:5200 },
    { emoji:'🌟', startX:SW*0.42, delay:1800, duration:4400 },
    { emoji:'💫', startX:SW*0.60, delay:400,  duration:3800 },
  ],
  spell: [
    { emoji:'☀️', startX:SW*0.07, delay:0,    duration:6000 },
    { emoji:'✏️', startX:SW*0.76, delay:1100, duration:5400 },
    { emoji:'⭐', startX:SW*0.48, delay:600,  duration:4800 },
  ],
  match: [
    { emoji:'🌟', startX:SW*0.08, delay:0,    duration:5000 },
    { emoji:'💜', startX:SW*0.80, delay:700,  duration:4600 },
    { emoji:'✨', startX:SW*0.46, delay:1400, duration:3900 },
  ],
  build: [
    { emoji:'💡', startX:SW*0.07, delay:0,    duration:5500 },
    { emoji:'⭐', startX:SW*0.74, delay:800,  duration:5000 },
    { emoji:'✨', startX:SW*0.46, delay:400,  duration:4300 },
  ],
  stars: [
    { emoji:'⭐', startX:SW*0.08, delay:0,    duration:2600 },
    { emoji:'🌟', startX:SW*0.32, delay:350,  duration:3000 },
    { emoji:'✨', startX:SW*0.65, delay:700,  duration:2800 },
    { emoji:'💫', startX:SW*0.84, delay:200,  duration:3200 },
  ],
};

// ══════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function IntroScreen({ navigation }) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const sfxRef    = useRef({});
  const autoTimer = useRef(null);
  const busy      = useRef(false);

  const stageOp = useSharedValue(0);
  const lexieY  = useSharedValue(100);
  const bannerS = useSharedValue(0.6);

  // Load sounds once
  useEffect(() => {
    loadSounds().then(loaded => { sfxRef.current = loaded; });
    return () => {
      Speech.stop();
      Object.values(sfxRef.current).forEach(s => { try { s.unloadAsync(); } catch {} });
    };
  }, []);

  // Per-scene enter
  useEffect(() => {
    stageOp.value = 0;
    lexieY.value  = 100;
    bannerS.value = 0.6;
    busy.current  = false;
    if (autoTimer.current) clearTimeout(autoTimer.current);

    stageOp.value = withTiming(1, { duration: 520 });
    lexieY.value  = withSpring(0,  { damping: 14, stiffness: 100 });
    bannerS.value = withSpring(1,  { damping: 7,  stiffness: 120 });

    Speech.stop();
    setTimeout(() => {
      Speech.speak(NARRATION[sceneIdx], {
        language: 'en-US', pitch: 1.18, rate: 0.80,
        onDone: () => {
          if (sceneIdx < SCENES.length - 1) {
            autoTimer.current = setTimeout(() => advance(), 1600);
          }
        },
      });
    }, 650);

    if (sceneIdx === SCENES.length - 1) {
      setTimeout(() => playSfx(sfxRef, 'level_complete'), 900);
    } else if (sceneIdx > 0) {
      setTimeout(() => playSfx(sfxRef, 'star_earned'), 350);
    }

    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [sceneIdx]);

  const advance = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    Speech.stop();
    if (autoTimer.current) clearTimeout(autoTimer.current);

    if (sceneIdx >= SCENES.length - 1) {
      AsyncStorage.setItem(INTRO_KEY, '1').then(() => navigation.replace('Home'));
      return;
    }
    stageOp.value = withTiming(0, { duration: 320 }, (finished) => {
      if (finished) runOnJS(setSceneIdx)(s => s + 1);
    });
  }, [sceneIdx]);

  const handleSkip = async () => {
    Speech.stop();
    if (autoTimer.current) clearTimeout(autoTimer.current);
    await AsyncStorage.setItem(INTRO_KEY, '1');
    navigation.replace('Home');
  };

  const scene     = SCENES[sceneIdx];
  const isLast    = sceneIdx === SCENES.length - 1;
  const isWelcome = sceneIdx === 0;
  const sparkles  = SPARKLE_SETS[scene.id] || [];

  const stageAnim  = useAnimatedStyle(() => ({ opacity: stageOp.value }));
  const lexieAnim  = useAnimatedStyle(() => ({ transform: [{ translateY: lexieY.value }] }));
  const bannerAnim = useAnimatedStyle(() => ({ transform: [{ scale: bannerS.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Animated.View style={[StyleSheet.absoluteFill, stageAnim]}>

        {/* === ROOM BACKGROUND === */}
        <CartoonRoom scene={scene} />

        {/* === AMBIENT SPARKLES === */}
        {sparkles.map((sp, i) => (
          <Sparkle key={`${scene.id}-${i}`} {...sp} />
        ))}

        <SafeAreaView style={{ flex: 1 }}>

          {/* TOP: Skip button */}
          <View style={s.topBar}>
            <Pressable style={s.skipBtn} onPress={handleSkip}>
              <Text style={s.skipTxt}>Skip ›</Text>
            </Pressable>
          </View>

          {/* GOLDEN BANNER */}
          <GoldenBanner text={scene.bannerText} animStyle={bannerAnim} />

          {/* MAIN TAP AREA */}
          <Pressable style={{ flex: 1 }} onPress={advance}>

            {/* DEMO (scenes 1-4 only) */}
            {!isWelcome && scene.demo && (
              <View style={s.demoArea}>
                <SceneDemo
                  key={`demo-${scene.id}-${sceneIdx}`}
                  demo={scene.demo}
                  sfxRef={sfxRef}
                />
              </View>
            )}

            {/* LEXIE + SPEECH BUBBLE */}
            <View style={[s.charArea, isWelcome && s.charAreaWelcome]}>
              <SpeechBubble text={scene.speech} />
              <Animated.View style={[{ alignItems: 'center' }, lexieAnim]}>
                <LexieCharacter mood={scene.mood} size={isWelcome ? 150 : 102} />
              </Animated.View>
            </View>

          </Pressable>

          {/* BOTTOM NAV */}
          <View style={s.navArea}>
            {/* Scene dots */}
            <View style={s.dots}>
              {SCENES.map((_, i) => (
                <View key={i} style={[s.dot, i === sceneIdx && s.dotActive]} />
              ))}
            </View>
            {/* Action button */}
            <Pressable
              style={[s.actionBtn, isLast && s.playBtn]}
              onPress={advance}
            >
              <Text style={[s.actionTxt, isLast && s.playTxt]}>
                {isLast ? "🎮  LET'S PLAY!" : isWelcome ? "Let's Go!  →" : 'Next  →'}
              </Text>
            </Pressable>
          </View>

        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

// ── Room styles ──────────────────────────────────────────────────
const room = StyleSheet.create({
  wing:      { position:'absolute', top:0, bottom:0, width:SW*0.21, overflow:'hidden' },
  wingL:     { left:0 },
  wingR:     { right:0 },
  wingEdge:  { position:'absolute', right:0, top:0, bottom:0, width:10 },
  wingEdgeR: { right:undefined, left:0 },
  stripe:    { position:'absolute', top:0, bottom:0, width:7, backgroundColor:'rgba(255,255,255,0.14)' },
  frame:     { position:'absolute', top:'22%', alignSelf:'center', width:SW*0.14, height:SW*0.17,
               borderWidth:4, borderColor:'rgba(255,255,255,0.5)', borderRadius:8, overflow:'hidden' },
  frameInner:{ flex:1, alignItems:'center', justifyContent:'center' },
  frameEmoji:{ fontSize:24 },
  floor:     { position:'absolute', bottom:0, left:0, right:0, height:90 },
  plank:     { position:'absolute', left:0, right:0, height:2, backgroundColor:'rgba(255,255,255,0.10)' },
  topAccent: { position:'absolute', top:0, left:0, right:0, height:80 },
});

// ── Banner styles ────────────────────────────────────────────────
const ban = StyleSheet.create({
  outer: { alignItems:'center', marginHorizontal:16, marginTop:6, marginBottom:8 },
  tailL: {
    position:'absolute', left:0, top:'50%', marginTop:-14,
    width:0, height:0,
    borderTopWidth:14, borderBottomWidth:14, borderRightWidth:22,
    borderTopColor:'transparent', borderBottomColor:'transparent', borderRightColor:'#E65100',
  },
  tailR: {
    position:'absolute', right:0, top:'50%', marginTop:-14,
    width:0, height:0,
    borderTopWidth:14, borderBottomWidth:14, borderLeftWidth:22,
    borderTopColor:'transparent', borderBottomColor:'transparent', borderLeftColor:'#E65100',
  },
  body: {
    paddingHorizontal:32, paddingVertical:14,
    borderRadius:14, borderWidth:3, borderColor:'rgba(120,50,0,0.35)',
    alignItems:'center', justifyContent:'center',
    minWidth:SW*0.68,
    shadowColor:'#7A3800', shadowOffset:{width:0,height:5},
    shadowOpacity:0.45, shadowRadius:10, elevation:12,
  },
  shine:  { position:'absolute', top:5, left:24, right:24, height:7, backgroundColor:'rgba(255,255,255,0.38)', borderRadius:4 },
  shine2: { position:'absolute', bottom:5, left:40, right:40, height:4, backgroundColor:'rgba(255,160,0,0.28)', borderRadius:4 },
  text:   { fontFamily:'Nunito_800ExtraBold', fontSize:19, color:'#4A1800',
            textShadowColor:'rgba(255,220,100,0.7)', textShadowOffset:{width:0,height:1}, textShadowRadius:3,
            textAlign:'center' },
});

// ── Speech bubble styles ─────────────────────────────────────────
const sb = StyleSheet.create({
  bubble: {
    backgroundColor:'white', borderRadius:24,
    paddingHorizontal:20, paddingVertical:13,
    marginHorizontal:28, marginBottom:12,
    shadowColor:'#000', shadowOffset:{width:0,height:4},
    shadowOpacity:0.20, shadowRadius:10, elevation:8,
    alignItems:'center', borderWidth:2.5, borderColor:'rgba(0,0,0,0.06)',
  },
  text: { fontFamily:'Nunito_800ExtraBold', fontSize:17, color:'#1E3A5F', textAlign:'center', lineHeight:26 },
  tail: {
    position:'absolute', bottom:-17, alignSelf:'center',
    width:0, height:0,
    borderLeftWidth:13, borderRightWidth:13, borderTopWidth:17,
    borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:'white',
  },
});

// ── Lexie character styles ───────────────────────────────────────
const ch = StyleSheet.create({
  body:     { alignItems:'center', justifyContent:'center', borderWidth:3.5, borderColor:'rgba(0,0,0,0.15)', overflow:'visible' },
  ear:      { position:'absolute', width:18, height:24, backgroundColor:'rgba(255,255,255,0.32)', borderRadius:9 },
  eyes:     { flexDirection:'row', marginBottom:4, marginTop:6 },
  eye:      { backgroundColor:'white', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  pupil:    { backgroundColor:'#1A1A2E' },
  eyeShine: { position:'absolute', top:3, left:3, width:5, height:5, borderRadius:3, backgroundColor:'rgba(255,255,255,0.9)' },
  beak:     { borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:'#F59E0B', marginTop:2 },
  cheek:    { position:'absolute', width:16, height:10, borderRadius:8, backgroundColor:'rgba(255,180,100,0.55)' },
  belly:    { position:'absolute', backgroundColor:'rgba(255,255,255,0.20)', borderTopLeftRadius:999, borderTopRightRadius:999 },
});

// ── Demo tile styles ─────────────────────────────────────────────
const tile = StyleSheet.create({
  shadow:    { position:'absolute', top:4, left:3 },
  face:      { borderWidth:3, borderColor:'rgba(0,0,0,0.22)', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  faceMatch: { borderColor:'#B7950B' },
  shine:     { position:'absolute', top:4, left:4, width:14, height:8, backgroundColor:'rgba(255,255,255,0.55)', borderRadius:5, transform:[{rotate:'-20deg'}] },
  letter:    { fontFamily:'Nunito_800ExtraBold', color:'#fff', textShadowColor:'rgba(0,0,0,0.30)', textShadowOffset:{width:1,height:1}, textShadowRadius:2 },
  sparkle:   { position:'absolute', top:1, right:2, fontSize:9 },
});

// ── Demo content styles ──────────────────────────────────────────
const dm = StyleSheet.create({
  wrap:      { alignItems:'center', width:'100%', gap:8 },
  picCard:   { backgroundColor:'rgba(255,255,255,0.88)', borderRadius:22, paddingHorizontal:28, paddingVertical:10,
               alignItems:'center', gap:4, borderWidth:2.5, borderColor:'rgba(0,0,0,0.08)',
               shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:8, elevation:6 },
  picLabel:  { fontFamily:'Nunito_700Bold', fontSize:13, color:'#374151' },
  label:     { fontFamily:'Nunito_700Bold', fontSize:14, color:'rgba(255,255,255,0.95)',
               textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:1}, textShadowRadius:3 },
  beam:      { backgroundColor:'rgba(255,255,0,0.22)', borderRadius:20,
               paddingHorizontal:16, paddingVertical:5,
               borderWidth:2, borderColor:'rgba(255,215,0,0.7)' },
  beamTxt:   { fontFamily:'Nunito_800ExtraBold', fontSize:13, color:'#FFD700',
               textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:1}, textShadowRadius:2 },
  arrow:     { fontFamily:'Nunito_700Bold', fontSize:14, color:'rgba(255,255,255,0.9)',
               textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:1}, textShadowRadius:2 },
  result:    { flexDirection:'row', alignItems:'center', gap:8,
               backgroundColor:'rgba(255,255,255,0.94)', borderRadius:22,
               paddingHorizontal:24, paddingVertical:10,
               borderWidth:2.5, borderColor:'#10B981' },
  resultTxt: { fontFamily:'Nunito_800ExtraBold', fontSize:30, color:'#065F46' },
});

// ── Main screen styles ───────────────────────────────────────────
const s = StyleSheet.create({
  topBar:         { flexDirection:'row', justifyContent:'flex-end', paddingHorizontal:16, paddingTop:4 },
  skipBtn:        { paddingHorizontal:14, paddingVertical:6,
                    backgroundColor:'rgba(0,0,0,0.28)', borderRadius:20 },
  skipTxt:        { fontFamily:'Nunito_700Bold', fontSize:13, color:'rgba(255,255,255,0.92)' },
  demoArea:       { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:20 },
  charArea:       { paddingHorizontal:14, paddingTop:6, alignItems:'center' },
  charAreaWelcome:{ flex:1, justifyContent:'center' },
  navArea:        { paddingHorizontal:22, paddingBottom:18, alignItems:'center', gap:10 },
  dots:           { flexDirection:'row', gap:8 },
  dot:            { width:10, height:10, borderRadius:5, backgroundColor:'rgba(255,255,255,0.38)' },
  dotActive:      { backgroundColor:'white', width:30, borderRadius:5 },
  actionBtn:      { width:'100%', backgroundColor:'rgba(255,255,255,0.92)', borderRadius:32,
                    paddingVertical:15, alignItems:'center',
                    shadowColor:'#000', shadowOffset:{width:0,height:4},
                    shadowOpacity:0.22, shadowRadius:8, elevation:9 },
  playBtn:        { backgroundColor:'#22C55E', borderWidth:3, borderColor:'white' },
  actionTxt:      { fontFamily:'Nunito_800ExtraBold', fontSize:18, color:'#1E3A5F', letterSpacing:0.5 },
  playTxt:        { color:'white', fontSize:20 },
});
