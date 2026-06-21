import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StaffUsersHomeScreen } from '../screens/StaffUsersHomeScreen';
import { StaffUserFormScreen } from '../screens/StaffUserFormScreen';
import { StaffUsersStackParamList } from './types';
import { headerScreenOptions } from '../theme/navigation';

const Stack = createNativeStackNavigator<StaffUsersStackParamList>();

export function StaffUsersNavigator() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="StaffUsersHome"
        component={StaffUsersHomeScreen}
        options={{ title: 'Staff users' }}
      />
      <Stack.Screen
        name="StaffUserForm"
        component={StaffUserFormScreen}
        options={({ route }) => ({ title: route.params.id ? 'Edit user' : 'Add user' })}
      />
    </Stack.Navigator>
  );
}
