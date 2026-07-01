/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button } from "./UI";
import { motion } from "motion/react";
import { ShieldCheck, Mail, ArrowLeft, RotateCw } from "lucide-react";
import { ArtificialLogo } from "../App";

export const VerifyEmailPage: React.FC = () => {
  const { verifyingEmail, setVerifyingEmail, verifyEmail, resendOtp } = useAuth();
  const { toast } = useToast();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Focus references for the 6 boxes
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Countdown timer logic
  useEffect(() => {
    if (countdown === 0) return;
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow single character digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        // Clear previous and move focus back
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      } else {
        // Clear current index
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasteData)) {
      toast("Please paste a valid 6-digit numeric verification code", "error");
      return;
    }

    const digits = pasteData.split("");
    setOtp(digits);

    // Auto-focus the last box
    if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      toast("Please enter all 6 digits of the verification code", "error");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(verifyingEmail || "", code);
      toast("Email verified successfully! Welcome to DevVault.", "success");
    } catch (err: any) {
      toast(err.message || "Email verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      await resendOtp(verifyingEmail || "");
      toast("A new verification code has been sent.", "success");
      setCountdown(60);
      setOtp(Array(6).fill(""));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err: any) {
      toast(err.message || "Failed to resend verification code", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100/30 dark:bg-zinc-950/20 relative overflow-hidden px-4 transition-colors duration-300">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 bg-transparent mb-2 text-brand-500">
            <ArtificialLogo className="h-10 w-16" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight font-sans">
            DevVault
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-1 select-none">
            Security OTP verification
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white/80 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-md transition-colors duration-300">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
            <button
              onClick={() => setVerifyingEmail(null)}
              className="p-1.5 rounded-lg text-zinc-450 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-zinc-850 dark:text-white uppercase tracking-wider font-mono">
                Verify Your Identity
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                We sent a 6-digit code to <span className="font-semibold text-zinc-700 dark:text-zinc-300">{verifyingEmail}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* OTP Input Grid */}
            <div className="flex justify-between gap-2.5">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    if (el) inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-xl font-bold bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none backdrop-blur-md"
                  required
                />
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                className="w-full py-3 font-semibold"
                type="submit"
                isLoading={loading}
              >
                Verify Code & Enter Workspace
              </Button>

              <div className="flex items-center justify-between text-xs mt-2 px-1">
                <span className="text-zinc-500">
                  Didn't receive code?
                </span>
                
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || resending}
                  className={`inline-flex items-center gap-1.5 font-semibold text-xs cursor-pointer select-none transition-colors ${
                    countdown > 0 || resending
                      ? "text-zinc-400 dark:text-zinc-650 cursor-not-allowed"
                      : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-500"
                  }`}
                >
                  {resending && <RotateCw className="h-3 w-3 animate-spin" />}
                  {countdown > 0 ? `Resend OTP (${countdown}s)` : "Resend OTP"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Security Footprint */}
        <div className="flex items-center justify-center gap-2 text-center mt-6 text-[11px] text-zinc-550 dark:text-zinc-600 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>DevVault Shield Core Encryption Active</span>
        </div>
      </motion.div>
    </div>
  );
};
