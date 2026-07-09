// Native BusMapView — uses react-native-maps
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';

interface BusMapViewProps {
  busCoord: { latitude: number; longitude: number };
  schoolCoord: { latitude: number; longitude: number };
  busLabel: string;
  busRoute: string;
}

export default function BusMapView({ busCoord, schoolCoord, busLabel, busRoute }: BusMapViewProps) {
  return (
    <MapView
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={{
        latitude: busCoord.latitude,
        longitude: busCoord.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
    >
      <Marker coordinate={busCoord} title={busLabel} description={busRoute}>
        <View style={styles.busPinWrap}>
          <MaterialCommunityIcons name="bus" color="#fff" size={18} />
        </View>
      </Marker>
      <Marker coordinate={schoolCoord} title="KV School" description="Destination">
        <View style={styles.schoolPinWrap}>
          <MaterialCommunityIcons name="school" color="#fff" size={18} />
        </View>
      </Marker>
      <Polyline
        coordinates={[busCoord, schoolCoord]}
        strokeColor={Colors.primary}
        strokeWidth={3}
        lineDashPattern={[6, 4]}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 220 },
  busPinWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  schoolPinWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});
