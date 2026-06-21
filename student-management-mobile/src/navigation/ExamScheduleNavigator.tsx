import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExamScheduleHomeScreen } from '../screens/ExamScheduleHomeScreen';
import { ExamSubjectsScreen } from '../screens/ExamSubjectsScreen';
import { ExamTimetableScreen } from '../screens/ExamTimetableScreen';
import { ExamScheduleStackParamList } from './types';
import { headerScreenOptions } from '../theme/navigation';

const Stack = createNativeStackNavigator<ExamScheduleStackParamList>();

export function ExamScheduleNavigator() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen
        name="ExamScheduleHome"
        component={ExamScheduleHomeScreen}
        options={{ title: 'Exam timetable' }}
      />
      <Stack.Screen
        name="ExamSubjects"
        component={ExamSubjectsScreen}
        options={{ title: 'Exam subjects' }}
      />
      <Stack.Screen
        name="ExamTimetable"
        component={ExamTimetableScreen}
        options={{ title: 'Exam days & shifts' }}
      />
    </Stack.Navigator>
  );
}
