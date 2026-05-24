import { Hackathon, TrackedApplication } from './types';

// -------------------------------------------------------------
// HISTORICAL / PRE-CONFIGURED POPULAR WORKING FORGES
// -------------------------------------------------------------
export const INITIAL_HACKATHONS: Hackathon[] = [
  {
    id: 'h-1',
    title: 'AGI Frontiers',
    prizePool: '$500,000',
    deadline: '2026-06-15',
    tags: ['AI/ML', 'Web3', 'Agents'],
    location: 'San Francisco / Online',
    statusLabel: 'Live Now',
    apiStatus: 'open',
    participantsCount: 1200,
    description: 'Forge the sovereign artificial general intelligence middleware. Highly technical, raw algorithmic implementations only.',
    cardShadow: '#ffcc00',
  },
  {
    id: 'h-2',
    title: 'DeFi Summer Hack',
    prizePool: '$150,000',
    deadline: '2026-06-03',
    tags: ['Solidity', 'DeFi', 'Rust', 'EVM'],
    location: 'Global Remote',
    statusLabel: 'Open for Registration',
    apiStatus: 'open',
    participantsCount: 850,
    description: 'Deconstruct legacy liquidity routing protocols. Build highly efficient AMMs and zero-knowledge privacy pools.',
    cardShadow: '#0055ff',
  },
  {
    id: 'h-3',
    title: 'Weimar Cyber Artisan',
    prizePool: '$75,000',
    deadline: '2026-07-20',
    tags: ['React', 'CSS', 'Design', 'Canvas'],
    location: 'Weimar / Online',
    statusLabel: 'Upcoming',
    apiStatus: 'upcoming',
    participantsCount: 420,
    description: 'A tribute to the Bauhaus centenary of 1923. Build web interfaces that demonstrate radical visual honesty and functional purity.',
    cardShadow: '#e63b2e',
  },
  {
    id: 'h-4',
    title: 'Zero-Knowledge Crucible',
    prizePool: '$250,000',
    deadline: '2026-08-10',
    tags: ['Cryptography', 'Circom', 'Rust', 'Privacy'],
    location: 'Zurich / Online',
    statusLabel: 'Upcoming',
    apiStatus: 'upcoming',
    participantsCount: 610,
    description: 'Construct anonymous credential verifiers and stealth transaction systems for web decentralization.',
    cardShadow: '#1a1a1a',
  },
];

export const VALIDATION_TAGLINES = [
  'Parsing pitch architecture against global forge standards...',
  'Cross-referencing feasibility with 36-hour execution windows...',
  'Measuring originality against saturated market wrappers...',
  'Evaluating brutalist directness of core utility...',
  'Simulating jury scoring across technical depth and impact...',
];
