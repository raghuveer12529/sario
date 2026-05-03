export interface OtpSendResult {
  success: boolean;
  messageId?: string;
}

export interface IOtpProvider {
  sendOtp(phone: string, otp: string): Promise<OtpSendResult>;
}
