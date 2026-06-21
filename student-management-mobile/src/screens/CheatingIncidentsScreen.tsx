import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheatingIncidentsPanel } from '../components/CheatingIncidentsPanel';
import { CheatingStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<CheatingStackParamList, 'CheatingIncidents'>;

export function CheatingIncidentsScreen({ navigation }: Props) {
  return (
    <CheatingIncidentsPanel
      onOpenForm={(params) => navigation.navigate('CheatingForm', params)}
    />
  );
}
