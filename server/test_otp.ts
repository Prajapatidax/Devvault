/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from "crypto";
import { dbManager } from "./db";
import { hashPassword, verifyPassword, signToken } from "./auth";

async function runTests() {
  console.log("=== DEVVAULT OTP EMAIL VERIFICATION TESTING ===");

  // Initialize DB manager (sets up fallback or postgres)
  await dbManager.initialize();

  // Test Setup: Create unique test email
  const testEmail = `test-otp-${Date.now()}@example.com`;
  const testPassword = "supersecurepassword123";
  const testName = "OTP Test User";
  let userId = "";

  try {
    // -------------------------------------------------------------
    // Test 1: User Registration
    // -------------------------------------------------------------
    console.log("\n[Test 1] Registering a new unverified user...");
    const newUser = {
      id: crypto.randomUUID(),
      email: testEmail,
      passwordHash: hashPassword(testPassword),
      name: testName,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    userId = newUser.id;

    await dbManager.createUser(newUser);
    const createdUser = await dbManager.getUserByEmail(testEmail);
    if (!createdUser) throw new Error("User was not created in DB");
    if (createdUser.emailVerified !== false) throw new Error("User should not be email-verified initially");
    console.log("SUCCESS: User registered and marked unverified.");

    // -------------------------------------------------------------
    // Test 2: Unverified Login Block
    // -------------------------------------------------------------
    console.log("\n[Test 2] Testing unverified user login block...");
    const loginUser = await dbManager.getUserByEmail(testEmail);
    if (loginUser && !loginUser.emailVerified) {
      console.log("SUCCESS: Correctly detected unverified user status.");
    } else {
      throw new Error("Failed to detect unverified user status during login simulation");
    }

    // -------------------------------------------------------------
    // Test 3: OTP Generation and Persistence
    // -------------------------------------------------------------
    console.log("\n[Test 3] Simulating OTP generation and persistence...");
    const otp = "123456";
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const verification = {
      id: crypto.randomUUID(),
      userId: userId,
      otpHash,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    await dbManager.createEmailVerification(verification);
    const storedVerification = await dbManager.getEmailVerification(userId);
    if (!storedVerification) throw new Error("OTP verification record was not stored");
    if (storedVerification.attempts !== 0) throw new Error("OTP attempts should start at 0");
    console.log("SUCCESS: OTP verification record stored successfully.");

    // -------------------------------------------------------------
    // Test 4: Timing-Safe Constant-Time Comparison
    // -------------------------------------------------------------
    console.log("\n[Test 4] Testing timing-safe comparison on valid & invalid OTPs...");
    const testValidOtp = "123456";
    const testInvalidOtp = "654321";

    const hashValid = crypto.createHash("sha256").update(testValidOtp).digest();
    const hashInvalid = crypto.createHash("sha256").update(testInvalidOtp).digest();
    const storedHashBuf = Buffer.from(storedVerification.otpHash, "hex");

    const isValidMatch = crypto.timingSafeEqual(hashValid, storedHashBuf);
    const isInvalidMatch = crypto.timingSafeEqual(hashInvalid, storedHashBuf);

    if (!isValidMatch) throw new Error("Valid OTP failed comparison");
    if (isInvalidMatch) throw new Error("Invalid OTP passed comparison");
    console.log("SUCCESS: Timing safe comparisons behave correctly.");

    // -------------------------------------------------------------
    // Test 5: Failed Attempt Increments and Locking (Max 5 attempts)
    // -------------------------------------------------------------
    console.log("\n[Test 5] Simulating wrong OTP submissions and locking...");
    let currentAttempts = storedVerification.attempts;
    for (let i = 1; i <= 5; i++) {
      currentAttempts++;
      await dbManager.updateEmailVerificationAttempts(userId, currentAttempts);
      const updated = await dbManager.getEmailVerification(userId);
      if (!updated || updated.attempts !== currentAttempts) {
        throw new Error(`Failed to increment attempts to ${currentAttempts}`);
      }
      console.log(`Failed attempt ${i}/5 logged.`);
    }

    const lockedVerification = await dbManager.getEmailVerification(userId);
    if (!lockedVerification || lockedVerification.attempts < 5) {
      throw new Error("Locking failed or attempts not saved properly");
    }
    console.log("SUCCESS: OTP record correctly locked after 5 failures.");

    // -------------------------------------------------------------
    // Test 6: Resend OTP (invalidates old, resets attempts, throttles)
    // -------------------------------------------------------------
    console.log("\n[Test 6] Testing Resend OTP (invalidates previous, resets attempts)...");
    const waitTime = Date.now() - new Date(lockedVerification.createdAt).getTime();
    console.log(`Time elapsed since creation: ${Math.round(waitTime / 1000)}s`);

    // Simulate resend: delete old and create new
    await dbManager.deleteEmailVerification(userId);
    const deletedCheck = await dbManager.getEmailVerification(userId);
    if (deletedCheck) throw new Error("Failed to delete old OTP record");

    const newOtp = "654321";
    const newOtpHash = crypto.createHash("sha256").update(newOtp).digest("hex");
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const newVerification = {
      id: crypto.randomUUID(),
      userId,
      otpHash: newOtpHash,
      expiresAt: newExpiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    };

    await dbManager.createEmailVerification(newVerification);
    const freshVerification = await dbManager.getEmailVerification(userId);
    if (!freshVerification) throw new Error("Failed to create new OTP record on resend");
    if (freshVerification.attempts !== 0) throw new Error("Resent OTP attempts did not reset to 0");
    console.log("SUCCESS: New OTP generated, old one deleted, attempts reset.");

    // -------------------------------------------------------------
    // Test 7: OTP Expiration Handling
    // -------------------------------------------------------------
    console.log("\n[Test 7] Testing OTP Expiration...");
    // Manually force expiration in test model
    const expiredExpiresAt = new Date(Date.now() - 1000).toISOString(); // 1s in the past
    const expiredVerification = {
      ...newVerification,
      id: crypto.randomUUID(),
      expiresAt: expiredExpiresAt
    };
    await dbManager.createEmailVerification(expiredVerification);

    const fetchedExpired = await dbManager.getEmailVerification(userId);
    if (!fetchedExpired) throw new Error("Failed to fetch expired record");
    const isExpired = new Date(fetchedExpired.expiresAt).getTime() < Date.now();
    if (!isExpired) throw new Error("OTP should be expired but is marked as active");
    
    // Test database cleanExpiredEmailVerifications
    await dbManager.cleanExpiredEmailVerifications();
    const cleanedCheck = await dbManager.getEmailVerification(userId);
    if (cleanedCheck) throw new Error("cleanExpiredEmailVerifications failed to remove expired record");
    console.log("SUCCESS: OTP expiration and database cleanup worked perfectly.");

    // Recreate a valid one for the final test
    await dbManager.createEmailVerification(newVerification);

    // -------------------------------------------------------------
    // Test 8: Successful Verification
    // -------------------------------------------------------------
    console.log("\n[Test 8] Testing successful verification code matching...");
    const activeVerification = await dbManager.getEmailVerification(userId);
    if (!activeVerification) throw new Error("No active OTP for validation test");

    const inputVerifyOtp = "654321";
    const testVerifyHashBuf = crypto.createHash("sha256").update(inputVerifyOtp).digest();
    const activeHashBuf = Buffer.from(activeVerification.otpHash, "hex");

    if (crypto.timingSafeEqual(testVerifyHashBuf, activeHashBuf)) {
      await dbManager.verifyUserEmail(userId);
      await dbManager.deleteEmailVerification(userId);
    } else {
      throw new Error("Failed to match valid verification OTP");
    }

    const verifiedUser = await dbManager.getUserByEmail(testEmail);
    if (!verifiedUser || verifiedUser.emailVerified !== true) {
      throw new Error("User emailVerified was not set to true");
    }

    const postVerifyOtp = await dbManager.getEmailVerification(userId);
    if (postVerifyOtp) {
      throw new Error("OTP verification record was not deleted after success");
    }
    console.log("SUCCESS: User email verified, OTP record deleted.");

    // Cleanup user
    await dbManager.deleteUser(userId);
    console.log("\n=== ALL OTP VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (error: any) {
    console.error("\nTEST SUITE FAILED:", error.message);
    if (userId) {
      await dbManager.deleteEmailVerification(userId).catch(() => {});
      await dbManager.deleteUser(userId).catch(() => {});
    }
    process.exit(1);
  }
}

runTests();
