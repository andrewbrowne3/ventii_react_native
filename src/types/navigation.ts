import {Event, Profile, OwnedTicket} from './index';

export type AuthStackParamList = {
  Login: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  EventDetail: {event: Event};
  PublicProfile: {profile: Profile};
  Wallet: undefined;
  TicketDetail: {ticket: OwnedTicket};
  HostScan: undefined;
  Settings: undefined;
  CreateEvent: undefined;
  Search: {scope?: string} | undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  CalendarTab: undefined;
  AITab: undefined;
  ActivityTab: undefined;
  ProfileTab: undefined;
};
