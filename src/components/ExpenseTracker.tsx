/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Modal, Badge } from "./UI";
import { Plus, Search, DollarSign, Calendar, Tag, Trash2, TrendingUp, Layers, Activity } from "lucide-react";
import { Expense, ExpenseType } from "../types";

export const ExpenseTracker: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ExpenseType>(ExpenseType.SERVER);
  const [cost, setCost] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly" | "one-time">("monthly");
  const [nextRenewal, setNextRenewal] = useState("");
  const [description, setDescription] = useState("");

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load expenses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenCreateModal = () => {
    setLabel("");
    setType(ExpenseType.SERVER);
    setCost("");
    setBillingCycle("monthly");
    setNextRenewal("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !cost) {
      toast("Label and cost are required", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          label,
          type,
          cost: Number(cost),
          billingCycle,
          nextRenewal,
          description,
        }),
      });

      if (res.ok) {
        toast("Expense tracked successfully!", "success");
        setIsModalOpen(false);
        fetchExpenses();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to add expense", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to save expense", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense log?")) return;

    try {
      const res = await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Expense log deleted", "success");
        fetchExpenses();
      } else {
        toast("Failed to delete expense", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to delete expense", "error");
    }
  };

  // Cost Aggregators
  let monthlyTotal = 0;
  let yearlyTotal = 0;
  const distribution: { [key in ExpenseType]?: number } = {};

  expenses.forEach((e) => {
    let monthlyCost = 0;
    let yearlyCost = 0;

    if (e.billingCycle === "monthly") {
      monthlyCost = e.cost;
      yearlyCost = e.cost * 12;
    } else if (e.billingCycle === "yearly") {
      monthlyCost = e.cost / 12;
      yearlyCost = e.cost;
    } else if (e.billingCycle === "one-time") {
      monthlyCost = e.cost; // Assume in the current month
      yearlyCost = e.cost;
    }

    monthlyTotal += monthlyCost;
    yearlyTotal += yearlyCost;

    distribution[e.type] = (distribution[e.type] || 0) + monthlyCost;
  });

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.label.toLowerCase().includes(search.toLowerCase()) || 
      e.description.toLowerCase().includes(search.toLowerCase());
      
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Expense Tracker</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track infrastructure costs, API credits, domain subscriptions, and licenses.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="self-start">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </div>

      {/* Analytics Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Estimate */}
        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-sm shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono block">MONTHLY RUNRATE</span>
            <span className="text-xl font-bold text-zinc-855 dark:text-white font-mono">${monthlyTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Yearly Estimate */}
        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-sm shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono block">YEARLY ESTIMATE</span>
            <span className="text-xl font-bold text-zinc-855 dark:text-white font-mono">${yearlyTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Total services count */}
        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-sm shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono block">ACTIVE ACCOUNTS</span>
            <span className="text-xl font-bold text-zinc-855 dark:text-white font-mono">{expenses.length} logs</span>
          </div>
        </div>
      </div>

      {/* Distribution visual breakdown */}
      {expenses.length > 0 && (
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 backdrop-blur-sm">
          <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4 font-mono">Infrastructure Breakdown (Monthly)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(distribution).map(([t, val]) => {
              const pct = monthlyTotal > 0 ? (val! / monthlyTotal) * 100 : 0;
              return (
                <div key={t} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-zinc-650 dark:text-zinc-300 capitalize">{t}</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">${val!.toFixed(2)} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-650 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 backdrop-blur-md">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search subscriptions by label..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-850 dark:text-zinc-200 pl-9 pr-3 py-2 outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">TYPE</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none font-sans"
          >
            <option value="all">All Types</option>
            <option value="domain">Domain</option>
            <option value="server">Server</option>
            <option value="storage">Storage</option>
            <option value="ai-api">AI API</option>
            <option value="hosting">Hosting</option>
            <option value="subscription">Subscription</option>
            <option value="ssl">SSL Certs</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Expenses Log Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>QUERYING LEDGER SHEETS...</span>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">NO TRANSACTION ENTRIES</span>
          <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
            Track API credit limits or SaaS servers here to forecast runtime costs.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm">
          <table className="w-full text-left border-collapse text-xs select-text">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
                <th className="p-4 font-semibold">Expense Log</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Billing Rate</th>
                <th className="p-4 font-semibold">Next Renewal</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((e) => (
                <tr key={e.id} className="border-b border-zinc-150 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/20 transition-colors select-text">
                  <td className="p-4 font-bold text-zinc-800 dark:text-zinc-100">{e.label}</td>
                  <td className="p-4">
                    <Badge variant={
                      e.type === "server" || e.type === "hosting" ? "green" :
                      e.type === "domain" ? "blue" :
                      e.type === "ai-api" ? "violet" : "gray"
                    }>
                      {e.type}
                    </Badge>
                  </td>
                  <td className="p-4 font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    ${e.cost.toFixed(2)} <span className="text-[10px] text-zinc-450 lowercase">/{e.billingCycle === "one-time" ? "once" : e.billingCycle.replace("ly", "")}</span>
                  </td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400 font-mono">
                    {e.nextRenewal ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 inline text-zinc-400" />
                        {e.nextRenewal}
                      </span>
                    ) : "N/A"}
                  </td>
                  <td className="p-4 text-zinc-500 dark:text-zinc-400 max-w-xs truncate" title={e.description}>{e.description || "—"}</td>
                  <td className="p-4 text-right">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(e.id)} className="p-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log New Development Expense">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="EXPENSE LOG LABEL *"
            placeholder="E.g., Vercel Team Pro Plan"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">CATEGORY TYPE</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExpenseType)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
              >
                <option value="domain">Domain Registration</option>
                <option value="server">Cloud Compute VPS / Server</option>
                <option value="storage">Object Storage / CDN</option>
                <option value="ai-api">AI API Tokens (Gemini, Stripe)</option>
                <option value="hosting">Application Hosting (Vercel, Netlify)</option>
                <option value="subscription">Workspace Subscription</option>
                <option value="ssl">SSL Security Certificates</option>
                <option value="other">Other Development Outlay</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">BILLING CYCLE</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as any)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
              >
                <option value="monthly">Monthly Recurring</option>
                <option value="yearly">Yearly Recurring</option>
                <option value="one-time">One-Time Charge</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="COST (USD $) *"
              type="number"
              step="0.01"
              min="0"
              placeholder="E.g., 20.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              required
            />
            <Input
              label="NEXT RENEWAL DATE"
              type="date"
              value={nextRenewal}
              onChange={(e) => setNextRenewal(e.target.value)}
            />
          </div>

          <Input
            label="DESCRIPTION / EXPENSE NOTES"
            placeholder="Billing cards, renewal notes, team scope..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button type="submit" variant="primary" className="mt-2 py-3">
            Deploy Cost Config
          </Button>
        </form>
      </Modal>
    </div>
  );
};
