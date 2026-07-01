/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  verifyingEmail: string | null;
  setVerifyingEmail: (email: string | null) => void;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);

  // Restore session from localStorage on load
  useEffect(() => {
    const savedToken = localStorage.getItem("devvault_token");
    const savedUser = localStorage.getItem("devvault_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.error === "email_not_verified") {
          setVerifyingEmail(email);
        }
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("devvault_token", data.token);
      localStorage.setItem("devvault_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setVerifyingEmail(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Registration successful. Set verification state so we show OTP Verify UI
      setVerifyingEmail(email);
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      localStorage.setItem("devvault_token", data.token);
      localStorage.setItem("devvault_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setVerifyingEmail(null);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email: string) => {
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to resend code");
    }
  };

  const logout = () => {
    localStorage.removeItem("devvault_token");
    localStorage.removeItem("devvault_user");
    setToken(null);
    setUser(null);
    setVerifyingEmail(null);
  };

  /**
   * Helper to perform authenticated API calls
   */
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized, trigger logout automatically
    if (res.status === 401 && token) {
      logout();
    }

    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, apiFetch, verifyingEmail, setVerifyingEmail, verifyEmail, resendOtp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
