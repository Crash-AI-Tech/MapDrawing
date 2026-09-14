'use server';

import { register as registerImpl } from '@mapdrawing/server/actions/register';

export interface RegisterState {
  error?: string;
  step?: 'verify';
  email?: string;
}

export async function register(
  previous: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  return registerImpl(previous, formData);
}
