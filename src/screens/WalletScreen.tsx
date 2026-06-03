import React from 'react';
import {View, Text, FlatList, Pressable, Image, StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {RootState} from '../store/store';
import {useTheme} from '../hooks/useTheme';
import {Pill} from '../components/Pill';
import {OwnedTicket} from '../types';

export const WalletScreen: React.FC = () => {
  const t = useTheme();
  const nav = useNavigation<any>();
  const tickets = useSelector((s: RootState) => s.wallet.tickets);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: t.bg.primary}]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: t.text.primary}]}>Wallet</Text>
        <Text style={[styles.subtitle, {color: t.text.secondary}]}>
          {tickets.length} active {tickets.length === 1 ? 'ticket' : 'tickets'}
        </Text>
      </View>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{padding: 16, gap: 16}}
        renderItem={({item}) => (
          <TicketCard ticket={item} onPress={() => nav.navigate('TicketDetail', {ticket: item})} t={t} />
        )}
        ListEmptyComponent={
          <View style={{padding: 60, alignItems: 'center'}}>
            <Text style={{color: t.text.secondary}}>No tickets yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const TicketCard: React.FC<{ticket: OwnedTicket; onPress: () => void; t: any}> = ({ticket, onPress, t}) => {
  const e = ticket.event;
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: t.bg.secondary,
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: t.border.subtle,
      }}>
      <View style={{flexDirection: 'row'}}>
        <Image source={{uri: e.flyer_url}} style={{width: 110, height: 130}} />
        <View style={{flex: 1, padding: 14, justifyContent: 'space-between'}}>
          <View>
            <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1}}>
              {e.start_time}
            </Text>
            <Text
              style={{color: t.text.primary, fontSize: 17, fontWeight: '700', marginTop: 4}}
              numberOfLines={2}>
              {e.title}
            </Text>
            <Text style={{color: t.text.secondary, fontSize: 12.5, marginTop: 4}}>
              {e.venue.display_name}
            </Text>
          </View>
          <View style={{flexDirection: 'row', gap: 6, flexWrap: 'wrap'}}>
            <Pill
              label={`${ticket.quantity} ${ticket.option.name}`}
              accent="beam"
              size="sm"
            />
            <Pill label="Show QR at entry" accent="aurora" size="sm" />
          </View>
        </View>
      </View>
      <View style={[styles.cardDashed, {borderColor: t.border.subtle}]} />
      <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12}}>
        <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '600'}}>ORDER {ticket.order_id.toUpperCase()}</Text>
        <Text style={{color: t.accents.aurora.base, fontSize: 12, fontWeight: '700'}}>VIEW PASS ›</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12},
  title: {fontSize: 32, fontWeight: '800', letterSpacing: -0.5},
  subtitle: {fontSize: 14, marginTop: 4},
  cardDashed: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: 14,
  },
});
