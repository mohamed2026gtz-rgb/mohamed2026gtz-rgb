import { Supervisor, SupervisorAssignment, SupervisorLevel } from '../types';
import { getApiBaseUrl, getClient } from './apiClient';

export type SupervisorInput = Omit<Supervisor, 'id' | 'isActive'> & {
  /** Creates login account; supervisor must change on first sign-in */
  initialPassword?: string;
};

function base(level: SupervisorLevel) {
  return `/api/supervisors/${level}`;
}

export async function getSupervisors(
  level: SupervisorLevel,
  search?: string
): Promise<Supervisor[]> {
  const client = await getClient();
  const { data } = await client.get<Supervisor[]>(base(level), {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function getSupervisor(level: SupervisorLevel, id: number): Promise<Supervisor> {
  const client = await getClient();
  const { data } = await client.get<Supervisor>(`${base(level)}/${id}`);
  return data;
}

export async function createSupervisor(
  level: SupervisorLevel,
  body: SupervisorInput
): Promise<Supervisor & { loginAccountCreated?: boolean; message?: string }> {
  const client = await getClient();
  const { data } = await client.post(base(level), body);
  return data;
}

export async function updateSupervisor(
  level: SupervisorLevel,
  id: number,
  body: SupervisorInput
): Promise<Supervisor> {
  const client = await getClient();
  const { data } = await client.put<Supervisor>(`${base(level)}/${id}`, body);
  return data;
}

export async function deleteSupervisor(level: SupervisorLevel, id: number): Promise<void> {
  const client = await getClient();
  await client.delete(`${base(level)}/${id}`);
}

export async function getAssignments(
  level: SupervisorLevel,
  params?: { supervisorId?: number; centerId?: number; academicYear?: string }
): Promise<SupervisorAssignment[]> {
  const client = await getClient();
  const { data } = await client.get<SupervisorAssignment[]>(
    `${base(level)}/assignments/list`,
    { params }
  );
  return data;
}

export async function assignSupervisor(
  level: SupervisorLevel,
  body: {
    supervisorId: number;
    centerId: number;
    academicYear?: string;
    notes?: string;
  }
): Promise<{ id: number; message: string }> {
  const client = await getClient();
  const { data } = await client.post(`${base(level)}/assignments`, body);
  return data;
}

export async function removeAssignment(level: SupervisorLevel, id: number): Promise<void> {
  const client = await getClient();
  await client.delete(`${base(level)}/assignments/${id}`);
}

export async function uploadSupervisorPhoto(
  level: SupervisorLevel,
  id: number,
  photoUri: string
): Promise<Supervisor> {
  const apiBase = await getApiBaseUrl();
  const client = await getClient();
  const form = new FormData();
  form.append('photo', {
    uri: photoUri,
    name: 'supervisor.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data } = await client.post<Supervisor>(`${base(level)}/${id}/photo`, form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(apiBase.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {}),
    },
    timeout: 60000,
  });
  return data;
}
