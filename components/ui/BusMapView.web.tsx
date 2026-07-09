// Web stub for BusMapView — react-native-maps is native-only
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface BusMapViewProps {
  busCoord: { latitude: number; longitude: number };
  schoolCoord: { latitude: number; longitude: number };
  busLabel: string;
  busRoute: string;
}

export default function BusMapView({ busLabel, busRoute }: BusMapViewProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="map-marker-path" color={Colors.primary} size={40} />
      <Text style={styles.title}>{busLabel}</Text>
      <Text style={styles.sub}>{busRoute}</Text>
      <Text style={styles.note}>Live map available on iOS & Android</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary },
  note: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
});
