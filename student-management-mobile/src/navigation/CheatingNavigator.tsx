import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CheatingIncidentsScreen } from '../screens/CheatingIncidentsScreen';
import { CheatingFormScreen } from '../screens/CheatingFormScreen';
import { CheatingStackParamList } from './types';
import { headerScreenOptions } from '../theme/navigation';

const Stack = createNativeStackNavigator<CheatingStackParamList>();

export function CheatingNavigator() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="CheatingIncidents"
        component={CheatingIncidentsScreen}
        options={{ title: 'Cheating reports' }}
      />
      <Stack.Screen
        name="CheatingForm"
        component={CheatingFormScreen}
        options={({ route }) => ({
          title: route.params?.id ? 'Edit cheating report' : 'Report cheating',
        })}
      />
    </Stack.Navigator>
  );
}
