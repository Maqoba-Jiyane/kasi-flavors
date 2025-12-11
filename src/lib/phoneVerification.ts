// lib/phoneVerification.ts
import { prisma } from "@/lib/prisma";
import { randomInt, createHash, timingSafeEqual } from "crypto";
import { addMinutes, isBefore } from "date-fns";
import { sendPhoneVerificationOtpWhatsApp } from "@/lib/twilio/verification";

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  const num = randomInt(0, 1000000);
  return num.toString().padStart(OTP_LENGTH, "0");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function ensurePhoneVerifiedOrStartVerification(args: {
  userId: string;
  fullName: string;
  phoneNumber: string;
}) {
  const { userId, fullName, phoneNumber } = args;

  // Normalize phone if you want (e.g. always include country code)
  const normalizedPhone = phoneNumber.trim();

  // 1) Check existing Phone record
  const existingPhone = await prisma.phone.findFirst({
    where: { userId, phoneNumber: normalizedPhone },
  });

  if (existingPhone?.verified) {
    return { status: "already_verified" as const };
  }

  // 2) Generate OTP and upsert verification record
  const code = generateOtp();
  const codeHash = hashCode(code);
  const expiresAt = addMinutes(new Date(), OTP_TTL_MINUTES);

  await prisma.phoneVerification.upsert({
    where: { phoneNumber: normalizedPhone },
    update: {
      userId,
      codeHash,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt,
    },
    create: {
      userId,
      phoneNumber: normalizedPhone,
      codeHash,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt,
    },
  });

  // 3) Send WhatsApp OTP (fire-and-forget ok; here we await for clarity)
  await sendPhoneVerificationOtpWhatsApp({
    toPhone: normalizedPhone,
    code,
    firstName: fullName.split(" ")[0] ?? fullName,
  });

  // Ensure Phone row exists (unverified)
  if (!existingPhone) {
    await prisma.phone.create({
      data: {
        userId,
        phoneNumber: normalizedPhone,
        verified: false,
      },
    });
  }

  return { status: "verification_started" as const };
}

export async function verifyPhoneOtp(args: {
  userId: string;
  phoneNumber: string;
  code: string;
}) {
  const { userId, phoneNumber, code } = args;
  const normalizedPhone = phoneNumber.trim();

  const record = await prisma.phoneVerification.findUnique({
    where: { phoneNumber: normalizedPhone },
  });

  if (!record) {
    return { ok: false, reason: "invalid" as const };
  }

  if (record.userId !== userId) {
    // Someone else trying to use this phone
    return { ok: false, reason: "invalid" as const };
  }

  if (record.attempts >= record.maxAttempts) {
    return { ok: false, reason: "locked" as const };
  }

  if (isBefore(record.expiresAt, new Date())) {
    return { ok: false, reason: "expired" as const };
  }

  const expectedHash = Buffer.from(record.codeHash, "hex");
  const providedHash = Buffer.from(hashCode(code), "hex");

  const match =
    expectedHash.length === providedHash.length &&
    timingSafeEqual(expectedHash, providedHash);

  const attempts = record.attempts + 1;

  await prisma.phoneVerification.update({
    where: { phoneNumber: normalizedPhone },
    data: { attempts },
  });

  if (!match) {
    return { ok: false, reason: "invalid" as const };
  }

  // Success: mark phone verified + delete verification record
  await prisma.$transaction([
    prisma.phone.updateMany({
      where: { userId, phoneNumber: normalizedPhone },
      data: { verified: true },
    }),
    prisma.phoneVerification.delete({
      where: { phoneNumber: normalizedPhone },
    }),
  ]);

  return { ok: true as const };
}
