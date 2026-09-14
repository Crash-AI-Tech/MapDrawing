'use server';

import { login as loginImpl } from '@mapdrawing/server/actions/login';

export interface LoginState {
  error?: string;
  step?: 'verify';
  email?: string;
}

export async function login(
  previous: LoginState | null,
  formData: FormData,
): Promise<LoginState> {
  return loginImpl(previous, formData);
}
