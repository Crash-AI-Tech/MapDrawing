'use server';

import {
  requestPasswordReset as requestPasswordResetImpl,
  resetPassword as resetPasswordImpl,
} from '@mapdrawing/server/actions/reset-password';

export interface ResetRequestState {
  error?: string;
  step?: 'code';
  email?: string;
}

export interface ResetPasswordState {
  error?: string;
  success?: boolean;
}

export async function requestPasswordReset(
  previous: ResetRequestState | null,
  formData: FormData,
): Promise<ResetRequestState> {
  return requestPasswordResetImpl(previous, formData);
}

export async function resetPassword(
  previous: ResetPasswordState | null,
  formData: FormData,
): Promise<ResetPasswordState> {
  return resetPasswordImpl(previous, formData);
}
