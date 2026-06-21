import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SupervisorCenterScreen } from '../screens/SupervisorCenterScreen';
import { SupervisorFindStudentScreen } from '../screens/SupervisorFindStudentScreen';
import { SupervisorAttendanceScreen } from '../screens/SupervisorAttendanceScreen';
import { SupervisorCheatingNavigator } from './SupervisorCheatingNavigator';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SupervisorTabParamList } from './types';
import { tabScreenOptions } from '../theme/navigation';

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

export function SupervisorNavigator() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="MyCenter"
        component={SupervisorCenterScreen}
        options={{ title: 'My center', tabBarLabel: 'Center' }}
      />
      <Tab.Screen
        name="FindStudent"
        component={SupervisorFindStudentScreen}
        options={{ title: 'Find student', tabBarLabel: 'Find ID' }}
      />
      <Tab.Screen
        name="ExamAttendance"
        component={SupervisorAttendanceScreen}
        options={{ title: 'Exam attendance', tabBarLabel: 'Attendance' }}
      />
      <Tab.Screen
        name="Cheating"
        component={SupervisorCheatingNavigator}
        options={{ headerShown: false, title: 'Cheating reports', tabBarLabel: 'Cheating' }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
