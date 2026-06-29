/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle, AlertCircle, Info, Loader2 } from "lucide-react";

// =========================================================
// SLEEK REUSABLE BUTTON
// =========================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 outline-none select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 border border-transparent shadow-lg shadow-indigo-500/10 active:scale-98",
    secondary: "bg-white dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/80 shadow-sm active:scale-98 backdrop-blur-sm",
    danger: "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 shadow-sm active:scale-98 backdrop-blur-sm",
    accent: "bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40 shadow-sm active:scale-98 backdrop-blur-sm",
    ghost: "bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-3",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
      {!isLoading && children}
    </button>
  );
};

// =========================================================
// SLATE STYLE INPUT
// =========================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none tracking-wide">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none py-2.5 backdrop-blur-md ${
            icon ? "pl-10" : "pl-3.5"
          } pr-3.5 ${error ? "border-red-300 dark:border-red-950/60 focus:border-red-500 dark:focus:border-red-800/80 focus:ring-red-500 dark:focus:ring-red-800/80" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </div>
  );
};

// =========================================================
// TEXTAREA
// =========================================================
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 select-none tracking-wide">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-650 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all outline-none p-3.5 min-h-[100px] backdrop-blur-md ${
          error ? "border-red-300 dark:border-red-950/60 focus:border-red-500 dark:focus:border-red-800/80 focus:ring-red-500 dark:focus:ring-red-800/80" : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400 font-medium mt-0.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </span>
      )}
    </div>
  );
};

// =========================================================
// BADGES / LABELS
// =========================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: "gray" | "green" | "blue" | "red" | "violet" | "yellow";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "gray" }) => {
  const styles = {
    gray: "bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300",
    green: "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    blue: "bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-600 dark:text-sky-400",
    red: "bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400",
    violet: "bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
    yellow: "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[variant]} backdrop-blur-sm`}>
      {children}
    </span>
  );
};

// =========================================================
// SLATE MODAL WITH TRANSITION
// =========================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/60 dark:bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900/85 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh] backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-150 dark:border-zinc-850 px-5 py-4">
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">{title}</h3>
              <button
                onClick={onClose}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// =========================================================
// TOAST NOTIFICATIONS MANAGER
// =========================================================
export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} item={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

const ToastItem: React.FC<{ item: ToastMessage; onDismiss: () => void }> = ({
  item,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    success: <CheckCircle className="h-4 w-4 text-emerald-550 dark:text-emerald-400" />,
    error: <AlertCircle className="h-4 w-4 text-red-550 dark:text-red-400" />,
    info: <Info className="h-4 w-4 text-sky-550 dark:text-sky-400" />,
  };

  const borders = {
    success: "border-emerald-200 dark:border-emerald-950/60 bg-emerald-50 dark:bg-emerald-950/20",
    error: "border-red-200 dark:border-red-950/60 bg-red-50 dark:bg-red-950/20",
    info: "border-sky-200 dark:border-sky-950/60 bg-sky-50 dark:bg-sky-950/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`pointer-events-auto flex items-start gap-3 border rounded-xl p-3.5 shadow-lg select-none relative ${borders[item.type]}`}
    >
      <div className="mt-0.5">{icons[item.type]}</div>
      <p className="text-xs text-zinc-700 dark:text-zinc-200 font-medium leading-relaxed pr-6">{item.message}</p>
      <button
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
};
