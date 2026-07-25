/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Lock, 
  FileText, 
  Mail, 
  CheckCircle2, 
  EyeOff, 
  Database, 
  KeyRound, 
  Server,
  UserCheck
} from "lucide-react";
import { Button } from "./UI";
import { ArtificialLogo } from "../App";

interface LegalPagesProps {
  initialTab?: "terms" | "privacy";
  onBack: () => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({
  initialTab = "terms",
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">(initialTab);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-brand-500/5 to-transparent blur-[140px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12 z-10 relative">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-5 mb-8">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onBack}>
            <ArtificialLogo className="h-8 w-12 text-brand-500" />
            <div>
              <span className="font-bold text-base md:text-lg tracking-tight text-zinc-900 dark:text-white">DevVault</span>
              <span className="block text-[9px] text-zinc-500 font-mono">LEGAL & PRIVACY POLICIES</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onBack} className="text-xs group">
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
            Back
          </Button>
        </header>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-850 mb-8 max-w-md">
          <button
            onClick={() => setActiveTab("terms")}
            className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "terms"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <FileText className="h-4 w-4" />
            Terms & Conditions
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "privacy"
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Privacy Policy
          </button>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/80 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 md:p-10 shadow-xl backdrop-blur-md"
        >
          {activeTab === "terms" ? (
            /* TERMS & CONDITIONS */
            <div className="space-y-8 text-zinc-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-mono mb-3">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Effective Date: 24 July 2026</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  DevVault Terms & Conditions
                </h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-xs">
                  Please read these Terms & Conditions carefully before provisioning or interacting with your DevVault local-first developer workstation.
                </p>
              </div>

              <hr className="border-zinc-200 dark:border-zinc-850" />

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  1. Acceptance of Terms & Service Scope
                </h3>
                <p>
                  By creating a DevVault account, accessing the developer dashboard, or utilizing integrated local tools (including Project Manager, Secrets Vault, Snippet Boards, Security Scanner, and Time Machine), you agree to be bound by these Terms & Conditions. If you do not agree, you must refrain from using the platform.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  2. Master Decryption Key & Security Responsibility
                </h3>
                <p>
                  DevVault operates under a <strong>Zero-Knowledge Architecture</strong>. Your master decryption password key is used client-side to generate AES-256 encryption keys. You acknowledge that:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-500 dark:text-zinc-400">
                  <li>DevVault servers do not store or possess your plaintext master key.</li>
                  <li>You are solely responsible for maintaining the confidentiality of your master key.</li>
                  <li>If you request a password reset, password reset tokens are single-use and strictly valid for <strong>10 minutes</strong> via verified email links.</li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  3. Local-First Data Sovereignty & Offline Integrity
                </h3>
                <p>
                  DevVault prioritizes local-first storage. All project metadata, snippets, notes, and environment credentials reside locally on your device or in client-side encrypted databases. You retain 100% ownership and intellectual property rights over all files, code, and content placed inside your vault.
                </p>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  4. Acceptable Use Policy
                </h3>
                <p>You agree not to use DevVault to:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-500 dark:text-zinc-400">
                  <li>Attempt unauthorized access to other user accounts or bypass API authentication.</li>
                  <li>Host, transmit, or distribute malicious code, malware, or destructive payloads.</li>
                  <li>Abuse API rate limits or interfere with server performance for other developer nodes.</li>
                </ul>
              </section>

              {/* Section 5 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  5. Account Termination & Data Export
                </h3>
                <p>
                  You may close your account or wipe your workspace at any time. Upon termination, you have the right to export your encrypted database payload before account purging. DevVault reserves the right to suspend accounts that violate security or acceptable use policies.
                </p>
              </section>

              {/* Section 6 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  6. Disclaimer of Warranties & Limitation of Liability
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400">
                  DevVault is provided "AS IS" without warranties of any kind, express or implied. DevVault is not liable for data loss caused by lost master decryption keys, local hardware failures, or unbacked-up client states.
                </p>
              </section>
            </div>
          ) : (
            /* PRIVACY POLICY */
            <div className="space-y-8 text-zinc-700 dark:text-zinc-300 text-xs md:text-sm leading-relaxed">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-xs font-mono mb-3">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Privacy First & Zero-Knowledge Architecture</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  DevVault Privacy Policy
                </h1>
                <p className="mt-2 text-zinc-500 dark:text-zinc-400 text-xs">
                  Your privacy is our core engineering requirement. Here is an explicit, transparent breakdown of what data we collect, why we collect it, and how your information is protected.
                </p>
              </div>

              <hr className="border-zinc-200 dark:border-zinc-850" />

              {/* Highlight Box: Why we collect Email */}
              <div className="p-4.5 rounded-xl border border-brand-500/30 bg-brand-500/5 dark:bg-brand-500/10">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-brand-500" />
                  Why We Collect Your Email Address
                </h3>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed mb-3">
                  We collect your email address strictly for essential workspace operations:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2">
                    <UserCheck className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 dark:text-white block">Identity Authentication</strong>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">To uniquely anchor your workspace instance and prevent account hijacking.</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2">
                    <KeyRound className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 dark:text-white block">10-Min Password Reset Links</strong>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">To send cryptographically signed, 10-minute expiring reset tokens when requested.</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2">
                    <Lock className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 dark:text-white block">OTP Verification Codes</strong>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Delivering secure 6-digit codes to verify account ownership during registration.</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-zinc-900 dark:text-white block">Security Leak Notices</strong>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Alerting you immediately if exposed API keys or tokens are detected in public repositories.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  1. Information We Collect
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-zinc-500 dark:text-zinc-400">
                  <li><strong>Account Credentials</strong>: Email address, full name, and PBKDF2 salted password hashes.</li>
                  <li><strong>Encrypted Vault Data</strong>: Projects, environment secrets, code snippets, notes, and expense records. (All vault payloads are encrypted client-side using AES-256-CBC).</li>
                  <li><strong>System Logs</strong>: Minimal diagnostic logs for debugging API failures and rate-limiting.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  2. Zero-Knowledge Security Model
                </h3>
                <p>
                  DevVault employs a Zero-Knowledge security architecture. Your secrets and private notes are encrypted client-side before transmission or synchronization. We cannot read, decrypt, sell, or analyze your vault contents.
                </p>
              </section>

              {/* Section 3 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  3. We Never Sell Your Personal Data
                </h3>
                <p className="text-zinc-650 dark:text-zinc-300">
                  We maintain a strict zero-ad policy. <strong>We do not sell, rent, trade, or share your email address or personal telemetry with third-party advertisers or data brokers under any circumstances.</strong>
                </p>
              </section>

              {/* Section 4 */}
              <section className="space-y-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  4. Data Rights & GDPR/CCPA Compliance
                </h3>
                <p>You maintain total control over your information:</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-500 dark:text-zinc-400">
                  <li><strong>Right to Export</strong>: Export your entire vault state into JSON or encrypted archives anytime.</li>
                  <li><strong>Right to Erasure (Forget Me)</strong>: Request complete deletion of your account, email logs, and stored credentials from our database.</li>
                  <li><strong>Right to Rectification</strong>: Update your profile name or master credentials via settings.</li>
                </ul>
              </section>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
