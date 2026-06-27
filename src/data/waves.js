export const WAVES = Object.freeze([
    Object.freeze({
        id: 'harbor-scouts',
        name: 'Harbor scouts',
        groups: Object.freeze([
            Object.freeze({ type: 'drifter', count: 10, hp: 42, speed: 0.78, armor: 0, reward: 10, leak: 20, interval: 0.72 }),
        ]),
    }),
    Object.freeze({
        id: 'white-sails',
        name: 'White sails',
        groups: Object.freeze([
            Object.freeze({ type: 'drifter', count: 12, hp: 54, speed: 0.80, armor: 0, reward: 11, leak: 22, interval: 0.68 }),
            Object.freeze({ type: 'runner', count: 5, hp: 36, speed: 1.24, armor: 0, reward: 9, leak: 16, interval: 0.48 }),
        ]),
    }),
    Object.freeze({
        id: 'foam-rush',
        name: 'Foam rush',
        groups: Object.freeze([
            Object.freeze({ type: 'swarm', count: 24, hp: 22, speed: 1.08, armor: 0, reward: 4, leak: 9, interval: 0.26 }),
        ]),
    }),
    Object.freeze({
        id: 'salt-shells',
        name: 'Salt shells',
        groups: Object.freeze([
            Object.freeze({ type: 'bulwark', count: 10, hp: 82, speed: 0.58, armor: 6, reward: 16, leak: 30, interval: 0.82 }),
            Object.freeze({ type: 'drifter', count: 8, hp: 68, speed: 0.82, armor: 2, reward: 13, leak: 24, interval: 0.62 }),
        ]),
    }),
    Object.freeze({
        id: 'first-colossus',
        name: 'First colossus',
        groups: Object.freeze([
            Object.freeze({ type: 'colossus', count: 1, hp: 360, speed: 0.42, armor: 12, reward: 92, leak: 92, interval: 1.0 }),
            Object.freeze({ type: 'drifter', count: 12, hp: 82, speed: 0.82, armor: 2, reward: 14, leak: 26, interval: 0.58 }),
        ]),
    }),
    Object.freeze({
        id: 'blue-cutters',
        name: 'Blue cutters',
        groups: Object.freeze([
            Object.freeze({ type: 'runner', count: 18, hp: 58, speed: 1.32, armor: 0, reward: 10, leak: 18, interval: 0.40 }),
            Object.freeze({ type: 'swarm', count: 18, hp: 30, speed: 1.12, armor: 0, reward: 5, leak: 10, interval: 0.24 }),
        ]),
    }),
    Object.freeze({
        id: 'courtyard-pressure',
        name: 'Courtyard pressure',
        groups: Object.freeze([
            Object.freeze({ type: 'drifter', count: 18, hp: 112, speed: 0.84, armor: 4, reward: 16, leak: 30, interval: 0.56 }),
            Object.freeze({ type: 'bulwark', count: 10, hp: 124, speed: 0.60, armor: 10, reward: 20, leak: 38, interval: 0.78 }),
        ]),
    }),
    Object.freeze({
        id: 'green-water',
        name: 'Green water',
        groups: Object.freeze([
            Object.freeze({ type: 'swarm', count: 34, hp: 42, speed: 1.16, armor: 0, reward: 6, leak: 12, interval: 0.21 }),
            Object.freeze({ type: 'runner', count: 10, hp: 74, speed: 1.36, armor: 0, reward: 12, leak: 20, interval: 0.36 }),
        ]),
    }),
    Object.freeze({
        id: 'iron-tide',
        name: 'Iron tide',
        groups: Object.freeze([
            Object.freeze({ type: 'bulwark', count: 16, hp: 168, speed: 0.62, armor: 15, reward: 24, leak: 44, interval: 0.72 }),
        ]),
    }),
    Object.freeze({
        id: 'twin-colossi',
        name: 'Twin colossi',
        groups: Object.freeze([
            Object.freeze({ type: 'colossus', count: 2, hp: 560, speed: 0.44, armor: 18, reward: 120, leak: 116, interval: 2.2 }),
            Object.freeze({ type: 'runner', count: 16, hp: 94, speed: 1.40, armor: 0, reward: 14, leak: 22, interval: 0.36 }),
        ]),
    }),
    Object.freeze({
        id: 'sunken-market',
        name: 'Sunken market',
        groups: Object.freeze([
            Object.freeze({ type: 'drifter', count: 22, hp: 210, speed: 0.86, armor: 8, reward: 22, leak: 40, interval: 0.48 }),
            Object.freeze({ type: 'swarm', count: 42, hp: 58, speed: 1.18, armor: 0, reward: 7, leak: 14, interval: 0.18 }),
        ]),
    }),
    Object.freeze({
        id: 'cistern-siege',
        name: 'Cistern siege',
        groups: Object.freeze([
            Object.freeze({ type: 'bulwark', count: 18, hp: 260, speed: 0.64, armor: 20, reward: 28, leak: 52, interval: 0.62 }),
            Object.freeze({ type: 'colossus', count: 3, hp: 760, speed: 0.46, armor: 24, reward: 150, leak: 140, interval: 2.0 }),
            Object.freeze({ type: 'runner', count: 22, hp: 132, speed: 1.46, armor: 0, reward: 16, leak: 26, interval: 0.30 }),
        ]),
    }),
]);
