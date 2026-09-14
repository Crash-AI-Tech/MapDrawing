'use server';

import {
  resendVerificationCode as resendVerificationCodeImpl,
  verifyEmail as verifyEmailImpl,
} from '@mapdrawing/server/actions/verify';

export interface VerifyState {
  error?: string;
  success?: boolean;
}

export async function verifyEmail(
  previous: VerifyState | null,
  formData: FormData,
): Promise<VerifyState> {
  return verifyEmailImpl(previous, formData);
}

export async function resendVerificationCode(
  previous: VerifyState | null,
  formData: FormData,
): Promise<VerifyState> {
  return resendVerificationCodeImpl(previous, formData);
}
