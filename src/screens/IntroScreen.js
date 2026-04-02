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

const { width: SW } = Dimensions.get('window');
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
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
  } catch {}
  const loaded = {};
  for (const [k, src] of Object.entries(SFX_SOURCES)) {
    try {
      const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false });
      loaded[k] = sound;
    } catch {}
  }
  return loaded;
}

async function playSfx(sfxRef, key) {
  try {
    const s = sfxRef.current[key];
    if (!s) return;
    await s.setPositionAsync(0);
    await s.playAsync();
  } catch {}
}

// ─── Narration ────────────────────────────────────────────────────
const NARRATION = [
  "Hi there! I'm Lexie the owl! Welcome to Word Match Kids! Get ready for a fun spelling adventure!",
  "Step one. Spell! You will see a picture. Tap the letters to spell the word! Watch. C... A... T... Cat! Great job!",
  "Step two. Match! Look at both words and find the same letters. See how the letter A appears in both CAT and HAT? Those letters glow gold!",
  "Step three. Build! Use those matching letters to build brand new words! A and T can make... AT! The more words you build, the more points you score!",
  "You are all set! Complete levels to earn up to three stars each! Can you become a Word Match legend? Let's play!",
];

const DURATIONS = [5500, 7000, 7500, 7000, 5500];

const SCENES = [
  { id:'welcome', bg:['#56CCF2','#2F80ED','#1A6FBD'], title:"Hi! I'm Lexie! 👋",        body:"Welcome to\nWord Match Kids!", mood:'wave',      demo:null },
  { id:'spell',   bg:['#FFECD2','#FCB69F','#F48B6F'], title:"Step 1 — SPELL ✏️",        body:"See a picture,\nspell the word!",  mood:'excited',  demo:{ type:'spell', word:'CAT', emoji:'🐱' } },
  { id:'match',   bg:['#A8EDEA','#FED6E3','#F9A8D4'], title:"Step 2 — MATCH 🔍",        body:"Find letters that\nappear in BOTH!", mood:'think',   demo:{ type:'match', word1:'CAT', word2:'HAT', match:'A' } },
  { id:'build',   bg:['#D4FC79','#96E6A1','#56C97F'], title:"Step 3 — BUILD 🏗️",       body:"Use matched letters\nto make new words!", mood:'happy', demo:{ type:'build', letters:['A','T'], result:'AT' } },
  { id:'stars',   bg:['#FFC3A0','#FFAFBD','#C9A0DC'], title:"Earn Stars & Level Up ⭐", body:"3 stars per level.\nBecome a legend!", mood:'celebrate', demo:{ type:'stars' } },
];

const MOOD_COLORS = {
  wave:      ['#FF9A3C','#FF6B35'],
  excited:   ['#FF6B6B','#FF4757'],
  think:     ['#54A0FF','#2E86DE'],
  happy:     ['#2ECC71','#27AE60'],
  celebrate: ['#A855F7','#7C3AED'],
};

const TC = [
  ['#FF6B6B','#C94B4B'],
  ['#FFD700','#C9A800'],
  ['#4ECDC4','#2EA89E'],
  ['#A855F7','#7B2FBE'],
  ['#FF9500','#C97200'],
];

// ══════════════════════════════════════════════════════════════════
//  LEXIE CHARACTER
// ══════════════════════════════════════════════════════════════════

function LexieCharacter({ mood = 'wave', size = 108 }) {
  const bounceY = useSharedValue(0);
  const waveR   = useSharedValue(0);
  const squishY = useSharedValue(1);
  const squishX = useSharedValue(1);
  const starOp  = useSharedValue(0);

  useEffect(() => {
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration:620, easing:Easing.inOut(Easing.ease) }),
        withTiming(0,   { duration:620, easing:Easing.inOut(Easing.ease) }),
      ), -1, true,
    );
    if (mood === 'wave') {
      waveR.value = withRepeat(
        withSequence(withTiming(28,{duration:320}),withTiming(-8,{duration:280}),withTiming(0,{duration:200}),withTiming(0,{duration:700})),
        -1, false,
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
    transform:[{ translateY:bounceY.value },{ scaleY:squishY.value },{ scaleX:squishX.value }],
  }));
  const waveAnim = useAnimatedStyle(() => ({ transform:[{ rotate:`${waveR.value}deg` }] }));
  const starAnim = useAnimatedStyle(() => ({ opacity:starOp.value }));
  const colors   = MOOD_COLORS[mood] || MOOD_COLORS.wave;

  return (
    <View style={{ alignItems:'center', width:size+64 }}>
      <Animated.View style={[{ alignItems:'center' }, bodyAnim]}>
        <Text style={{ fontSize:size*0.28, position:'absolute', top:-size*0.24, zIndex:2 }}>🎓</Text>
        <LinearGradient colors={colors} style={[ch.body,{ width:size, height:size, borderRadius:size/2 }]}>
          <View style={[ch.ear,{ left:size*0.1,  top:-size*0.09 }]} />
          <View style={[ch.ear,{ right:size*0.1, top:-size*0.09 }]} />
          <View style={[ch.eyes,{ gap:size*0.12 }]}>
            {[0,1].map(i => (
              <View key={i} style={[ch.eye,{ width:size*0.22, height:size*0.22, borderRadius:size*0.11 }]}>
                <View style={[ch.pupil,{ width:size*0.12, height:size*0.12, borderRadius:size*0.06 }]} />
                <View style={ch.eyeShine} />
              </View>
            ))}
          </View>
          <View style={[ch.beak,{ borderLeftWidth:size*0.09, borderRightWidth:size*0.09, borderTopWidth:size*0.13 }]} />
          <View style={[ch.cheek,{ left:size*0.1,  bottom:size*0.26 }]} />
          <View style={[ch.cheek,{ right:size*0.1, bottom:size*0.26 }]} />
          <View style={[ch.belly,{ width:size*0.55, height:size*0.38, bottom:size*0.04 }]} />
        </LinearGradient>
        {mood==='wave'      && <Animated.Text style={[{ position:'absolute',right:-30,top:size*0.18,fontSize:size*0.32 },waveAnim]}>👋</Animated.Text>}
        {mood==='think'     && <Text style={{ position:'absolute',right:-28,top:size*0.15,fontSize:size*0.3 }}>🤔</Text>}
        {mood==='happy'     && <Text style={{ position:'absolute',right:-28,top:size*0.15,fontSize:size*0.3 }}>👍</Text>}
        {mood==='excited'   && <Text style={{ position:'absolute',right:-28,top:size*0.15,fontSize:size*0.3 }}>🤩</Text>}
        {mood==='celebrate' && (
          <>
            <Animated.Text style={[{ position:'absolute',left:-22,top:-12,fontSize:24 },starAnim]}>⭐</Animated.Text>
            <Animated.Text style={[{ position:'absolute',right:-22,top:-10,fontSize:20 },starAnim]}>✨</Animated.Text>
            <Text style={{ position:'absolute',right:-28,top:size*0.18,fontSize:size*0.3 }}>🎉</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DEMO TILE
// ══════════════════════════════════════════════════════════════════

function DemoTile({ letter, ci=0, delay=0, isMatch=false, revealed=false }) {
  const sc  = useSharedValue(0);
  const wob = useSharedValue(0);
  useEffect(() => {
    if (revealed) {
      sc.value = withDelay(delay, withSpring(1,{ damping:6, stiffness:100 }));
      if (isMatch) {
        wob.value = withDelay(delay+400, withRepeat(
          withSequence(withTiming(-7,{duration:280}),withTiming(7,{duration:280}),withTiming(0,{duration:140})),
          -1, false,
        ));
      }
    }
  }, [revealed]);
  const anim = useAnimatedStyle(() => ({ transform:[{ scale:sc.value },{ rotate:`${wob.value}deg` }] }));
  const [bg, dark] = TC[ci % TC.length];
  return (
    <Animated.View style={anim}>
      <View style={[dm.shadow,{ backgroundColor: isMatch?'#B7950B':dark }]} />
      <LinearGradient colors={isMatch?['#FFE066','#FFD700']:[bg,dark]} style={[dm.face, isMatch&&dm.faceMatch]}>
        <View style={dm.shine} />
        <Text style={[dm.letter, isMatch&&{ color:'#7B5200' }]}>{letter}</Text>
        {isMatch && <Text style={dm.sparkle}>⭐</Text>}
      </LinearGradient>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DEMO SCENES
// ══════════════════════════════════════════════════════════════════

function SpellDemo({ word, emoji, sfxRef }) {
  const [rev, setRev] = useState(false);
  const emojiS = useSharedValue(0);
  useEffect(() => {
    emojiS.value = withSpring(1, { damping:6 });
    const t = setTimeout(() => {
      setRev(true);
      word.split('').forEach((_,i) => setTimeout(() => playSfx(sfxRef,'tile_tap'), i*220));
    }, 500);
    return () => clearTimeout(t);
  }, []);
  const ea = useAnimatedStyle(() => ({ transform:[{ scale:emojiS.value }] }));
  return (
    <View style={dm.wrap}>
      <Animated.Text style={[{ fontSize:52, marginBottom:8 }, ea]}>{emoji}</Animated.Text>
      <View style={{ flexDirection:'row', gap:8 }}>
        {word.split('').map((l,i) => <DemoTile key={i} letter={l} ci={i} delay={i*220} revealed={rev} />)}
      </View>
    </View>
  );
}

function MatchDemo({ word1, word2, match, sfxRef }) {
  const [rev, setRev] = useState(false);
  const lineOp  = useSharedValue(0);
  const lineScX = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setRev(true);
      word1.split('').forEach((_,i) => setTimeout(() => playSfx(sfxRef,'tile_tap'), i*160));
      word2.split('').forEach((_,i) => setTimeout(() => playSfx(sfxRef,'tile_tap'), word1.length*160+300+i*160));
      setTimeout(() => {
        lineOp.value  = withTiming(1,{duration:400});
        lineScX.value = withSpring(1,{damping:8});
        playSfx(sfxRef,'word_correct');
      }, (word1.length+word2.length)*160+600);
    }, 400);
    return () => clearTimeout(t);
  }, []);
  const lineAnim = useAnimatedStyle(() => ({ opacity:lineOp.value, transform:[{ scaleX:lineScX.value }] }));
  const row = (word, startD) => word.split('').map((l,i) => (
    <DemoTile key={i} letter={l} ci={i} delay={startD+i*160} isMatch={l===match} revealed={rev} />
  ));
  return (
    <View style={dm.wrap}>
      <Text style={dm.label}>Word 1:</Text>
      <View style={{ flexDirection:'row', gap:7, marginBottom:6 }}>{row(word1,0)}</View>
      <Animated.View style={[dm.matchLine, lineAnim]}>
        <Text style={dm.matchTxt}>⚡ matching letter ⚡</Text>
      </Animated.View>
      <View style={{ flexDirection:'row', gap:7, marginTop:6 }}>{row(word2,word1.length*160+300)}</View>
      <Text style={dm.label}>Word 2:</Text>
    </View>
  );
}

function BuildDemo({ letters, result, sfxRef }) {
  const [phase, setPhase] = useState(0);
  const resultS = useSharedValue(0);
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => {
      setPhase(2);
      resultS.value = withSpring(1,{ damping:5, stiffness:80 });
      playSfx(sfxRef,'word_correct');
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const ra = useAnimatedStyle(() => ({ transform:[{ scale:resultS.value }] }));
  return (
    <View style={dm.wrap}>
      <Text style={dm.label}>Matched letters:</Text>
      <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
        {letters.map((l,i) => <DemoTile key={i} letter={l} ci={1} delay={i*200} revealed isMatch />)}
      </View>
      {phase>=1 && <Text style={[dm.label,{ color:'#166534', fontFamily:'Nunito_800ExtraBold' }]}>Build a word! →</Text>}
      {phase>=2 && (
        <Animated.View style={[dm.result, ra]}>
          <Text style={dm.resultTxt}>"{result}"</Text>
          <Text style={{ fontSize:22 }}>⭐</Text>
        </Animated.View>
      )}
    </View>
  );
}

// Stars demo — animated values defined outside map to follow hooks rules
function StarParticle({ emoji, offset, sfxRef, index }) {
  const op = useSharedValue(0);
  const y  = useSharedValue(50);
  useEffect(() => {
    const delay = index * 280;
    op.value = withDelay(delay, withRepeat(
      withSequence(withTiming(1,{duration:350}),withTiming(0.3,{duration:350})),
      -1, true,
    ));
    y.value = withDelay(delay, withRepeat(
      withSequence(withTiming(-55,{duration:900,easing:Easing.out(Easing.quad)}),withTiming(50,{duration:0})),
      -1, false,
    ));
    setTimeout(() => playSfx(sfxRef,'star_earned'), delay);
  }, []);
  const anim = useAnimatedStyle(() => ({
    opacity: op.value,
    transform:[{ translateY:y.value },{ translateX:offset }],
  }));
  return <Animated.Text style={[{ fontSize:28, position:'absolute', top:30 }, anim]}>{emoji}</Animated.Text>;
}

const STAR_DATA = [
  { emoji:'⭐', offset:-60 },
  { emoji:'🌟', offset:-28 },
  { emoji:'⭐', offset:4   },
  { emoji:'✨', offset:36  },
  { emoji:'⭐', offset:64  },
  { emoji:'🌟', offset:-44 },
];

function StarsDemo({ sfxRef }) {
  return (
    <View style={[dm.wrap,{ height:100 }]}>
      <Text style={[dm.label,{ marginBottom:12 }]}>Collect all the stars! 🏆</Text>
      {STAR_DATA.map((d,i) => (
        <StarParticle key={i} index={i} emoji={d.emoji} offset={d.offset} sfxRef={sfxRef} />
      ))}
    </View>
  );
}

function SceneDemo({ demo, sfxRef }) {
  if (!demo) return null;
  if (demo.type==='spell')  return <SpellDemo  word={demo.word}   emoji={demo.emoji}   sfxRef={sfxRef} />;
  if (demo.type==='match')  return <MatchDemo  word1={demo.word1} word2={demo.word2}   match={demo.match} sfxRef={sfxRef} />;
  if (demo.type==='build')  return <BuildDemo  letters={demo.letters} result={demo.result} sfxRef={sfxRef} />;
  if (demo.type==='stars')  return <StarsDemo  sfxRef={sfxRef} />;
  return null;
}

// ══════════════════════════════════════════════════════════════════
//  PROGRESS BAR
// ══════════════════════════════════════════════════════════════════

function ProgressBar({ sceneIdx, duration, paused, onComplete }) {
  const prog = useSharedValue(0);

  useEffect(() => {
    prog.value = 0;
    if (!paused) {
      prog.value = withTiming(1, { duration, easing:Easing.linear }, (finished) => {
        if (finished) runOnJS(onComplete)();
      });
    }
  }, [sceneIdx]);

  useEffect(() => {
    if (paused) {
      cancelAnimation(prog);
    } else {
      const remaining = (1 - prog.value) * duration;
      if (remaining > 50) {
        prog.value = withTiming(1, { duration:remaining, easing:Easing.linear }, (finished) => {
          if (finished) runOnJS(onComplete)();
        });
      }
    }
  }, [paused]);

  const barStyle = useAnimatedStyle(() => ({ width:`${prog.value * 100}%` }));
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, barStyle]} />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  DRIFTING CLOUD
// ══════════════════════════════════════════════════════════════════

function DriftCloud({ top, startX, speed, opacity }) {
  const x = useSharedValue(startX);
  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(SW+200,{ duration:speed, easing:Easing.linear }),
        withTiming(-200,  { duration:0 }),
      ), -1, false,
    );
  }, []);
  const s = useAnimatedStyle(() => ({ transform:[{ translateX:x.value }] }));
  return (
    <Animated.View style={[cl.wrap,{ top, opacity }, s]}>
      <View style={cl.base} />
      <View style={[cl.puff,{ left:10,top:-20 }]} />
      <View style={[cl.puff,{ left:42,top:-30,width:54,height:54 }]} />
      <View style={[cl.puff,{ left:82,top:-20 }]} />
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════

export default function IntroScreen({ navigation }) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [paused,   setPaused]   = useState(false);
  const sfxRef = useRef({});

  const scene  = SCENES[sceneIdx];
  const isLast = sceneIdx === SCENES.length - 1;

  // Load sounds once
  useEffect(() => {
    loadSounds().then(loaded => { sfxRef.current = loaded; });
    return () => {
      Speech.stop();
      Object.values(sfxRef.current).forEach(s => { try { s.unloadAsync(); } catch {} });
    };
  }, []);

  // Per-scene entrance
  const slideX = useSharedValue(SW);
  const fadeOp = useSharedValue(0);
  const lexieS = useSharedValue(0);

  useEffect(() => {
    slideX.value = SW;
    fadeOp.value = 0;
    lexieS.value = 0;
    slideX.value = withSpring(0,{ damping:16, stiffness:140 });
    fadeOp.value = withTiming(1,{ duration:300 });
    lexieS.value = withDelay(120, withSpring(1,{ damping:6, stiffness:80 }));
    setPaused(false);

    // Narrate
    Speech.stop();
    setTimeout(() => {
      Speech.speak(NARRATION[sceneIdx],{ language:'en-US', pitch:1.15, rate:0.82 });
    }, 500);

    // Level complete sfx on last scene
    if (sceneIdx === SCENES.length - 1) {
      setTimeout(() => playSfx(sfxRef,'level_complete'), 800);
    }
  }, [sceneIdx]);

  const goNext = useCallback(async () => {
    Speech.stop();
    if (isLast) {
      await AsyncStorage.setItem(INTRO_KEY,'1');
      navigation.replace('Home');
    } else {
      setSceneIdx(i => i + 1);
    }
  }, [isLast]);

  const handleSkip = async () => {
    Speech.stop();
    await AsyncStorage.setItem(INTRO_KEY,'1');
    navigation.replace('Home');
  };

  const togglePause = () => {
    setPaused(p => !p);
    // expo-speech pause/resume may not be available on all platforms
    try { paused ? Speech.resume() : Speech.pause(); } catch {}
  };

  const contentAnim = useAnimatedStyle(() => ({ opacity:fadeOp.value, transform:[{ translateX:slideX.value }] }));
  const lexieAnim   = useAnimatedStyle(() => ({ transform:[{ scale:lexieS.value }] }));

  return (
    <View style={s.root}>
      <LinearGradient colors={scene.bg} style={StyleSheet.absoluteFill} />
      <DriftCloud top={55}  startX={-100}     speed={22000} opacity={0.75} />
      <DriftCloud top={130} startX={SW * 0.5} speed={30000} opacity={0.50} />

      <SafeAreaView style={s.safe}>

        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable style={s.iconBtn} onPress={togglePause}>
            <Text style={s.iconTxt}>{paused ? '▶' : '⏸'}</Text>
          </Pressable>
          <View style={s.pill}>
            <Text style={s.pillTxt}>{sceneIdx+1} of {SCENES.length}</Text>
          </View>
          <Pressable style={s.skipBtn} onPress={handleSkip}>
            <Text style={s.skipTxt}>Skip ›</Text>
          </Pressable>
        </View>

        {/* Video progress bar */}
        <ProgressBar
          sceneIdx={sceneIdx}
          duration={DURATIONS[sceneIdx]}
          paused={paused}
          onComplete={goNext}
        />

        <View style={s.body}>
          {/* Lexie */}
          <Animated.View style={lexieAnim}>
            <LexieCharacter mood={scene.mood} size={108} />
          </Animated.View>

          {/* Card */}
          <Animated.View style={[s.card, contentAnim]}>
            <Text style={s.cardTitle}>{scene.title}</Text>
            <Text style={s.cardBody}>{scene.body}</Text>
            {scene.demo && (
              <View style={s.demoBox}>
                <SceneDemo key={`${scene.id}-${sceneIdx}`} demo={scene.demo} sfxRef={sfxRef} />
              </View>
            )}
          </Animated.View>
        </View>

        {/* Bottom */}
        <View style={s.bottom}>
          <View style={s.dots}>
            {SCENES.map((_,i) => (
              <Pressable key={i} onPress={() => setSceneIdx(i)}>
                <View style={[s.dot, i===sceneIdx && s.dotActive]} />
              </Pressable>
            ))}
          </View>
          <Pressable style={[s.nextBtn, isLast && s.nextPlay]} onPress={goNext}>
            <Text style={[s.nextTxt, isLast && s.nextPlayTxt]}>
              {isLast ? "🎮  LET'S PLAY!" : 'Next  →'}
            </Text>
          </Pressable>
        </View>

      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

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

const dm = StyleSheet.create({
  wrap:      { alignItems:'center', width:'100%' },
  label:     { fontFamily:'Nunito_700Bold', fontSize:13, color:'#374151', marginBottom:4 },
  shadow:    { position:'absolute', width:48, height:48, borderRadius:12, top:4, left:3 },
  face:      { width:48, height:48, borderRadius:12, borderWidth:3, borderColor:'rgba(0,0,0,0.20)', alignItems:'center', justifyContent:'center', overflow:'hidden' },
  faceMatch: { borderColor:'#B7950B' },
  shine:     { position:'absolute', top:4, left:4, width:14, height:8, backgroundColor:'rgba(255,255,255,0.55)', borderRadius:5, transform:[{rotate:'-20deg'}] },
  letter:    { fontFamily:'Nunito_800ExtraBold', fontSize:22, color:'#fff', textShadowColor:'rgba(0,0,0,0.3)', textShadowOffset:{width:1,height:1}, textShadowRadius:2 },
  sparkle:   { position:'absolute', top:1, right:2, fontSize:9 },
  matchLine: { backgroundColor:'#FFF9C4', borderRadius:20, paddingHorizontal:14, paddingVertical:5, borderWidth:2, borderColor:'#FFD700' },
  matchTxt:  { fontFamily:'Nunito_700Bold', fontSize:12, color:'#7B5200' },
  result:    { marginTop:8, flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#D1FAE5', borderRadius:16, paddingHorizontal:18, paddingVertical:8, borderWidth:2, borderColor:'#10B981' },
  resultTxt: { fontFamily:'Nunito_800ExtraBold', fontSize:22, color:'#065F46' },
});

const pb = StyleSheet.create({
  track: { height:5, backgroundColor:'rgba(255,255,255,0.30)' },
  fill:  { height:5, backgroundColor:'white', borderRadius:3 },
});

const cl = StyleSheet.create({
  wrap: { position:'absolute' },
  base: { width:120, height:44, backgroundColor:'rgba(255,255,255,0.80)', borderRadius:22 },
  puff: { position:'absolute', backgroundColor:'rgba(255,255,255,0.80)', borderRadius:999, width:44, height:44 },
});

const s = StyleSheet.create({
  root: { flex:1 },
  safe: { flex:1 },
  topBar:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:8, paddingBottom:4 },
  iconBtn:     { width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.35)', alignItems:'center', justifyContent:'center' },
  iconTxt:     { fontSize:14 },
  pill:        { backgroundColor:'rgba(255,255,255,0.28)', borderRadius:12, paddingHorizontal:12, paddingVertical:3 },
  pillTxt:     { fontFamily:'Nunito_700Bold', fontSize:13, color:'white' },
  skipBtn:     { paddingHorizontal:14, paddingVertical:6, backgroundColor:'rgba(255,255,255,0.32)', borderRadius:20 },
  skipTxt:     { fontFamily:'Nunito_700Bold', fontSize:13, color:'#1F2937' },
  body:        { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:20, paddingTop:8, gap:12 },
  card:        { width:'100%', backgroundColor:'rgba(255,255,255,0.93)', borderRadius:26, padding:20, alignItems:'center', gap:10, shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.14, shadowRadius:16, elevation:12 },
  cardTitle:   { fontFamily:'Nunito_800ExtraBold', fontSize:22, color:'#1E3A5F', textAlign:'center' },
  cardBody:    { fontFamily:'Nunito_700Bold', fontSize:16, color:'#374151', textAlign:'center', lineHeight:26 },
  demoBox:     { width:'100%', backgroundColor:'rgba(0,0,0,0.04)', borderRadius:18, padding:14, marginVertical:2, alignItems:'center', minHeight:110, justifyContent:'center' },
  bottom:      { paddingHorizontal:24, paddingBottom:22, gap:12, alignItems:'center' },
  dots:        { flexDirection:'row', gap:8 },
  dot:         { width:10, height:10, borderRadius:5, backgroundColor:'rgba(255,255,255,0.40)' },
  dotActive:   { backgroundColor:'white', width:28, borderRadius:5 },
  nextBtn:     { width:'100%', backgroundColor:'rgba(255,255,255,0.92)', borderRadius:28, paddingVertical:15, alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:3}, shadowOpacity:0.14, shadowRadius:8, elevation:8 },
  nextPlay:    { backgroundColor:'#22C55E', borderWidth:3, borderColor:'white' },
  nextTxt:     { fontFamily:'Nunito_800ExtraBold', fontSize:18, color:'#1E3A5F', letterSpacing:1 },
  nextPlayTxt: { color:'white' },
});
