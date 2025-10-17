// src/GTOPokerTrainer.tsx
import React, { useState, useEffect } from 'react';
import { Shuffle, Settings, TrendingUp, BookOpen } from 'lucide-react';

/** =========================
 *  Constants & Utilities
 *  ========================= */
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['♠', '♥', '♦', '♣'];
const RANK_TO_VAL: Record<string, number> = {
    A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
};

type Hand = { rank1: string; rank2: string; suited: boolean; isPair: boolean };
type FlopCard = { rank: string; suit: string };

const generateAllHands = (): Hand[] => {
    const hands: Hand[] = [];
    // Pairs
    for (let i = 0; i < RANKS.length; i++) {
        hands.push({ rank1: RANKS[i], rank2: RANKS[i], suited: false, isPair: true });
    }
    // Non-pairs (suited / offsuit)
    for (let i = 0; i < RANKS.length; i++) {
        for (let j = i + 1; j < RANKS.length; j++) {
            hands.push({ rank1: RANKS[i], rank2: RANKS[j], suited: true, isPair: false });
            hands.push({ rank1: RANKS[i], rank2: RANKS[j], suited: false, isPair: false });
        }
    }
    return hands;
};
const ALL_HANDS = generateAllHands();

const formatHand = (hand: Hand) =>
    hand.isPair ? `${hand.rank1}${hand.rank2}` : `${hand.rank1}${hand.rank2}${hand.suited ? 's' : 'o'}`;

/** =========================
 *  Flop / Board Generation
 *  ========================= */
const generateFlop = (): FlopCard[] => {
    const used = new Set<string>();
    const flop: FlopCard[] = [];
    while (flop.length < 3) {
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const key = `${rank}${suit}`;
        if (!used.has(key)) {
            used.add(key);
            flop.push({ rank, suit });
        }
    }
    return flop;
};

const generateOneBoardCard = (existing: FlopCard[]): FlopCard => {
    const used = new Set(existing.map((c) => `${c.rank}${c.suit}`));
    let card: FlopCard;
    do {
        card = {
            rank: RANKS[Math.floor(Math.random() * RANKS.length)],
            suit: SUITS[Math.floor(Math.random() * SUITS.length)]
        };
    } while (used.has(`${card.rank}${card.suit}`));
    return card;
};

/** =========================
 *  Texture / Board Analysis
 *  ========================= */
const analyzeFlopTexture = (flop: FlopCard[]) => {
    const suits = flop.map((c) => c.suit);
    const ranks = flop.map((c) => c.rank);
    const values = ranks.map((r) => RANK_TO_VAL[r]).sort((a, b) => b - a);

    const suitSet = new Set(suits);
    const isMonotone = suitSet.size === 1;
    const isTwoTone = suitSet.size === 2;
    const isRainbow = suitSet.size === 3;

    const hasPair = ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2];

    const connected =
        Math.abs(values[0] - values[1]) <= 3 && Math.abs(values[1] - values[2]) <= 3;

    const highPresence = values.some((v) => v >= 12);
    const lowBoard = values.every((v) => v <= 10);

    const textureBits: string[] = [];
    if (hasPair) textureBits.push('Paired');
    if (isMonotone) textureBits.push('Monotone');
    else if (isTwoTone) textureBits.push('Two-Tone');
    else if (isRainbow) textureBits.push('Rainbow');

    textureBits.push(connected ? 'Connected' : 'Disconnected');
    textureBits.push(highPresence ? 'High' : lowBoard ? 'Low' : 'Mid');

    const label = textureBits.join(' ');
    return {
        label,
        isMonotone,
        isTwoTone,
        isRainbow,
        hasPair,
        connected,
        highPresence,
        lowBoard,
        ranks,
        values,
        suitCounts: suits.reduce<Record<string, number>>((acc, s) => {
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {})
    };
};

/** =========================
 *  Custom GTO Ranges (your supplied ranges)
 *  ========================= */
const GTO_RANGES: Record<string, Record<string, Record<string, Record<string, number>>>> = {
    "6max": {
        "UTG": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 0.95 }, "88": { raise: 0.80 }, "77": { raise: 0.65 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 0.85 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 0.90 },
            "QJs": { raise: 1.0 }, "JTs": { raise: 1.0 }
        },
        "CO": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 1.0 }, "88": { raise: 1.0 }, "77": { raise: 0.90 },
            "66": { raise: 0.80 }, "55": { raise: 0.70 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "A9s": { raise: 0.90 }, "A8s": { raise: 0.80 }, "A5s": { raise: 0.85 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 1.0 }, "ATo": { raise: 0.90 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 1.0 }, "K9s": { raise: 0.85 },
            "KQo": { raise: 1.0 }, "KJo": { raise: 0.95 },
            "QJs": { raise: 1.0 }, "QTs": { raise: 1.0 }, "Q9s": { raise: 0.85 },
            "JTs": { raise: 1.0 }, "J9s": { raise: 0.90 }, "T9s": { raise: 1.0 },
            "98s": { raise: 0.95 }, "87s": { raise: 0.95 }, "76s": { raise: 0.95 }, "65s": { raise: 0.95 }
        },
        "BTN": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 1.0 }, "88": { raise: 1.0 }, "77": { raise: 1.0 },
            "66": { raise: 0.95 }, "55": { raise: 0.90 }, "44": { raise: 0.85 }, "33": { raise: 0.80 }, "22": { raise: 0.75 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "A9s": { raise: 1.0 }, "A8s": { raise: 0.95 }, "A7s": { raise: 0.90 }, "A6s": { raise: 0.85 },
            "A5s": { raise: 1.0 }, "A4s": { raise: 0.95 }, "A3s": { raise: 0.90 }, "A2s": { raise: 0.85 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 1.0 }, "ATo": { raise: 1.0 },
            "A9o": { raise: 0.85 }, "A8o": { raise: 0.70 }, "A5o": { raise: 0.65 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 1.0 }, "K9s": { raise: 1.0 },
            "K8s": { raise: 0.90 }, "K7s": { raise: 0.80 },
            "KQo": { raise: 1.0 }, "KJo": { raise: 1.0 }, "KTo": { raise: 0.95 }, "K9o": { raise: 0.75 },
            "QJs": { raise: 1.0 }, "QTs": { raise: 1.0 }, "Q9s": { raise: 1.0 }, "Q8s": { raise: 0.90 },
            "QJo": { raise: 1.0 }, "QTo": { raise: 0.90 }, "Q9o": { raise: 0.75 },
            "JTs": { raise: 1.0 }, "J9s": { raise: 1.0 }, "J8s": { raise: 0.95 }, "J7s": { raise: 0.85 },
            "JTo": { raise: 0.95 }, "J9o": { raise: 0.80 },
            "T9s": { raise: 1.0 }, "T8s": { raise: 1.0 }, "T7s": { raise: 0.95 }, "T9o": { raise: 0.90 },
            "98s": { raise: 1.0 }, "97s": { raise: 0.95 }, "87s": { raise: 1.0 }, "86s": { raise: 0.95 },
            "76s": { raise: 1.0 }, "75s": { raise: 0.95 }, "65s": { raise: 1.0 }, "54s": { raise: 1.0 }
        },
        "SB": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 1.0 }, "88": { raise: 1.0 }, "77": { raise: 0.95 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "A9s": { raise: 1.0 }, "A5s": { raise: 0.90 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 1.0 }, "ATo": { raise: 0.90 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 1.0 },
            "QJs": { raise: 1.0 }, "QTs": { raise: 1.0 }, "JTs": { raise: 1.0 }, "T9s": { raise: 1.0 }
        },
        "BB": {
            "AA": { call: 0.80, raise: 0.20 }, "KK": { call: 0.80, raise: 0.20 },
            "QQ": { call: 0.85, raise: 0.15 }, "JJ": { call: 0.90, raise: 0.10 },
            "TT": { call: 0.95 }, "99": { call: 1.0 }, "88": { call: 1.0 },
            "AKs": { call: 0.75, raise: 0.25 }, "AQs": { call: 0.85, raise: 0.15 },
            "AJs": { call: 0.95 }, "ATs": { call: 1.0 },
            "AKo": { call: 0.80, raise: 0.20 }, "AQo": { call: 0.95 },
            "KQs": { call: 0.95 }, "KJs": { call: 1.0 }, "QJs": { call: 1.0 }
        }
    },
    "9max": {
        "UTG": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 0.85 }, "88": { raise: 0.65 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 0.90 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 0.85 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "QJs": { raise: 1.0 }, "JTs": { raise: 0.85 }
        },
        "CO": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 1.0 }, "88": { raise: 0.95 }, "77": { raise: 0.85 },
            "66": { raise: 0.75 }, "55": { raise: 0.65 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "A9s": { raise: 0.85 }, "A5s": { raise: 0.75 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 0.95 }, "ATo": { raise: 0.80 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 1.0 },
            "KQo": { raise: 1.0 }, "KJo": { raise: 0.85 },
            "QJs": { raise: 1.0 }, "QTs": { raise: 1.0 }, "JTs": { raise: 1.0 },
            "T9s": { raise: 0.90 }, "98s": { raise: 0.85 }, "87s": { raise: 0.75 }, "76s": { raise: 0.70 }
        },
        "BTN": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 1.0 }, "88": { raise: 1.0 }, "77": { raise: 0.95 },
            "66": { raise: 0.90 }, "55": { raise: 0.85 }, "44": { raise: 0.80 }, "33": { raise: 0.75 }, "22": { raise: 0.70 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "A9s": { raise: 1.0 }, "A8s": { raise: 0.90 }, "A7s": { raise: 0.85 }, "A5s": { raise: 0.95 },
            "A4s": { raise: 0.90 }, "A3s": { raise: 0.85 }, "A2s": { raise: 0.80 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 1.0 }, "ATo": { raise: 0.95 },
            "A9o": { raise: 0.80 }, "A8o": { raise: 0.60 }, "A5o": { raise: 0.55 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 1.0 }, "K9s": { raise: 0.95 },
            "K8s": { raise: 0.80 }, "K7s": { raise: 0.70 },
            "KQo": { raise: 1.0 }, "KJo": { raise: 0.95 }, "KTo": { raise: 0.85 },
            "QJs": { raise: 1.0 }, "QTs": { raise: 1.0 }, "Q9s": { raise: 0.95 }, "Q8s": { raise: 0.85 },
            "QJo": { raise: 0.95 }, "QTo": { raise: 0.80 },
            "JTs": { raise: 1.0 }, "J9s": { raise: 0.95 }, "J8s": { raise: 0.85 },
            "JTo": { raise: 0.90 }, "J9o": { raise: 0.70 },
            "T9s": { raise: 1.0 }, "T8s": { raise: 0.95 }, "T7s": { raise: 0.85 },
            "98s": { raise: 0.95 }, "97s": { raise: 0.85 }, "87s": { raise: 0.95 }, "76s": { raise: 0.95 },
            "65s": { raise: 0.95 }, "54s": { raise: 0.95 }
        },
        "SB": {
            "AA": { raise: 1.0 }, "KK": { raise: 1.0 }, "QQ": { raise: 1.0 }, "JJ": { raise: 1.0 },
            "TT": { raise: 1.0 }, "99": { raise: 1.0 }, "88": { raise: 0.95 }, "77": { raise: 0.85 },
            "AKs": { raise: 1.0 }, "AQs": { raise: 1.0 }, "AJs": { raise: 1.0 }, "ATs": { raise: 1.0 },
            "A9s": { raise: 0.90 }, "A5s": { raise: 0.80 },
            "AKo": { raise: 1.0 }, "AQo": { raise: 1.0 }, "AJo": { raise: 0.95 }, "ATo": { raise: 0.80 },
            "KQs": { raise: 1.0 }, "KJs": { raise: 1.0 }, "KTs": { raise: 1.0 },
            "QJs": { raise: 1.0 }, "QTs": { raise: 1.0 }, "JTs": { raise: 1.0 }, "T9s": { raise: 0.95 }
        },
        "BB": {
            "AA": { call: 0.80, raise: 0.20 }, "KK": { call: 0.80, raise: 0.20 },
            "QQ": { call: 0.85, raise: 0.15 }, "JJ": { call: 0.90, raise: 0.10 },
            "TT": { call: 0.95 }, "99": { call: 1.0 }, "88": { call: 1.0 },
            "AKs": { call: 0.75, raise: 0.25 }, "AQs": { call: 0.85, raise: 0.15 },
            "AJs": { call: 0.95 }, "ATs": { call: 1.0 },
            "AKo": { call: 0.80, raise: 0.20 }, "AQo": { call: 0.95 },
            "KQs": { call: 0.95 }, "KJs": { call: 1.0 }, "QJs": { call: 1.0 }
        }
    }
};

/** =========================
 *  Preflop Strategy
 *  ========================= */
const getTableFormat = (playerCount: number) => (playerCount <= 6 ? '6max' : '9max');

const getGTOStrategy = (hand: Hand, position: string, playerCount: number) => {
    const handStr = formatHand(hand);
    const tableFormat = getTableFormat(playerCount);
    const posObj = GTO_RANGES[tableFormat]?.[position as keyof typeof GTO_RANGES['6max']];
    if (!posObj || !posObj[handStr]) {
        return { fold: 1.0 };
    }
    const strategy = posObj[handStr];
    const total = Object.values(strategy).reduce((s, v) => s + v, 0);
    return total < 1 ? { ...strategy, fold: 1 - total } : strategy;
};

const generatePreflopExplanation = (
    hand: Hand,
    strategy: Record<string, number>,
    position: string
) => {
    const handStr = formatHand(hand);
    const actions = Object.keys(strategy);
    const primary = actions.reduce((a, b) => (strategy[a] > strategy[b] ? a : b));
    const freq = Math.round((strategy as any)[primary] * 100);
    if (primary === 'raise')
        return `${handStr} is strong from ${position}. Raise ${freq}% to build the pot and apply pressure.`;
    if (primary === 'call')
        return `From ${position}, ${handStr} plays well as a call ${freq}% for pot control and implied odds.`;
    return `${handStr} doesn’t have enough equity from ${position}. Fold ${freq}% and wait for better spots.`;
};

/** =========================
 *  Postflop / Turn / River Heuristics
 *  ========================= */
type PostFlopAdvice = { bet: number; check: number; fold: number; explanation: string };

// classify made hands
const classifyPairing = (hand: Hand, board: FlopCard[]) => {
    const boardRanks = board.map((c) => c.rank);
    const vSorted = board.map((c) => RANK_TO_VAL[c.rank]).sort((a, b) => b - a);
    const topBoard = vSorted[0];
    const isPair = hand.isPair;
    const r1 = hand.rank1;
    const r2 = hand.rank2;

    const hasSet = isPair && boardRanks.includes(r1);
    const hasTwoPair = !isPair && boardRanks.includes(r1) && boardRanks.includes(r2);
    const hasOverpair = isPair && RANK_TO_VAL[r1] > topBoard;

    const made1 = boardRanks.includes(r1);
    const made2 = boardRanks.includes(r2);
    const hasAnyPair = hasSet || hasTwoPair || made1 || made2 || hasOverpair;

    let pairTier: 'top' | 'middle' | 'bottom' | 'none' = 'none';
    if (!hasAnyPair) {
        pairTier = 'none';
    } else if (hasSet || hasTwoPair || hasOverpair) {
        pairTier = 'top';
    } else {
        // find relative to board
        const boardSorted = board
            .map((c) => ({ r: c.rank, v: RANK_TO_VAL[c.rank] }))
            .sort((a, b) => b.v - a.v);
        const hitRank = made1 ? r1 : made2 ? r2 : '';
        const hitVal = hitRank ? RANK_TO_VAL[hitRank] : -1;
        if (hitVal === boardSorted[0].v) pairTier = 'top';
        else if (hitVal === boardSorted[1].v) pairTier = 'middle';
        else pairTier = 'bottom';
    }

    return { hasSet, hasTwoPair, hasOverpair, pairTier };
};

// classify draws
const classifyDraws = (
    hand: Hand,
    board: FlopCard[],
    tex: ReturnType<typeof analyzeFlopTexture>
) => {
    const boardVals = board.map((c) => RANK_TO_VAL[c.rank]).sort((a, b) => b - a);
    const hVals = [RANK_TO_VAL[hand.rank1], RANK_TO_VAL[hand.rank2]];

    const hasFD =
        hand.suited &&
        (Object.values(tex.suitCounts).some((c) => c === 2) || tex.isMonotone);
    const hasBackdoorFD = hand.suited && tex.isRainbow;

    const closeToRun = (hv: number) => {
        const diffs = boardVals.map((bv) => Math.abs(bv - hv)).sort((a, b) => a - b);
        return { min1: diffs[0], min2: diffs[1] };
    };
    const d1 = closeToRun(hVals[0]);
    const d2 = closeToRun(hVals[1]);
    const bestMin1 = Math.min(d1.min1, d2.min1);
    const bestMin2 = Math.min(d1.min2, d2.min2);

    const hasOESD = bestMin1 <= 1 && bestMin2 <= 2 && tex.connected;
    const hasGutshot = !hasOESD && ((bestMin1 <= 2 && bestMin2 <= 3) || tex.connected);

    const topBoard = boardVals[0];
    const overcards = hVals.filter((hv) => hv > topBoard).length;
    const hasTwoOver = overcards === 2;
    const hasOneOver = overcards === 1;

    return { hasFD, hasBackdoorFD, hasOESD, hasGutshot, hasTwoOver, hasOneOver };
};

// flop strategy
const getPostFlopStrategy = (
    hand: Hand,
    flop: FlopCard[],
    position: string,
    actionContext: 'pfr' | 'caller' = 'pfr'
): PostFlopAdvice => {
    const tex = analyzeFlopTexture(flop);
    const { hasSet, hasTwoPair, hasOverpair, pairTier } = classifyPairing(hand, flop);
    const { hasFD, hasBackdoorFD, hasOESD, hasGutshot, hasTwoOver, hasOneOver } = classifyDraws(hand, flop, tex);

    const ip = position === 'BTN' || position === 'CO';

    // monsters
    if (hasSet || hasTwoPair) {
        return {
            bet: ip ? 0.85 : 0.75,
            check: ip ? 0.15 : 0.20,
            fold: 0.0,
            explanation: `You flopped a strong hand (${hasSet ? 'set' : 'two pair'}) on a ${tex.label.toLowerCase()} board. Favor betting for value.`
        };
    }

    if (hasOverpair) {
        const wet = tex.isMonotone || tex.connected || tex.isTwoTone;
        return {
            bet: ip ? (wet ? 0.75 : 0.65) : (wet ? 0.65 : 0.55),
            check: ip ? (wet ? 0.25 : 0.35) : (wet ? 0.30 : 0.40),
            fold: 0.0,
            explanation: `Overpair on a ${tex.label.toLowerCase()} board. Lean to betting for value/protection.`
        };
    }

    if (pairTier === 'top') {
        const wet = tex.isMonotone || tex.connected || tex.isTwoTone;
        return {
            bet: ip ? (wet ? 0.70 : 0.60) : (wet ? 0.55 : 0.45),
            check: ip ? (wet ? 0.30 : 0.40) : (wet ? 0.40 : 0.50),
            fold: 0.0,
            explanation: `Top pair on ${tex.label.toLowerCase()}. Bet more on wetter boards; mix checks.`
        };
    }

    if (pairTier === 'middle') {
        return {
            bet: ip ? 0.45 : 0.35,
            check: ip ? 0.50 : 0.55,
            fold: ip ? 0.05 : 0.10,
            explanation: `Middle pair on ${tex.label.toLowerCase()}. Prefer checking; bet some for protection.`
        };
    }

    if (pairTier === 'bottom') {
        return {
            bet: ip ? 0.30 : 0.20,
            check: ip ? 0.60 : 0.65,
            fold: ip ? 0.10 : 0.15,
            explanation: `Bottom pair on ${tex.label.toLowerCase()}. Mostly check; mix small bets IP.`
        };
    }

    if (hasFD || hasOESD) {
        const wet = tex.isMonotone || tex.isTwoTone || tex.connected;
        return {
            bet: ip ? (wet ? 0.65 : 0.60) : (wet ? 0.55 : 0.50),
            check: ip ? (wet ? 0.30 : 0.35) : (wet ? 0.35 : 0.40),
            fold: ip ? 0.05 : 0.10,
            explanation: `Strong draw (${hasFD ? 'flush draw' : 'OESD'}) on ${tex.label.toLowerCase()}. Favor betting as semi-bluff.`
        };
    }

    if (hasGutshot || hasBackdoorFD || hasTwoOver || hasOneOver) {
        return {
            bet: ip ? 0.40 : 0.25,
            check: ip ? 0.55 : 0.65,
            fold: ip ? 0.05 : 0.10,
            explanation: `Speculative equity (gutshot/backdoor/overcards) on ${tex.label.toLowerCase()}. Mix stab bets IP; mostly check OOP.`
        };
    }

    return {
        bet: ip ? (tex.isRainbow && !tex.connected ? 0.35 : 0.30) : 0.15,
        check: ip ? (tex.isRainbow && !tex.connected ? 0.60 : 0.65) : 0.80,
        fold: ip ? 0.05 : 0.05,
        explanation: `Missed the flop. ${ip ? 'Use small c-bets on drier boards' : 'Mostly check-fold OOP'} to avoid bloating.`
    };
};

// turn strategy (scale from flop)
const getTurnStrategy = (
    hand: Hand,
    flop: FlopCard[],
    turn: FlopCard,
    position: string,
    playerCount: number
): PostFlopAdvice => {
    const full = [...flop, turn];
    const base = getPostFlopStrategy(hand, full, position, 'pfr');
    const factor = playerCount === 2 ? 1 : playerCount === 3 ? 0.85 : 0.7;
    const bet = +(base.bet * factor).toFixed(2);
    const check = +(base.check + (1 - factor) * base.bet * 0.5).toFixed(2);
    return {
        bet,
        check,
        fold: base.fold,
        explanation: `[Turn] ${base.explanation}`
    };
};

// river strategy heuristics
const getRiverStrategy = (
    hand: Hand,
    flop: FlopCard[],
    turn: FlopCard,
    river: FlopCard,
    position: string,
    playerCount: number
): PostFlopAdvice => {
    const full = [...flop, turn, river];
    const tex = analyzeFlopTexture(full);
    const { hasSet, hasTwoPair, hasOverpair, pairTier } = classifyPairing(hand, full);
    const { hasFD, hasOESD, hasGutshot } = classifyDraws(hand, full, tex);
    const ip = position === 'BTN' || position === 'CO';

    if (hasSet || hasTwoPair) {
        return {
            bet: ip ? 0.8 : 0.7,
            check: ip ? 0.2 : 0.3,
            fold: 0.0,
            explanation: `Strong value (${hasSet ? 'set' : 'two pair'}) on river. Bet for value.`
        };
    }
    if (pairTier === 'top' || hasOverpair) {
        return {
            bet: ip ? 0.55 : 0.45,
            check: ip ? 0.40 : 0.50,
            fold: 0.05,
            explanation: `Top pair or overpair on river. Mix bets/checks depending on texture.`
        };
    }
    if (hasFD || hasOESD || hasGutshot) {
        return {
            bet: ip ? 0.25 : 0.15,
            check: ip ? 0.45 : 0.50,
            fold: ip ? 0.30 : 0.35,
            explanation: `Missed draw. Consider bluffing IP; mostly check/fold OOP.`
        };
    }
    return {
        bet: 0.0,
        check: ip ? 0.45 : 0.30,
        fold: ip ? 0.55 : 0.70,
        explanation: `Weak/no showdown value. Mostly check/fold.`
    };
};

/** =========================
 *  Component
 *  ========================= */
type Mode = 'practice' | 'training';
type GameMode = 'Preflop' | 'Postflop' | 'TurnRiver';

export default function GTOPokerTrainer() {
    const [mode, setMode] = useState<Mode>('practice');
    const [gameMode, setGameMode] = useState<GameMode>('Preflop');
    const [playerCount, setPlayerCount] = useState<number>(2);
    const [position, setPosition] = useState<string>('BTN');

    const [currentHand, setCurrentHand] = useState<Hand | null>(null);
    const [flop, setFlop] = useState<FlopCard[] | null>(null);
    const [turnCard, setTurnCard] = useState<FlopCard | null>(null);
    const [riverCard, setRiverCard] = useState<FlopCard | null>(null);

    const [gameStage, setGameStage] = useState<'preflop' | 'postflop'>('preflop');
    const [userGuess, setUserGuess] = useState<string | null>(null);
    const [showStrategy, setShowStrategy] = useState<boolean>(true);
    const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

    // Initialize / reset on key changes
    useEffect(() => {
        generateNewHand();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, gameMode, playerCount, position]);

    const generateNewHand = () => {
        const h = ALL_HANDS[Math.floor(Math.random() * ALL_HANDS.length)];
        setCurrentHand(h);
        setFlop(null);
        setTurnCard(null);
        setRiverCard(null);
        setGameStage('preflop');
        setUserGuess(null);
        setShowStrategy(mode === 'practice');
    };

    const goToNextStreet = () => {
        if (gameStage === 'preflop') {
            const f = generateFlop();
            setFlop(f);
            setGameStage('postflop');
        } else if (flop && !turnCard && gameMode === 'TurnRiver') {
            const newC = generateOneBoardCard(flop);
            setTurnCard(newC);
        } else if (flop && turnCard && !riverCard && gameMode === 'TurnRiver') {
            const existing = [...flop, turnCard];
            const newC = generateOneBoardCard(existing);
            setRiverCard(newC);
        }
    };

    // Choose which strategy to use
    let strategy: Record<string, number> | PostFlopAdvice | null = null;
    if (currentHand) {
        if (gameStage === 'preflop') {
            strategy = getGTOStrategy(currentHand, position, playerCount);
        } else if (gameStage === 'postflop' && flop && !turnCard) {
            strategy = getPostFlopStrategy(currentHand, flop, position, 'pfr');
        } else if (flop && turnCard && !riverCard && gameMode === 'TurnRiver') {
            strategy = getTurnStrategy(currentHand, flop, turnCard, position, playerCount);
        } else if (flop && turnCard && riverCard && gameMode === 'TurnRiver') {
            strategy = getRiverStrategy(currentHand, flop, turnCard, riverCard, position, playerCount);
        } else if (gameStage === 'postflop' && flop && gameMode === 'Postflop') {
            strategy = getPostFlopStrategy(currentHand, flop, position, 'pfr');
        }
    }

    const explanation = (() => {
        if (!strategy) return '';
        if ('explanation' in (strategy as any)) return (strategy as any).explanation;
        return generatePreflopExplanation(currentHand!, strategy as Record<string, number>, position);
    })();

    const getPrimaryAction = (strat: Record<string, number> | PostFlopAdvice | null) => {
        if (!strat) return 'fold';
        const obj: Record<string, number> = { ...(strat as any) };
        delete (obj as any).explanation;
        const actions = Object.keys(obj);
        return actions.reduce((a, b) => (obj[a] > obj[b] ? a : b));
    };

    const handleGuess = (action: string) => {
        setUserGuess(action);
        setShowStrategy(true);
        const correct = getPrimaryAction(strategy);
        setScore((prev) => ({
            correct: prev.correct + (action === correct ? 1 : 0),
            total: prev.total + 1
        }));
    };

    // Render helpers
    const renderCard = (rank: string, suit: string, showSuit = true) => {
        const suitColor = suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800';
        return (
            <div className="bg-white rounded-lg shadow-lg p-4 w-20 h-28 flex flex-col justify-between border-2 border-gray-300">
                <div className={`text-2xl font-bold ${suitColor}`}>{rank}</div>
                <div className={`text-3xl ${suitColor} self-center`}>{showSuit ? suit : ''}</div>
                <div className={`text-2xl font-bold ${suitColor} self-end rotate-180`}>{rank}</div>
            </div>
        );
    };

    const renderBoardCard = (card: FlopCard) => {
        const suitColor = card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-gray-800';
        return (
            <div className="bg-white rounded-lg shadow-lg p-2 w-16 h-24 flex flex-col justify-between border-2 border-gray-300">
                <div className={`text-xl font-bold ${suitColor}`}>{card.rank}</div>
                <div className={`text-2xl ${suitColor} self-center`}>{card.suit}</div>
                <div className={`text-xl font-bold ${suitColor} self-end rotate-180`}>{card.rank}</div>
            </div>
        );
    };

    const getPositionOptions = () => ['UTG', 'CO', 'BTN', 'SB', 'BB'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">GTO Poker Trainer</h1>
                    <p className="text-green-200">Cash Game Strategy • Practice / Training • Multi‑Street</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Settings */}
                    <div className="bg-white rounded-xl shadow-2xl p-6 lg:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="text-green-700" size={24} />
                            <h2 className="text-xl font-bold text-gray-800">Settings</h2>
                        </div>
                        <div className="space-y-4">
                            {/* Mode */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setMode('practice');
                                            setShowStrategy(true);
                                            setScore({ correct: 0, total: 0 });
                                        }}
                                        className={`py-2 px-4 rounded-lg font-medium transition ${
                                            mode === 'practice'
                                                ? 'bg-green-700 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        Practice
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMode('training');
                                            setShowStrategy(false);
                                            setScore({ correct: 0, total: 0 });
                                            generateNewHand();
                                        }}
                                        className={`py-2 px-4 rounded-lg font-medium transition ${
                                            mode === 'training'
                                                ? 'bg-green-700 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        Training
                                    </button>
                                </div>
                            </div>

                            {/* Game Mode */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Game Mode</label>
                                <select
                                    value={gameMode}
                                    onChange={(e) => {
                                        setGameMode(e.target.value as GameMode);
                                        setShowStrategy(mode === 'practice');
                                    }}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                >
                                    <option value="Preflop">Preflop Only</option>
                                    <option value="Postflop">Flop → River</option>
                                    <option value="TurnRiver">Full Turn / River</option>
                                </select>
                            </div>

                            {/* Player count */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Players (You + Opponents)</label>
                                <select
                                    value={playerCount}
                                    onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                >
                                    {[2, 3, 4].map((n) => (
                                        <option key={n} value={n}>
                                            {n} Players
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Position */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Your Position</label>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                                >
                                    {getPositionOptions().map((pos) => (
                                        <option key={pos} value={pos}>
                                            {pos}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Score (training) */}
                            {mode === 'training' && score.total > 0 && (
                                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                                    <div className="text-sm font-semibold text-gray-700 mb-1">Session Stats</div>
                                    <div className="text-2xl font-bold text-green-700">
                                        {score.correct} / {score.total}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {((score.correct / score.total) * 100).toFixed(1)}% Accuracy
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Panel */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-2xl p-8">
                            <div className="flex items-center justify-between gap-4 mb-6 pb-2 border-b border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {gameStage === 'preflop' ? 'Preflop Stage' : 'Board Stage'}
                                </h2>
                                <div className="flex gap-3">
                                    <button
                                        onClick={generateNewHand}
                                        className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                                    >
                                        <Shuffle size={20} />
                                        Next Hand
                                    </button>
                                    {gameMode !== 'Preflop' && (
                                        <button
                                            onClick={goToNextStreet}
                                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
                                        >
                                            {(!flop ? 'Go to Flop' : flop && !turnCard ? 'Go to Turn' : 'Go to River')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Hole Cards */}
                            {currentHand && (
                                <div className="flex flex-col items-center mb-6">
                                    <div className="flex gap-4 mb-4">
                                        {renderCard(currentHand.rank1, SUITS[0], true)}
                                        {renderCard(
                                            currentHand.rank2,
                                            currentHand.suited ? SUITS[0] : SUITS[1],
                                            true
                                        )}
                                    </div>
                                    <div className="text-3xl font-bold text-gray-800 mb-1">{formatHand(currentHand)}</div>
                                    <div className="text-lg text-gray-600">
                                        {currentHand.isPair ? 'Pocket Pair' : currentHand.suited ? 'Suited' : 'Offsuit'}
                                    </div>
                                </div>
                            )}

                            {/* Board / Flop / Turn / River */}
                            {flop && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        {flop.map((c, i) => (
                                            <div key={`${c.rank}${c.suit}${i}`}>{renderBoardCard(c)}</div>
                                        ))}
                                        {turnCard && <div>{renderBoardCard(turnCard)}</div>}
                                        {riverCard && <div>{renderBoardCard(riverCard)}</div>}
                                    </div>
                                    <div className="text-center text-sm text-gray-600">
                                        Board Texture:{' '}
                                        <span className="font-semibold text-gray-800">{analyzeFlopTexture(flop).label}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Guess UI */}
                        {mode === 'training' && !showStrategy && strategy && (
                            <div className="bg-white rounded-xl shadow-2xl p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">What action would you take?</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {gameStage === 'preflop'
                                        ? (['fold', 'raise'] as const).map((a) => (
                                            <button
                                                key={a}
                                                onClick={() => handleGuess(a)}
                                                className="py-4 px-6 bg-gray-100 hover:bg-green-100 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 transition capitalize"
                                            >
                                                {a}
                                            </button>
                                        ))
                                        : (['bet', 'check', 'call', 'fold'] as const).map((a) => (
                                            <button
                                                key={a}
                                                onClick={() => handleGuess(a)}
                                                className="py-4 px-6 bg-gray-100 hover:bg-green-100 border-2 border-gray-300 rounded-lg font-semibold text-gray-800 transition capitalize"
                                            >
                                                {a}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Strategy Panel */}
                        {showStrategy && strategy && (
                            <div className="bg-white rounded-xl shadow-2xl p-8">
                                <div className="flex items-center gap-2 mb-6">
                                    <TrendingUp className="text-green-700" size={24} />
                                    <h2 className="text-2xl font-bold text-gray-800">
                                        {gameStage === 'preflop' ? 'Preflop Strategy' : 'Strategy'}
                                    </h2>
                                </div>

                                {mode === 'training' && userGuess && (
                                    <div
                                        className={`mb-6 p-4 rounded-lg ${
                                            userGuess === getPrimaryAction(strategy)
                                                ? 'bg-green-100 border-2 border-green-500'
                                                : 'bg-red-100 border-2 border-red-500'
                                        }`}
                                    >
                                        <div className="font-semibold">
                                            {userGuess === getPrimaryAction(strategy) ? '✓ Correct!' : '✗ Incorrect'}
                                        </div>
                                        <div className="text-sm mt-1">
                                            You selected: <span className="font-semibold">{userGuess}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4 mb-6">
                                    {Object.entries(
                                        (() => {
                                            const x: any = { ...(strategy as any) };
                                            delete x.explanation;
                                            return x;
                                        })()
                                    )
                                        .sort(([, a], [, b]) => (b as number) - (a as number))
                                        .map(([act, freq]) => (
                                            <div key={act} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-gray-800 capitalize">{act}</span>
                                                    <span
                                                        className={`text-lg font-bold ${
                                                            act === 'fold' ? 'text-red-700' : 'text-green-700'
                                                        }`}
                                                    >
                            {Math.round((freq as number) * 100)}%
                          </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className={`${
                                                            act === 'fold' ? 'bg-red-600' : 'bg-green-600'
                                                        } h-full transition-all duration-500 rounded-full`}
                                                        style={{ width: `${(freq as number) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                </div>

                                <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                                    <div className="flex gap-2">
                                        <BookOpen className="text-green-700 flex-shrink-0" size={20} />
                                        <p className="text-gray-700 leading-relaxed">{explanation}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-2 text-xs text-green-100 text-center">
                            Tip: In Training mode, make your guess first, then reveal strategy to align intuition with balanced logic.
                        </div>
                    </div>
                </div>

                {/* About */}
                <div className="mt-8 bg-green-800 bg-opacity-50 rounded-xl p-6 text-white">
                    <h3 className="font-bold text-lg mb-2">About This Trainer</h3>
                    <p className="text-green-100 text-sm leading-relaxed">
                        This GTO trainer supports Preflop-only mode, Postflop (flop → river) mode, and full Turn/River mode.
                        Use your custom preflop ranges (embedded above). Adjust total players (2–4) to see how strategies shift in multi-way spots.
                    </p>
                </div>
            </div>
        </div>
    );
}
