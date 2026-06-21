import { District, Region } from '../types';
import { getClient } from './apiClient';

export async function getRegions(search?: string): Promise<Region[]> {
  const client = await getClient();
  const { data } = await client.get<Region[]>('/api/regions', {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function getDistricts(regionId: number, search?: string): Promise<District[]> {
  const client = await getClient();
  const { data } = await client.get<District[]>(`/api/regions/${regionId}/districts`, {
    params: search ? { search } : undefined,
  });
  return data;
}
