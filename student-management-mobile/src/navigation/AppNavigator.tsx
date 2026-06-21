import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { StudentFaceLoginScreen } from '../screens/StudentFaceLoginScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { StudentPortalScreen } from '../screens/StudentPortalScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { StudentPhotoScreen } from '../screens/StudentPhotoScreen';
import { SchoolsScreen } from '../screens/SchoolsScreen';
import { StudentsScreen } from '../screens/StudentsScreen';
import { StudentBrowseScreen } from '../screens/StudentBrowseScreen';
import { StudentDetailScreen } from '../screens/StudentDetailScreen';
import { StudentTranscriptScreen } from '../screens/StudentTranscriptScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { TeachersScreen } from '../screens/TeachersScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SupervisorsNavigator } from './SupervisorsNavigator';
import { StaffUsersNavigator } from './StaffUsersNavigator';
import { SupervisorNavigator } from './SupervisorNavigator';
import { ExamScheduleNavigator } from './ExamScheduleNavigator';
import { CheatingNavigator } from './CheatingNavigator';
import {
  isStudent,
  isSupervisorUser,
  isAdministration,
  isFullAdmin,
  isRegionOrDistrictScopeUser,
  isScopedStaff,
} from '../types';
import {
  AuthStackParamList,
  DashboardStackParamList,
  RootTabParamList,
  StudentsStackParamList,
} from './types';
import { colors } from '../theme/colors';
import { headerScreenOptions, tabScreenOptions } from '../theme/navigation';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();
const StudentsStack = createNativeStackNavigator<StudentsStackParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={headerScreenOptions}>
      <AuthStack.Screen
        name="StaffLogin"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="StudentFaceLogin"
        component={StudentFaceLoginScreen}
        options={{ title: 'Student face login' }}
      />
    </AuthStack.Navigator>
  );
}

function ChangePasswordStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChangePasswordRequired"
        component={ChangePasswordScreen}
        options={{
          title: 'Change password',
          ...headerScreenOptions,
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

function StudentMainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentPortal"
        component={StudentPortalScreen}
        options={{
          title: 'Student portal',
          ...headerScreenOptions,
        }}
      />
    </Stack.Navigator>
  );
}

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={headerScreenOptions}>
      <DashboardStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <DashboardStack.Screen
        name="StudentPhoto"
        component={StudentPhotoScreen}
        options={{ title: 'Student Photo' }}
      />
    </DashboardStack.Navigator>
  );
}

function StudentsNavigator() {
  return (
    <StudentsStack.Navigator screenOptions={headerScreenOptions}>
      <StudentsStack.Screen
        name="StudentBrowse"
        component={StudentBrowseScreen}
        options={{ title: 'Students' }}
      />
      <StudentsStack.Screen
        name="StudentsList"
        component={StudentsScreen}
        options={{ title: 'Quick search' }}
      />
      <StudentsStack.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
        options={{ title: 'Student' }}
      />
      <StudentsStack.Screen
        name="StudentTranscript"
        component={StudentTranscriptScreen}
        options={{ title: 'Transcript' }}
      />
    </StudentsStack.Navigator>
  );
}

function AdministrationTabs() {
  const { user } = useAuth();
  const scopeType = user?.accessScope?.scopeType;
  const showStaffUsers = isFullAdmin(user);
  const regionDistrictScope = isRegionOrDistrictScopeUser(user);
  const fullAdminTabs =
    isFullAdmin(user) || (!isScopedStaff(user) && isAdministration(user));
  const showExtendedAdmin =
    fullAdminTabs || (isScopedStaff(user) && scopeType === 'school_level');
  const showSupervisors = showExtendedAdmin || regionDistrictScope;

  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Schools" component={SchoolsScreen} />
      <Tab.Screen
        name="Students"
        component={StudentsNavigator}
        options={{ headerShown: false }}
      />
      {showExtendedAdmin ? (
        <>
          <Tab.Screen name="Attendance" component={AttendanceScreen} />
          <Tab.Screen
            name="Exams"
            component={ExamScheduleNavigator}
            options={{ headerShown: false, title: 'Exams' }}
          />
          <Tab.Screen
            name="Cheating"
            component={CheatingNavigator}
            options={{ headerShown: false, title: 'Cheating' }}
          />
          <Tab.Screen name="Teachers" component={TeachersScreen} />
          {!regionDistrictScope ? (
            <Tab.Screen
              name="Supervisors"
              component={SupervisorsNavigator}
              options={{ headerShown: false }}
            />
          ) : null}
        </>
      ) : null}
      {!showExtendedAdmin && showSupervisors ? (
        <Tab.Screen
          name="Supervisors"
          component={SupervisorsNavigator}
          options={{ headerShown: false }}
        />
      ) : null}
      {showStaffUsers && fullAdminTabs ? (
        <Tab.Screen
          name="StaffUsers"
          component={StaffUsersNavigator}
          options={{ headerShown: false, title: 'Users', tabBarLabel: 'Users' }}
        />
      ) : null}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainAppStack() {
  const { user, mustChangePassword } = useAuth();

  if (mustChangePassword) {
    return <ChangePasswordStack />;
  }
  if (isStudent(user)) {
    return <StudentMainStack />;
  }
  if (isSupervisorUser(user) && !isAdministration(user)) {
    return <SupervisorNavigator />;
  }
  return <AdministrationTabs />;
}

export function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainAppStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
