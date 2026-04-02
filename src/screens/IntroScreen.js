// All imports MUST stay at the very top
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withRepeat, withSequence,
  withTiming, withDelay, Easing,
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
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,      // let TTS speak over SFX on Android
      allowsRecordingIOS: false,
      interruptionModeIOS: 2,       // 2 = DuckOthers — allows TTS to coexist
      interruptionModeAndroid: 2,   // 2 = DuckOthers — same on Android
    });
  } catch {}
  const out = {};
  for (const [k, src] of Object.entries(SFX_SOURCES)) {
    try { const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false }); out[k] = sound; } catch {}
  }
  return out;
}
async function playSfx(ref, key) {
  try { const s = ref.current[key]; if (!s) return; await s.setPositionAsync(0); await s.playAsync(); } catch {}
}

// ─── Movie data ───────────────────────────────────────────────────
const NARRATION = [
  "Hi there! I'm Lexie the owl! Welcome to Word Match Kids! Let's go on a spelling adventure!",
  "First, you'll see a picture. Tap the letters to spell the word. Like this — Cat! Amazing!",
  "Next, find letters that appear in BOTH words. See how A glows in Cat and Hat? Those are your keys!",
  "Then use those glowing letters to build brand new words. A and T makes AT! Build more words for more points!",
  "Complete each level to earn up to three stars! Collect them all and become a Word Match legend! Are you ready?",
];

// 5 background palettes — one per chapter
const BG = [
  ['#0D47A1', '#1976D2', '#42A5F5', '#90CAF9'],   // ch0: deep blue sky
  ['#BF360C', '#E64A19', '#FF7043', '#FFCCBC'],   // ch1: warm sunset orange
  ['#4A148C', '#7B1FA2', '#BA68C8', '#E1BEE7'],   // ch2: magic purple
  ['#1B5E20', '#2E7D32', '#66BB6A', '#C8E6C9'],   // ch3: fresh green
  ['#F57F17', '#F9A825', '#FFD600', '#FFF9C4'],   // ch4: golden celebration
];

const MOODS    = ['wave', 'excited', 'think', 'happy', 'celebrate'];
const SIZES    = [152,    105,       105,     105,     138];
const SPEECHES = [
  "Hi! I'm Lexie! 🦉\nWelcome to\nWord Match Kids!",
  "See a picture…\nTap to spell\nthe word! ✏️",
  "Find letters\nin BOTH words!\nThey glow gold! 🌟",
  "Use matched\nletters to build\nnew words! 🏗️",
  "Earn 3 stars\nper level!\nBecome a Legend! ⭐",
];
const LABELS   = ['', 'SPELL IT! ✏️', 'FIND THE MATCH! ✨', 'BUILD WORDS! 💪', '⭐  3 STARS!  ⭐'];
const TILE_C   = [
  ['#FF6B6B','#C94B4B'], ['#FFD700','#C9A800'], ['#4ECDC4','#2EA89E'],
  ['#A855F7','#7B2FBE'], ['#FF9500','#C97200'], ['#2ECC71','#27AE60'],
];

// ══════════════════════════════════════════════════════════════════
//  BACKGROUND — 5 stacked gradients that crossfade
// ══════════════════════════════════════════════════════════════════
function MovieBackground({ op0, op1, op2, op3, op4 }) {
  const a0 = useAnimatedStyle(() => ({ opacity: op0.value }));
  const a1 = useAnimatedStyle(() => ({ opacity: op1.value }));
  const a2 = useAnimatedStyle(() => ({ opacity: op2.value }));
  const a3 = useAnimatedStyle(() => ({ opacity: op3.value }));
  const a4 = useAnimatedStyle(() => ({ opacity: op4.value }));
  return (
    <>
      {[a0,a1,a2,a3,a4].map((anim, i) => (
        <Animated.View key={i} style={[StyleSheet.absoluteFill, anim]}>
          <LinearGradient colors={BG[i]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DRIFTING CLOUD
// ══════════════════════════════════════════════════════════════════
function Cloud({ top, startX, speed, scale = 1 }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(SW + 200, { duration: speed, easing: Easing.linear }),
        withTiming(-200, { duration: 0 }),
      ), -1, false,
    );
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const w = 120 * scale, h = 44 * scale;
  return (
    <Animated.View style={[StyleSheet.flatten({ position: 'absolute', top }), s]}>
      <View style={{ width: w, height: h, backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: h / 2 }} />
      <View style={{ position:'absolute', left:w*0.06, top:-h*0.45, width:h*1.1, height:h*1.1, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:999 }} />
      <View style={{ position:'absolute', left:w*0.35, top:-h*0.75, width:h*1.5, height:h*1.5, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:999 }} />
      <View style={{ position:'absolute', left:w*0.65, top:-h*0.45, width:h*1.1, height:h*1.1, backgroundColor:'rgba(255,255,255,0.75)', borderRadius:999 }} />
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  FALLING PARTICLE  (stars, confetti, sparkles)
// ══════════════════════════════════════════════════════════════════
function FallParticle({ emoji, x, delay, dur, size = 22 }) {
  const y   = useSharedValue(-60);
  const op  = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withSequence(withTiming(SH * 0.65, { duration: dur, easing: Easing.linear }), withTiming(-60, { duration: 0 })),
      -1, false,
    ));
    op.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1,{duration:300}), withTiming(1,{duration:dur-600}), withTiming(0,{duration:300}), withTiming(0,{duration:0})),
      -1, false,
    ));
    rot.value = withRepeat(withTiming(360, { duration: dur * 0.7, easing: Easing.linear }), -1, false);
  }, []);
  const anim = useAnimatedStyle(() => ({
    position: 'absolute', left: x, top: 0,
    opacity: op.value,
    transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }],
  }));
  return <Animated.Text style={[anim, { fontSize: size }]}>{emoji}</Animated.Text>;
}

// Per-chapter ambient particles
const PARTICLES = [
  // ch0 welcome
  [
    { emoji:'⭐', x:SW*0.06, delay:0,    dur:3800, size:22 },
    { emoji:'✨', x:SW*0.80, delay:900,  dur:4800, size:20 },
    { emoji:'🌟', x:SW*0.43, delay:1800, dur:4200, size:22 },
    { emoji:'💫', x:SW*0.62, delay:400,  dur:3500, size:18 },
    { emoji:'⭐', x:SW*0.25, delay:1300, dur:5000, size:20 },
  ],
  // ch1 spell
  [
    { emoji:'☀️', x:SW*0.06, delay:0,    dur:6000, size:24 },
    { emoji:'✏️', x:SW*0.78, delay:1100, dur:5200, size:20 },
    { emoji:'⭐', x:SW*0.48, delay:600,  dur:4600, size:18 },
  ],
  // ch2 match
  [
    { emoji:'🌟', x:SW*0.06, delay:0,    dur:5000, size:22 },
    { emoji:'💜', x:SW*0.80, delay:700,  dur:4500, size:20 },
    { emoji:'✨', x:SW*0.46, delay:1400, dur:3800, size:18 },
  ],
  // ch3 build
  [
    { emoji:'💡', x:SW*0.06, delay:0,    dur:5400, size:22 },
    { emoji:'⭐', x:SW*0.76, delay:800,  dur:4800, size:20 },
    { emoji:'✨', x:SW*0.44, delay:400,  dur:4200, size:18 },
  ],
  // ch4 stars — more particles
  [
    { emoji:'⭐', x:SW*0.06, delay:0,    dur:2400, size:26 },
    { emoji:'🌟', x:SW*0.28, delay:300,  dur:2800, size:24 },
    { emoji:'✨', x:SW*0.52, delay:700,  dur:2600, size:22 },
    { emoji:'⭐', x:SW*0.74, delay:200,  dur:3000, size:26 },
    { emoji:'💫', x:SW*0.90, delay:500,  dur:2800, size:20 },
    { emoji:'🌟', x:SW*0.15, delay:1000, dur:2500, size:22 },
  ],
];

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
function Lexie({ mood = 'wave', size = 110 }) {
  const by = useSharedValue(0);
  const wr = useSharedValue(0);
  const sy = useSharedValue(1);
  const sx = useSharedValue(1);
  const so = useSharedValue(0);
  const MOOD_C = {
    wave:['#FF9A3C','#FF6B35'], excited:['#FF6B6B','#FF4757'],
    think:['#54A0FF','#2E86DE'], happy:['#2ECC71','#27AE60'], celebrate:['#A855F7','#7C3AED'],
  };
  useEffect(() => {
    cancelAnimation(by); cancelAnimation(wr); cancelAnimation(sy); cancelAnimation(sx); cancelAnimation(so);
    wr.value=0; sy.value=1; sx.value=1; so.value=0;
    by.value = withRepeat(withSequence(
      withTiming(-13,{duration:600,easing:Easing.inOut(Easing.ease)}),
      withTiming(0,  {duration:600,easing:Easing.inOut(Easing.ease)}),
    ),-1,true);
    if (mood==='wave')      wr.value = withRepeat(withSequence(withTiming(28,{duration:320}),withTiming(-8,{duration:280}),withTiming(0,{duration:200}),withTiming(0,{duration:700})),-1,false);
    if (mood==='celebrate') { sy.value=withRepeat(withSequence(withTiming(1.18,{duration:220}),withTiming(0.88,{duration:180}),withTiming(1,{duration:180})),-1,false); sx.value=withRepeat(withSequence(withTiming(0.88,{duration:220}),withTiming(1.12,{duration:180}),withTiming(1,{duration:180})),-1,false); so.value=withRepeat(withSequence(withTiming(1,{duration:400}),withTiming(0.2,{duration:400})),-1,true); }
    if (mood==='excited')   sy.value=withRepeat(withSequence(withTiming(1.12,{duration:260}),withTiming(0.9,{duration:200}),withTiming(1,{duration:160}),withTiming(1,{duration:300})),-1,false);
  }, [mood]);
  const ba = useAnimatedStyle(() => ({ transform:[{translateY:by.value},{scaleY:sy.value},{scaleX:sx.value}] }));
  const wa = useAnimatedStyle(() => ({ transform:[{rotate:`${wr.value}deg`}] }));
  const sa = useAnimatedStyle(() => ({ opacity: so.value }));
  const mc = MOOD_C[mood] || MOOD_C.wave;
  return (
    <View style={{alignItems:'center',width:size+64}}>
      <Animated.View style={[{alignItems:'center'},ba]}>
        <Text style={{fontSize:size*0.28,position:'absolute',top:-size*0.24,zIndex:2}}>🎓</Text>
        <LinearGradient colors={mc} style={[lx.body,{width:size,height:size,borderRadius:size/2}]}>
          <View style={[lx.ear,{left:size*0.1,top:-size*0.09}]} />
          <View style={[lx.ear,{right:size*0.1,top:-size*0.09}]} />
          <View style={[lx.eyes,{gap:size*0.12}]}>
            {[0,1].map(i=>(
              <View key={i} style={[lx.eye,{width:size*0.22,height:size*0.22,borderRadius:size*0.11}]}>
                <View style={[lx.pupil,{width:size*0.12,height:size*0.12,borderRadius:size*0.06}]}/>
                <View style={lx.shine}/>
              </View>
            ))}
          </View>
          <View style={[lx.beak,{borderLeftWidth:size*0.09,borderRightWidth:size*0.09,borderTopWidth:size*0.13}]}/>
          <View style={[lx.cheek,{left:size*0.1,bottom:size*0.26}]}/>
          <View style={[lx.cheek,{right:size*0.1,bottom:size*0.26}]}/>
          <View style={[lx.belly,{width:size*0.55,height:size*0.38,bottom:size*0.04}]}/>
        </LinearGradient>
        {mood==='wave'      && <Animated.Text style={[{position:'absolute',right:-30,top:size*0.18,fontSize:size*0.32},wa]}>👋</Animated.Text>}
        {mood==='think'     && <Text style={{position:'absolute',right:-28,top:size*0.15,fontSize:size*0.3}}>🤔</Text>}
        {mood==='happy'     && <Text style={{position:'absolute',right:-28,top:size*0.15,fontSize:size*0.3}}>👍</Text>}
        {mood==='excited'   && <Text style={{position:'absolute',right:-28,top:size*0.15,fontSize:size*0.3}}>🤩</Text>}
        {mood==='celebrate' && (
          <>
            <Animated.Text style={[{position:'absolute',left:-22,top:-12,fontSize:24},sa]}>⭐</Animated.Text>
            <Animated.Text style={[{position:'absolute',right:-22,top:-10,fontSize:20},sa]}>✨</Animated.Text>
            <Text style={{position:'absolute',right:-28,top:size*0.18,fontSize:size*0.3}}>🎉</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DEMO TILE
// ══════════════════════════════════════════════════════════════════
function Tile({ letter, ci=0, delay=0, isMatch=false, revealed=false, size=62 }) {
  const sc  = useSharedValue(0);
  const wob = useSharedValue(0);
  useEffect(() => {
    if (revealed) {
      sc.value = withDelay(delay, withSpring(1,{damping:6,stiffness:100}));
      if (isMatch) wob.value = withDelay(delay+400, withRepeat(withSequence(withTiming(-7,{duration:280}),withTiming(7,{duration:280}),withTiming(0,{duration:140})),-1,false));
    }
  }, [revealed]);
  const anim = useAnimatedStyle(() => ({transform:[{scale:sc.value},{rotate:`${wob.value}deg`}]}));
  const [bg,dk] = TILE_C[ci%TILE_C.length];
  return (
    <Animated.View style={anim}>
      <View style={{position:'absolute',width:size,height:size,borderRadius:13,top:4,left:3,backgroundColor:isMatch?'#B7950B':dk}}/>
      <LinearGradient colors={isMatch?['#FFE066','#FFD700']:[bg,dk]} style={{width:size,height:size,borderRadius:13,borderWidth:3,borderColor:isMatch?'#B7950B':'rgba(0,0,0,0.20)',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        <View style={{position:'absolute',top:4,left:4,width:14,height:8,backgroundColor:'rgba(255,255,255,0.55)',borderRadius:5,transform:[{rotate:'-20deg'}]}}/>
        <Text style={{fontFamily:'Nunito_800ExtraBold',fontSize:size*0.42,color:isMatch?'#7B5200':'#fff',textShadowColor:'rgba(0,0,0,0.30)',textShadowOffset:{width:1,height:1},textShadowRadius:2}}>{letter}</Text>
        {isMatch && <Text style={{position:'absolute',top:1,right:2,fontSize:9}}>⭐</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CHAPTER DEMOS (auto-animated, no user input)
// ══════════════════════════════════════════════════════════════════

function Ch0_Welcome() {
  const [rev, setRev] = useState(false);
  const titleS = useSharedValue(0);
  useEffect(() => {
    titleS.value = withSpring(1, {damping:7,stiffness:80});
    const t = setTimeout(() => {
      setRev(true);
    }, 300);
    return () => clearTimeout(t);
  }, []);
  const ta = useAnimatedStyle(() => ({transform:[{scale:titleS.value}]}));
  return (
    <View style={dm.center}>
      <Animated.View style={[dm.titleBadge, ta]}>
        <Text style={dm.titleEmoji}>🦉</Text>
        <Text style={dm.titleBig}>WORD MATCH</Text>
        <Text style={dm.titleSub}>K I D S</Text>
      </Animated.View>
      <View style={{flexDirection:'row',gap:8,marginTop:16}}>
        {['W','O','R','D'].map((l,i) => <Tile key={i} letter={l} ci={i} delay={400+i*150} revealed={rev} size={58}/>)}
      </View>
      <View style={{flexDirection:'row',gap:7,marginTop:8}}>
        {['M','A','T','C','H'].map((l,i) => <Tile key={i} letter={l} ci={i+4} delay={600+i*130} revealed={rev} size={50}/>)}
      </View>
    </View>
  );
}

function Ch1_Spell({ sfxRef }) {
  const [rev, setRev] = useState(false);
  const catS = useSharedValue(0);
  const checkS = useSharedValue(0);
  useEffect(() => {
    catS.value = withSpring(1,{damping:6,stiffness:90});
    const t1 = setTimeout(() => {
      setRev(true);
      [0,1,2].forEach(i => setTimeout(() => playSfx(sfxRef,'tile_tap'), i*260));
    }, 700);
    const t2 = setTimeout(() => {
      checkS.value = withSpring(1,{damping:5,stiffness:80});
      playSfx(sfxRef,'word_correct');
    }, 700 + 3*260 + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const ca = useAnimatedStyle(() => ({transform:[{scale:catS.value}]}));
  const ck = useAnimatedStyle(() => ({transform:[{scale:checkS.value}],opacity:checkS.value}));
  return (
    <View style={dm.center}>
      <View style={dm.picFrame}>
        <Animated.Text style={[{fontSize:68},ca]}>🐱</Animated.Text>
        <Text style={dm.picHint}>What is this?</Text>
      </View>
      <View style={{flexDirection:'row',gap:10,marginTop:12}}>
        {['C','A','T'].map((l,i)=> <Tile key={i} letter={l} ci={i} delay={700+i*260} revealed={rev} size={64}/>)}
      </View>
      <Animated.View style={[dm.badge, ck]}>
        <Text style={dm.badgeTxt}>✅  C - A - T = Cat!</Text>
      </Animated.View>
    </View>
  );
}

function Ch2_Match({ sfxRef }) {
  const [rev, setRev] = useState(false);
  const beamOp = useSharedValue(0);
  const beamSc = useSharedValue(0.5);
  useEffect(() => {
    const t1 = setTimeout(() => {
      setRev(true);
      [0,1,2,3,4,5].forEach(i => setTimeout(() => playSfx(sfxRef,'tile_tap'), i*160+80));
    }, 400);
    const t2 = setTimeout(() => {
      beamOp.value = withTiming(1,{duration:400});
      beamSc.value = withSpring(1,{damping:7});
      playSfx(sfxRef,'word_correct');
    }, 400+6*160+500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const ba = useAnimatedStyle(() => ({opacity:beamOp.value,transform:[{scale:beamSc.value}]}));
  const row = (w,d) => w.split('').map((l,i) => <Tile key={i} letter={l} ci={i} delay={d+i*160} isMatch={l==='A'} revealed={rev} size={60}/>);
  return (
    <View style={dm.center}>
      <View style={{flexDirection:'row',gap:9}}>{row('CAT',400)}</View>
      <Animated.View style={[dm.beam, ba]}>
        <Text style={dm.beamTxt}>⚡  Same letter!  ⚡</Text>
      </Animated.View>
      <View style={{flexDirection:'row',gap:9}}>{row('HAT',400+3*160+320)}</View>
    </View>
  );
}

function Ch3_Build({ sfxRef }) {
  const [phase, setPhase] = useState(0);
  const resultS = useSharedValue(0);
  const arrowOp = useSharedValue(0);
  useEffect(() => {
    const t1 = setTimeout(() => { setPhase(1); playSfx(sfxRef,'tile_tap'); }, 400);
    const t2 = setTimeout(() => { arrowOp.value=withTiming(1,{duration:350}); }, 1500);
    const t3 = setTimeout(() => {
      setPhase(2);
      resultS.value = withSpring(1,{damping:5,stiffness:80});
      playSfx(sfxRef,'word_correct');
    }, 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const ra = useAnimatedStyle(() => ({transform:[{scale:resultS.value}],opacity:resultS.value}));
  const aa = useAnimatedStyle(() => ({opacity:arrowOp.value}));
  return (
    <View style={dm.center}>
      <Text style={dm.smallLabel}>Matched letters:</Text>
      {phase>=1 && (
        <View style={{flexDirection:'row',gap:14}}>
          <Tile letter="A" ci={1} delay={0}   revealed isMatch size={68}/>
          <Tile letter="T" ci={2} delay={220} revealed isMatch size={68}/>
        </View>
      )}
      <Animated.Text style={[dm.arrow, aa]}>↓  combine!  ↓</Animated.Text>
      {phase>=2 && (
        <Animated.View style={[dm.resultBox, ra]}>
          <Text style={dm.resultTxt}>" AT "</Text>
          <Text style={{fontSize:30}}>⭐</Text>
        </Animated.View>
      )}
    </View>
  );
}

// StarFall must be its own component — hooks cannot be called inside .map()
function StarFall({ emoji, offsetX, index, sfxRef }) {
  const op = useSharedValue(0);
  const y  = useSharedValue(40);
  useEffect(() => {
    const d = index * 320;
    op.value = withDelay(d, withRepeat(withSequence(withTiming(1,{duration:380}),withTiming(0.2,{duration:380})),-1,true));
    y.value  = withDelay(d, withRepeat(withSequence(withTiming(-70,{duration:1000,easing:Easing.out(Easing.quad)}),withTiming(40,{duration:0})),-1,false));
    setTimeout(() => playSfx(sfxRef,'star_earned'), d);
  }, []);
  const anim = useAnimatedStyle(() => ({opacity:op.value,transform:[{translateY:y.value},{translateX:offsetX}]}));
  return <Animated.Text style={[{fontSize:32,position:'absolute',top:24},anim]}>{emoji}</Animated.Text>;
}

const STAR_FALLS = [
  {emoji:'⭐',offsetX:-80},{emoji:'🌟',offsetX:-42},{emoji:'⭐',offsetX:-4},
  {emoji:'✨',offsetX:34}, {emoji:'⭐',offsetX:72}, {emoji:'🌟',offsetX:-62},
];

function Ch4_Stars({ sfxRef }) {
  const s1 = useSharedValue(0);
  const s2 = useSharedValue(0);
  const s3 = useSharedValue(0);
  const lbS = useSharedValue(0);
  useEffect(() => {
    const t1 = setTimeout(() => { s1.value=withSpring(1,{damping:5}); playSfx(sfxRef,'star_earned'); }, 400);
    const t2 = setTimeout(() => { s2.value=withSpring(1,{damping:5}); playSfx(sfxRef,'star_earned'); }, 1200);
    const t3 = setTimeout(() => { s3.value=withSpring(1,{damping:5}); playSfx(sfxRef,'star_earned'); }, 2000);
    const t4 = setTimeout(() => { lbS.value=withSpring(1,{damping:6}); playSfx(sfxRef,'level_complete'); }, 2600);
    return () => { clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4); };
  }, []);
  const a1 = useAnimatedStyle(()=>({transform:[{scale:s1.value}],opacity:s1.value}));
  const a2 = useAnimatedStyle(()=>({transform:[{scale:s2.value}],opacity:s2.value}));
  const a3 = useAnimatedStyle(()=>({transform:[{scale:s3.value}],opacity:s3.value}));
  const la = useAnimatedStyle(()=>({transform:[{scale:lbS.value}],opacity:lbS.value}));
  return (
    <View style={dm.center}>
      <View style={[dm.center,{height:110}]}>
        {STAR_FALLS.map((d,i)=><StarFall key={i} index={i} emoji={d.emoji} offsetX={d.offsetX} sfxRef={sfxRef}/>)}
      </View>
      <View style={{flexDirection:'row',gap:12,marginTop:8}}>
        {[a1,a2,a3].map((a,i)=><Animated.Text key={i} style={[{fontSize:52},a]}>⭐</Animated.Text>)}
      </View>
      <Animated.View style={[dm.legendBadge, la]}>
        <Text style={dm.legendTxt}>🏆  LEGEND LEVEL!  🏆</Text>
      </Animated.View>
    </View>
  );
}

function ChapterDemo({ chapter, sfxRef }) {
  if (chapter===0) return <Ch0_Welcome/>;
  if (chapter===1) return <Ch1_Spell sfxRef={sfxRef}/>;
  if (chapter===2) return <Ch2_Match sfxRef={sfxRef}/>;
  if (chapter===3) return <Ch3_Build sfxRef={sfxRef}/>;
  if (chapter===4) return <Ch4_Stars sfxRef={sfxRef}/>;
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  CHAPTER LABEL (big phase header)
// ══════════════════════════════════════════════════════════════════
function ChapterLabel({ text }) {
  const sc = useSharedValue(0);
  const op = useSharedValue(0);
  useEffect(() => {
    if (!text) return;
    sc.value = 0; op.value = 0;
    sc.value = withSpring(1,{damping:8,stiffness:120});
    op.value = withTiming(1,{duration:350});
  }, [text]);
  const anim = useAnimatedStyle(() => ({transform:[{scale:sc.value}],opacity:op.value}));
  if (!text) return null;
  return (
    <Animated.View style={[cl.badge, anim]}>
      <Text style={cl.text}>{text}</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function IntroScreen({ navigation }) {
  const [chapter, setChapter]   = useState(0);   // 0-4 = playing, 5 = end
  const [visible, setVisible]   = useState(true); // content visibility (for crossfade)
  const sfxRef    = useRef({});
  const autoTimer = useRef(null);
  const busy      = useRef(false);

  // 5 background opacities for smooth crossfade
  const bg0 = useSharedValue(1);
  const bg1 = useSharedValue(0);
  const bg2 = useSharedValue(0);
  const bg3 = useSharedValue(0);
  const bg4 = useSharedValue(0);
  const bgOps = [bg0, bg1, bg2, bg3, bg4];

  // Content fade
  const contentOp = useSharedValue(1);
  const contentY  = useSharedValue(0);

  // Lexie entrance
  const lexieY = useSharedValue(80);
  const lexieS = useSharedValue(0.4);

  // Play button
  const playS = useSharedValue(0);

  // Load sounds
  useEffect(() => {
    loadSounds().then(l => { sfxRef.current = l; });
    return () => {
      Speech.stop();
      Object.values(sfxRef.current).forEach(s => { try { s.unloadAsync(); } catch {} });
    };
  }, []);

  // Fixed durations per chapter (primary advance mechanism — not speech.onDone)
  const CHAPTER_MS = [6000, 7500, 7500, 7000, 7500];

  // ── Chapter enter ──────────────────────────────────────────────
  useEffect(() => {
    if (chapter >= 5) {
      playS.value = withSpring(1, { damping: 6, stiffness: 100 });
      return;
    }
    busy.current = false;

    // Fade in content
    contentOp.value = 0;
    contentOp.value = withTiming(1, { duration: 500 });
    contentY.value  = 0;

    // Lexie entrance
    lexieY.value = 80; lexieS.value = 0.4;
    lexieY.value = withSpring(0, { damping: 14, stiffness: 100 });
    lexieS.value = withSpring(1, { damping: 8,  stiffness: 100 });

    // Narrate (fire and forget — do NOT depend on onDone)
    Speech.stop();
    const sTimer = setTimeout(() => {
      Speech.speak(NARRATION[chapter], { pitch: 1.18, rate: 0.80 });
    }, 500);

    // PRIMARY auto-advance: fixed timer — reliable on all devices
    if (autoTimer.current) clearTimeout(autoTimer.current);
    autoTimer.current = setTimeout(() => advanceChapter(), CHAPTER_MS[chapter]);

    return () => {
      clearTimeout(sTimer);
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [chapter]);

  // ── Advance to next chapter with crossfade ─────────────────────
  const advanceChapter = () => {
    if (busy.current) return;
    busy.current = true;
    Speech.stop();
    if (autoTimer.current) clearTimeout(autoTimer.current);

    const next = chapter + 1;

    // Fade out content
    contentOp.value = withTiming(0, { duration: 280 });
    contentY.value  = withTiming(-20, { duration: 280 });

    // Start bg crossfade simultaneously
    if (chapter < 4) {
      bgOps[chapter].value = withTiming(0, { duration: 600 });
      bgOps[next < 5 ? next : 4].value = withTiming(1, { duration: 600 });
    }

    // Switch chapter after fade-out
    setTimeout(() => {
      if (next >= 5) {
        // Finished — show Home
        AsyncStorage.setItem(INTRO_KEY, '1').then(() => setChapter(5));
      } else {
        setChapter(next);
      }
      contentY.value  = 20;
      contentOp.value = withTiming(1, { duration: 350 });
      contentY.value  = withSpring(0, { damping: 14 });
    }, 300);
  };

  const handleSkip = () => {
    Speech.stop();
    if (autoTimer.current) clearTimeout(autoTimer.current);
    AsyncStorage.setItem(INTRO_KEY, '1').then(() => navigation.replace('Home'));
  };

  const handlePlay = () => {
    Speech.stop();
    navigation.replace('Home');
  };

  const contentAnim = useAnimatedStyle(() => ({
    opacity: contentOp.value,
    transform: [{ translateY: contentY.value }],
  }));
  const lexieAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: lexieY.value }, { scale: lexieS.value }],
  }));
  const playAnim = useAnimatedStyle(() => ({
    transform: [{ scale: playS.value }],
    opacity: playS.value,
  }));

  const isDone = chapter >= 5;

  return (
    <View style={{ flex: 1 }}>
      {/* ── Crossfading backgrounds ── */}
      <MovieBackground op0={bg0} op1={bg1} op2={bg2} op3={bg3} op4={bg4} />

      {/* ── Ambient particles ── */}
      {chapter < 5 && PARTICLES[chapter].map((p, i) => (
        <FallParticle key={`${chapter}-${i}`} {...p} />
      ))}

      {/* ── Drifting clouds ── */}
      <Cloud top={50}  startX={SW * 0.3}  speed={22000} scale={0.9} />
      <Cloud top={120} startX={-180}       speed={30000} scale={0.65} />

      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Top bar: skip + chapter dots ── */}
        <View style={s.topBar}>
          <View style={s.dots}>
            {[0,1,2,3,4].map(i => (
              <View key={i} style={[s.dot, i === (isDone ? 4 : chapter) && s.dotActive]} />
            ))}
          </View>
          {!isDone && (
            <Pressable style={s.skipBtn} onPress={handleSkip}>
              <Text style={s.skipTxt}>Skip ›</Text>
            </Pressable>
          )}
        </View>

        {/* ── Animated content ── */}
        {!isDone && (
          <Animated.View style={[{ flex: 1 }, contentAnim]}>

            {/* Chapter label */}
            <View style={s.labelRow}>
              <ChapterLabel text={LABELS[chapter]} />
            </View>

            {/* Demo fills the middle */}
            <View style={s.demoArea}>
              <ChapterDemo key={`ch-${chapter}`} chapter={chapter} sfxRef={sfxRef} />
            </View>

            {/* Lexie + speech bubble */}
            <View style={s.charArea}>
              <SpeechBubble text={SPEECHES[chapter]} />
              <Animated.View style={[{ alignItems: 'center' }, lexieAnim]}>
                <Lexie mood={MOODS[chapter]} size={SIZES[chapter]} />
              </Animated.View>
            </View>

          </Animated.View>
        )}

        {/* ── END: LET'S PLAY button ── */}
        {isDone && (
          <View style={s.endScreen}>
            <Animated.View style={[{ alignItems: 'center' }, lexieAnim]}>
              <Lexie mood="celebrate" size={160} />
            </Animated.View>
            <Animated.View style={[s.playBtnWrap, playAnim]}>
              <Pressable style={s.playBtn} onPress={handlePlay}>
                <LinearGradient colors={['#22C55E','#16A34A']} style={s.playBtnGrad}>
                  <Text style={s.playTxt}>🎮  LET'S PLAY!</Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        )}

      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const lx = StyleSheet.create({
  body:  { alignItems:'center', justifyContent:'center', borderWidth:3.5, borderColor:'rgba(0,0,0,0.15)', overflow:'visible' },
  ear:   { position:'absolute', width:18, height:24, backgroundColor:'rgba(255,255,255,0.32)', borderRadius:9 },
  eyes:  { flexDirection:'row', marginBottom:4, marginTop:6 },
  eye:   { backgroundColor:'white', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  pupil: { backgroundColor:'#1A1A2E' },
  shine: { position:'absolute', top:3, left:3, width:5, height:5, borderRadius:3, backgroundColor:'rgba(255,255,255,0.9)' },
  beak:  { borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:'#F59E0B', marginTop:2 },
  cheek: { position:'absolute', width:16, height:10, borderRadius:8, backgroundColor:'rgba(255,180,100,0.55)' },
  belly: { position:'absolute', backgroundColor:'rgba(255,255,255,0.20)', borderTopLeftRadius:999, borderTopRightRadius:999 },
});

const sb = StyleSheet.create({
  bubble: {
    backgroundColor:'white', borderRadius:24,
    paddingHorizontal:20, paddingVertical:12,
    marginHorizontal:30, marginBottom:12,
    shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.20, shadowRadius:10, elevation:8,
    alignItems:'center', borderWidth:2.5, borderColor:'rgba(0,0,0,0.06)',
  },
  text: { fontFamily:'Nunito_800ExtraBold', fontSize:16, color:'#1E3A5F', textAlign:'center', lineHeight:25 },
  tail: {
    position:'absolute', bottom:-17, alignSelf:'center',
    width:0, height:0,
    borderLeftWidth:13, borderRightWidth:13, borderTopWidth:17,
    borderLeftColor:'transparent', borderRightColor:'transparent', borderTopColor:'white',
  },
});

const cl = StyleSheet.create({
  badge: {
    backgroundColor:'rgba(0,0,0,0.28)', borderRadius:30,
    paddingHorizontal:20, paddingVertical:8,
    borderWidth:2, borderColor:'rgba(255,255,255,0.30)',
  },
  text: {
    fontFamily:'Nunito_800ExtraBold', fontSize:18, color:'white', textAlign:'center',
    textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:2}, textShadowRadius:4,
  },
});

const dm = StyleSheet.create({
  center:     { alignItems:'center', width:'100%', gap:10 },
  titleBadge: {
    alignItems:'center', backgroundColor:'rgba(0,0,0,0.32)', borderRadius:28,
    paddingHorizontal:28, paddingVertical:14, gap:4,
    borderWidth:2.5, borderColor:'rgba(255,255,255,0.35)',
    shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.35, shadowRadius:12, elevation:10,
  },
  titleEmoji: { fontSize:38 },
  titleBig:   { fontFamily:'Nunito_800ExtraBold', fontSize:26, color:'white', letterSpacing:3,
                textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:2,height:2}, textShadowRadius:6 },
  titleSub:   { fontFamily:'Nunito_800ExtraBold', fontSize:16, color:'rgba(255,255,200,0.9)', letterSpacing:8 },
  picFrame:   {
    backgroundColor:'rgba(255,255,255,0.90)', borderRadius:24,
    paddingHorizontal:28, paddingVertical:12, alignItems:'center', gap:4,
    borderWidth:3, borderColor:'rgba(0,0,0,0.08)',
    shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.15, shadowRadius:8, elevation:6,
  },
  picHint:    { fontFamily:'Nunito_700Bold', fontSize:13, color:'#374151' },
  badge:      {
    marginTop:4, backgroundColor:'rgba(255,255,255,0.92)', borderRadius:22,
    paddingHorizontal:18, paddingVertical:8, borderWidth:2, borderColor:'#10B981',
    shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.15, shadowRadius:6, elevation:4,
  },
  badgeTxt:   { fontFamily:'Nunito_800ExtraBold', fontSize:15, color:'#065F46' },
  beam:       {
    backgroundColor:'rgba(255,220,0,0.22)', borderRadius:22,
    paddingHorizontal:18, paddingVertical:7,
    borderWidth:2, borderColor:'rgba(255,215,0,0.65)',
  },
  beamTxt:    {
    fontFamily:'Nunito_800ExtraBold', fontSize:14, color:'#FFD700',
    textShadowColor:'rgba(0,0,0,0.55)', textShadowOffset:{width:1,height:1}, textShadowRadius:3,
  },
  smallLabel: {
    fontFamily:'Nunito_700Bold', fontSize:14, color:'rgba(255,255,255,0.92)',
    textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:1}, textShadowRadius:3,
  },
  arrow:      {
    fontFamily:'Nunito_700Bold', fontSize:15, color:'rgba(255,255,255,0.90)',
    textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:1}, textShadowRadius:3,
  },
  resultBox:  {
    flexDirection:'row', alignItems:'center', gap:10,
    backgroundColor:'rgba(255,255,255,0.94)', borderRadius:24,
    paddingHorizontal:26, paddingVertical:12,
    borderWidth:3, borderColor:'#10B981',
    shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.20, shadowRadius:8, elevation:8,
  },
  resultTxt:  { fontFamily:'Nunito_800ExtraBold', fontSize:32, color:'#065F46' },
  legendBadge:{
    marginTop:6, backgroundColor:'rgba(0,0,0,0.35)', borderRadius:26,
    paddingHorizontal:22, paddingVertical:10,
    borderWidth:2, borderColor:'rgba(255,215,0,0.60)',
  },
  legendTxt:  {
    fontFamily:'Nunito_800ExtraBold', fontSize:16, color:'#FFD700',
    textShadowColor:'rgba(0,0,0,0.5)', textShadowOffset:{width:1,height:1}, textShadowRadius:3,
  },
});

const s = StyleSheet.create({
  topBar:    { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:18, paddingTop:4, paddingBottom:2 },
  dots:      { flexDirection:'row', gap:7 },
  dot:       { width:9, height:9, borderRadius:5, backgroundColor:'rgba(255,255,255,0.38)' },
  dotActive: { backgroundColor:'white', width:26, borderRadius:5 },
  skipBtn:   { paddingHorizontal:14, paddingVertical:6, backgroundColor:'rgba(0,0,0,0.28)', borderRadius:20 },
  skipTxt:   { fontFamily:'Nunito_700Bold', fontSize:13, color:'rgba(255,255,255,0.92)' },
  labelRow:  { alignItems:'center', paddingTop:6, paddingBottom:4, minHeight:50, justifyContent:'center' },
  demoArea:  { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:20 },
  charArea:  { paddingHorizontal:14, paddingTop:4, paddingBottom:8, alignItems:'center' },
  endScreen: { flex:1, alignItems:'center', justifyContent:'center', gap:28 },
  playBtnWrap: { width:SW * 0.80 },
  playBtn:   {
    borderRadius:36, overflow:'hidden',
    shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.3, shadowRadius:12, elevation:12,
  },
  playBtnGrad: { paddingVertical:20, alignItems:'center', borderRadius:36 },
  playTxt:   { fontFamily:'Nunito_800ExtraBold', fontSize:24, color:'white', letterSpacing:1 },
});
