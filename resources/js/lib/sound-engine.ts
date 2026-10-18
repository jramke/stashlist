import type { Sound } from '@/lib/sound';

/**
 * The synthesizer: every sound is made with the Web Audio API instead of a file, so there is nothing to download,
 * and every key press differs a little from the last one, the way a real keyboard does. Loaded on its own, after
 * the page, because the first visit does not need it. The loudness of everything is `VOLUME`.
 */

/** From 0 to 1. */
const VOLUME = 0.4;

type Engine = { ctx: AudioContext; out: AudioNode; noise: AudioBuffer };

let engine: Engine | null = null;
let lastAt = -Infinity;

/** The audio context is made on the first sound, which always follows a key or a click, so the browser allows it. */
function start(): Engine | null {
    if (engine === null) {
        if (typeof AudioContext === 'undefined') {
            return null;
        }

        try {
            const ctx = new AudioContext({ latencyHint: 'interactive' });
            const master = ctx.createGain();
            master.gain.value = VOLUME;

            // Fast typing stacks sounds; the compressor keeps the sum from clipping.
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -20;
            compressor.ratio.value = 6;
            master.connect(compressor).connect(ctx.destination);

            const noise = ctx.createBuffer(
                1,
                Math.floor(ctx.sampleRate * 0.08),
                ctx.sampleRate,
            );
            const samples = noise.getChannelData(0);

            for (let i = 0; i < samples.length; i++) {
                samples[i] = Math.random() * 2 - 1;
            }

            engine = { ctx, out: master, noise };
        } catch {
            return null;
        }
    }

    if (engine.ctx.state === 'suspended') {
        void engine.ctx.resume();
    }

    return engine;
}

/** A little different every time: up to 6% either way. */
function jitter(value: number): number {
    return value * (1 + (Math.random() - 0.5) * 0.12);
}

function envelope(
    gain: GainNode,
    at: number,
    peak: number,
    decay: number,
    attack = 0.001,
): void {
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
}

/** The sharp part of a key: a burst of noise, narrowed to one pitch. */
function burst(
    { ctx, out, noise }: Engine,
    at: number,
    freq: number,
    gain: number,
    decay: number,
    q = 1.1,
): void {
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const level = ctx.createGain();

    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = jitter(freq);
    filter.Q.value = q;
    envelope(level, at, gain, decay);
    source.connect(filter).connect(level).connect(out);
    source.start(at, 0, decay + 0.02);
}

/** The body of a key (a thock) or a note: a sine that falls, or holds, in pitch. */
function tone(
    { ctx, out }: Engine,
    at: number,
    from: number,
    to: number,
    gain: number,
    decay: number,
    type: OscillatorType = 'sine',
    attack = 0.002,
): void {
    const osc = ctx.createOscillator();
    const level = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, at);

    if (to !== from) {
        osc.frequency.exponentialRampToValueAtTime(to, at + decay);
    }

    envelope(level, at, gain, decay, attack);
    osc.connect(level).connect(out);
    osc.start(at);
    osc.stop(at + attack + decay + 0.02);
}

const voices: Record<Sound, (e: Engine, at: number) => void> = {
    key: (e, at) => {
        burst(e, at, 3300, 0.5, 0.022);
        tone(e, at, jitter(240), 110, 0.35, 0.06);
    },
    space: (e, at) => {
        burst(e, at, 1900, 0.55, 0.03);
        tone(e, at, jitter(150), 70, 0.5, 0.09);
        // The rattle of the stabilizer.
        burst(e, at + 0.018, 3800, 0.15, 0.012, 2);
    },
    enter: (e, at) => {
        burst(e, at, 2300, 0.6, 0.03);
        tone(e, at, jitter(170), 80, 0.55, 0.1);
    },
    back: (e, at) => {
        burst(e, at, 2700, 0.4, 0.02);
        tone(e, at, jitter(260), 140, 0.3, 0.05);
    },
    release: (e, at) => {
        burst(e, at, 4500, 0.14, 0.012, 1.5);
    },
    click: (e, at) => {
        burst(e, at, 3800, 0.35, 0.014, 1.4);
        tone(e, at, jitter(1500), 900, 0.1, 0.03, 'triangle');
    },
    tick: (e, at) => {
        tone(e, at, jitter(2200), 1800, 0.07, 0.018);
        burst(e, at, 5000, 0.05, 0.008);
    },
    pop: (e, at) => {
        tone(e, at, 420, 760, 0.16, 0.09);
    },
    success: (e, at) => {
        tone(e, at, 880, 880, 0.13, 0.22, 'triangle');
        tone(e, at, 1760, 1760, 0.03, 0.15);
        tone(e, at + 0.075, 1318.5, 1318.5, 0.14, 0.3, 'triangle');
        tone(e, at + 0.075, 2637, 2637, 0.03, 0.2);
    },
    error: (e, at) => {
        tone(e, at, 311, 300, 0.16, 0.14, 'triangle');
        tone(e, at + 0.09, 233, 220, 0.18, 0.24, 'triangle');
        burst(e, at + 0.09, 700, 0.06, 0.06, 0.8);
    },
};

/** Plays a sound. The caller has already checked that the person wants sounds. */
export function ring(sound: Sound): void {
    const e = start();

    if (e === null) {
        return;
    }

    // Two sounds of one stroke are too close to tell apart; the messages are never dropped. (The wall clock, not
    // the audio clock: that one stands still at 0 until the context has started.)
    const clock = performance.now();

    if (sound !== 'success' && sound !== 'error' && clock - lastAt < 12) {
        return;
    }

    lastAt = clock;
    voices[sound](e, e.ctx.currentTime + 0.005);
}
