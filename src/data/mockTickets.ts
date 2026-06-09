import {OwnedTicket} from '../types';
import {EVENTS} from './mockEvents';

// PLACEHOLDER QR PAYLOADS — intentionally not real scannable codes.
// Per design guardrail: tickets must demo the UX but never look real enough
// to scam entry with.
export const OWNED_TICKETS: OwnedTicket[] = [
  {
    id: 'ot1',
    event: EVENTS[0],
    option: EVENTS[0].ticket_options[1], // VIP
    quantity: 1,
    status: 'active',
    purchased_at: '2026-10-15T19:23:00Z',
    qr_payload: 'VENTII-DEMO-XJ7Q-001',
    order_id: 'ord_001',
  },
  {
    id: 'ot2',
    event: EVENTS[2],
    option: EVENTS[2].ticket_options[0], // GA
    quantity: 2,
    status: 'active',
    purchased_at: '2026-10-20T11:42:00Z',
    qr_payload: 'VENTII-DEMO-PKW2-002',
    order_id: 'ord_002',
  },
];
