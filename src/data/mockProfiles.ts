import {Profile, ProfileCapabilities} from '../types';

const placeCaps: ProfileCapabilities = {
  has_events: true, has_tickets: true, has_menu: true, has_set_times: false,
  has_members: false, has_products: false, has_book_cta: true, has_follow_cta: true,
};
const talentCaps: ProfileCapabilities = {
  has_events: true, has_tickets: false, has_menu: false, has_set_times: true,
  has_members: false, has_products: false, has_book_cta: true, has_follow_cta: true,
};
const communityCaps: ProfileCapabilities = {
  has_events: true, has_tickets: true, has_menu: false, has_set_times: false,
  has_members: true, has_products: false, has_book_cta: false, has_follow_cta: true,
};
const brandCaps: ProfileCapabilities = {
  has_events: true, has_tickets: false, has_menu: false, has_set_times: false,
  has_members: false, has_products: true, has_book_cta: false, has_follow_cta: true,
};

export const PROFILES: Record<string, Profile> = {
  park_tavern: {
    id: 'p_park_tavern',
    type: 'place',
    handle: '@parktavern',
    display_name: 'Park Tavern',
    tagline: 'Piedmont Park • Patio + Rooftop',
    bio: 'Atlanta institution. American comfort food, generous patios, weekend brunch that runs late.',
    avatar_url: 'https://picsum.photos/seed/park_tavern/200',
    cover_url: 'https://picsum.photos/seed/park_tavern_cover/1200/600',
    verified: true,
    follower_count: 18420,
    capabilities: placeCaps,
    location: {city: 'Atlanta', neighborhood: 'Midtown'},
    social: {instagram: '@parktavern', website: 'parktavern.com'},
  },
  breakaway_run: {
    id: 'p_breakaway_run',
    type: 'community',
    handle: '@breakawayrunclub',
    display_name: 'Breakaway Run Club',
    tagline: 'Run. Recover. Repeat.',
    bio: 'A community for runners of every pace. Weekly group runs, post-run socials, training programs.',
    avatar_url: 'https://picsum.photos/seed/breakaway_run/200',
    cover_url: 'https://picsum.photos/seed/breakaway_cover/1200/600',
    verified: true,
    follower_count: 5230,
    capabilities: communityCaps,
    location: {city: 'Atlanta'},
    social: {instagram: '@breakawayatl'},
  },
  dj_kemi: {
    id: 't_dj_kemi',
    type: 'talent',
    handle: '@djkemi',
    display_name: 'DJ Kemi',
    tagline: 'Afrobeats • Amapiano • House',
    bio: 'Atlanta-based DJ blending Lagos and London. Residencies at The Mansion ATL and Cherry Lounge.',
    avatar_url: 'https://picsum.photos/seed/dj_kemi/200',
    cover_url: 'https://picsum.photos/seed/dj_kemi_cover/1200/600',
    verified: true,
    follower_count: 42100,
    capabilities: talentCaps,
    social: {instagram: '@djkemiatl'},
  },
  well_social_co: {
    id: 'b_well_social_co',
    type: 'brand',
    handle: '@wellsocialco',
    display_name: 'Well Social Co.',
    tagline: 'Wellness meets nightlife',
    bio: 'Sober-curious events. Mocktails, breathwork before the dance floor, recovery-focused after-parties.',
    avatar_url: 'https://picsum.photos/seed/well_social/200',
    verified: false,
    follower_count: 8900,
    capabilities: brandCaps,
    social: {instagram: '@wellsocialco'},
  },
  mansion_atl: {
    id: 'p_mansion',
    type: 'place',
    handle: '@themansionatl',
    display_name: 'The Mansion ATL',
    tagline: 'Buckhead • Open-air rooftop',
    bio: 'Three floors. Two rooftops. A different vibe on each one.',
    avatar_url: 'https://picsum.photos/seed/mansion/200',
    cover_url: 'https://picsum.photos/seed/mansion_cover/1200/600',
    verified: true,
    follower_count: 31100,
    capabilities: placeCaps,
    location: {city: 'Atlanta', neighborhood: 'Buckhead'},
  },
  cherry_lounge: {
    id: 'p_cherry',
    type: 'place',
    handle: '@cherrylounge',
    display_name: 'Cherry Lounge',
    tagline: 'Old Fourth Ward • Intimate dance floor',
    bio: 'Late-night cocktail lounge. House, disco, occasional live sets.',
    avatar_url: 'https://picsum.photos/seed/cherry/200',
    cover_url: 'https://picsum.photos/seed/cherry_cover/1200/600',
    verified: true,
    follower_count: 12300,
    capabilities: placeCaps,
    location: {city: 'Atlanta', neighborhood: 'Old Fourth Ward'},
  },
};

export const ALL_PROFILES = Object.values(PROFILES);
