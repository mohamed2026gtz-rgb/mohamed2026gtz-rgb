import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SupervisorsHomeScreen } from '../screens/SupervisorsHomeScreen';
import { SupervisorListScreen } from '../screens/SupervisorListScreen';
import { SupervisorFormScreen } from '../screens/SupervisorFormScreen';
import { AssignSupervisorScreen } from '../screens/AssignSupervisorScreen';
import { SupervisorAssignmentsScreen } from '../screens/SupervisorAssignmentsScreen';
import { ExamCenterDetailScreen } from '../screens/ExamCenterDetailScreen';
import { SupervisorsStackParamList } from './types';
import { headerScreenOptions } from '../theme/navigation';

const Stack = createNativeStackNavigator<SupervisorsStackParamList>();

export function SupervisorsNavigator() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="SupervisorsHome"
        component={SupervisorsHomeScreen}
        options={{ title: 'Supervisors' }}
      />
      <Stack.Screen
        name="SupervisorList"
        component={SupervisorListScreen}
        options={({ route }) => ({
          title: route.params.level === 'primary' ? 'Primary List' : 'Secondary List',
        })}
      />
      <Stack.Screen
        name="SupervisorForm"
        component={SupervisorFormScreen}
        options={({ route }) => ({
          title: route.params.id ? 'Edit Supervisor' : 'Add Supervisor',
        })}
      />
      <Stack.Screen
        name="AssignSupervisor"
        component={AssignSupervisorScreen}
        options={{ title: 'Assign to Center' }}
      />
      <Stack.Screen
        name="SupervisorAssignments"
        component={SupervisorAssignmentsScreen}
        options={{ title: 'Assignments' }}
      />
      <Stack.Screen
        name="ExamCenterDetail"
        component={ExamCenterDetailScreen}
        options={{ title: 'Exam Center' }}
      />
    </Stack.Navigator>
  );
}
