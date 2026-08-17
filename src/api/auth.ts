import { api } from './client';
import type { Gender, User } from './types';

export async function register(payload: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  birth_date: string;
  gender: Gender;
  privacy_policy_accepted: boolean;
  terms_accepted: boolean;
}): Promise<{ token: string; user: User }> {
  const { data } = await api.post('/register', payload);
  return data;
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const { data } = await api.post('/login', { email, password });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/logout');
}

export async function getMe(): Promise<{ user: User }> {
  const { data } = await api.get('/user');
  return data;
}

export async function updateMe(payload: {
  name: string;
  email: string;
  birth_date: string;
  gender: Gender;
}): Promise<{ user: User }> {
  const { data } = await api.put('/user', payload);
  return data;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await api.post('/forgot-password', { email });
  return data;
}

export async function resetPassword(
  token: string,
  email: string,
  password: string,
  password_confirmation: string,
): Promise<{ message: string }> {
  const { data } = await api.post('/reset-password', { token, email, password, password_confirmation });
  return data;
}
