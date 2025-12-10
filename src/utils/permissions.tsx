// src/utils/permissions.ts
import { Alert, Platform, Linking } from 'react-native';
import { 
  request, 
  check, 
  PERMISSIONS, 
  RESULTS,
  Permission 
} from 'react-native-permissions';

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const permission: Permission = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const result = await check(permission);

    if (result === RESULTS.GRANTED) {
      return true;
    }

    const requestResult = await request(permission);

    if (requestResult === RESULTS.GRANTED) {
      return true;
    } else if (requestResult === RESULTS.DENIED) {
      Alert.alert(
        'Location Permission',
        'Location permission is required to find nearby Pokémon',
        [{ text: 'OK' }]
      );
      return false;
    } else if (requestResult === RESULTS.BLOCKED) {
      Alert.alert(
        'Permission Blocked',
        'Please enable location permission in your device settings',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return false;
    }

    return false;
  } catch (error) {
    console.error('Location permission error:', error);
    return false;
  }
};