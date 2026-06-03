/* Core entity types — shared across screens, slices, services. */

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture?: string;
  city: string;
  created_at: string;
}

export type ProfileType = 'place' | 'talent' | 'community' | 'brand';

export interface ProfileCapabilities {
  has_events: boolean;
  has_tickets: boolean;
  has_menu: boolean;        // Places only
  has_set_times: boolean;   // Talent only
  has_members: boolean;     // Communities only
  has_products: boolean;    // Brands only
  has_book_cta: boolean;
  has_follow_cta: boolean;
}

export interface Profile {
  id: string;
  type: ProfileType;
  handle: string;            // @breakaway-run-club
  display_name: string;
  tagline: string;
  bio: string;
  avatar_url: string;
  cover_url?: string;
  verified: boolean;
  follower_count: number;
  capabilities: ProfileCapabilities;
  location?: {city: string; neighborhood?: string};
  social?: {instagram?: string; website?: string};
}

export type EventStatus = 'upcoming' | 'live' | 'ended' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  flyer_url: string;        // Primary art
  date: string;              // ISO
  start_time: string;        // "10:00 PM"
  end_time?: string;
  status: EventStatus;
  description: string;
  vibe_tags: string[];       // ['Afrobeats', 'Rooftop', 'Late Night']
  music_tags: string[];      // genres / artists
  hosts: Profile[];          // Multiple hosts possible
  venue: Profile;            // Always a Place profile
  ticket_options: TicketOption[];
  deals: Deal[];
  cover_charge?: number;
  age_restriction?: string;  // '21+', '18+', 'All Ages'
  going_count: number;
  interested_count: number;
}

export interface TicketOption {
  id: string;
  name: string;              // 'GA', 'VIP', 'Bottle Service'
  description: string;
  price: number;             // in dollars
  fee: number;
  remaining?: number;
  perks: string[];
}

export interface Deal {
  id: string;
  title: string;             // '$3 Tequila Shots'
  description: string;
  valid_until?: string;      // ISO
  redeemed: boolean;
}

export type TicketStatus = 'active' | 'used' | 'expired' | 'transferred';

export interface OwnedTicket {
  id: string;
  event: Event;
  option: TicketOption;
  quantity: number;
  status: TicketStatus;
  purchased_at: string;
  qr_payload: string;        // PLACEHOLDER — not a real scannable QR (intentional)
  order_id: string;
}

// ───── Activity / Inbox ─────────────────────────────────────────────────

export type ActivityKind =
  | 'rsvp_friend'            // friend RSVP'd to an event you saved
  | 'event_starting'         // event you saved starting soon
  | 'host_message'           // partner host sent a message
  | 'deal_unlocked'          // deal became available
  | 'ticket_reminder'        // pre-arrival nudge
  | 'group_plan_vote';       // someone voted in a plan

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  actor?: Profile | User;
  event?: Event;
  message: string;
  created_at: string;
  read: boolean;
}

export type ThreadKind = 'partner' | 'friend';

export interface InboxThread {
  id: string;
  kind: ThreadKind;
  participant: Profile | User;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// ───── AI Concierge ─────────────────────────────────────────────────────

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggested_events?: Event[];
  created_at: string;
}
