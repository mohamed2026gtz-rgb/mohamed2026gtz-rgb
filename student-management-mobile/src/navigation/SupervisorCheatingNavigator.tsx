import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SupervisorCheatingScreen } from '../screens/SupervisorCheatingScreen';
import { CheatingFormScreen } from '../screens/CheatingFormScreen';
import { SupervisorCheatingStackParamList } from './types';
import { headerScreenOptions } from '../theme/navigation';

const Stack = createNativeStackNavigator<SupervisorCheatingStackParamList>();

export function SupervisorCheatingNavigator() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="SupervisorCheatingMain"
        component={SupervisorCheatingScreen}
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
