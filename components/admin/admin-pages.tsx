"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminFetch } from "@/lib/admin/client";

type User = { id: string; name: string; email: string; mobileNumber: string; _count: { customers: number; sessions: number; tables: number } };
type Customer = { id: string; name: string; mobileNumber: string; userName: string; userMobileNumber: string; totalSpent: number; pendingAmount: number };
type Game = { id: string; gameName: string; tableName: string; customerName: string; userName: string; amount: number; status: string; date: string };
type Editable = { id: string; name: string; email?: string; mobileNumber: string };

const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
const date = (value: string) => {
  const item = new Date(value);
  return `${String(item.getDate()).padStart(2, "0")}${String(item.getMonth() + 1).padStart(2, "0")}${item.getFullYear()}`;
};

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Admin console</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function State({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <p className="py-16 text-center text-sm text-slate-500">Loading data...</p>;
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>;
  return null;
}

export function AdminHome() {
  const [data, setData] = useState<{ totalUsers: number; totalGames: number; totalCustomers: number; users: Array<{ id: string; name: string }>; selectedUserId: string } | null>(null);
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (filter = "") => {
    try {
      const response = await adminFetch(`/api/v1/admin/analytics${filter ? `?userId=${encodeURIComponent(filter)}` : ""}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      setData(json.analytics);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load analytics.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <>
      <Header title="Dashboard Home" description="Platform analytics across registered venue owners, customers, and games." />
      <div className="mb-6 flex max-w-sm flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Filter customer and game totals by user</label>
        <select value={userId} onChange={(event) => { setUserId(event.target.value); void load(event.target.value); }} className="h-11 rounded-xl border border-slate-300 bg-white px-3">
          <option value="">All users</option>
          {data?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
      </div>
      {error ? <State loading={false} error={error} /> : (
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Total Users", data?.totalUsers ?? 0, "Registered venue owners"],
            ["Total Games", data?.totalGames ?? 0, userId ? "Games for selected user" : "Games across the platform"],
            ["Total Customers", data?.totalCustomers ?? 0, userId ? "Customers for selected user" : "Customers across the platform"],
          ].map(([label, value, note]) => (
            <Card key={label} className="rounded-2xl border-slate-200 p-6">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-4 text-4xl font-bold tracking-tight">{value}</p>
              <p className="mt-2 text-xs text-slate-400">{note}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function AdminUsers() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Editable | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminFetch("/api/v1/admin/users");
      const json = await response.json();
      if (!response.ok) throw new Error(json.message);
      setItems(json.users);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load users."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function remove(id: string) {
    if (!confirm("Delete this user and all owned data?")) return;
    const response = await adminFetch(`/api/v1/admin/users/${id}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) return setError(json.message);
    await load();
  }
  return (
    <>
      <Header title="Users" description="Manage every registered CueDesk venue owner." />
      <Card className="overflow-hidden rounded-2xl"><div className="overflow-x-auto">
        <Table className="min-w-[920px]"><TableHeader><TableRow><TableHead>User Name</TableHead><TableHead>Mobile Number</TableHead><TableHead>Email</TableHead><TableHead>Customers</TableHead><TableHead>Games</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>{!loading && !error && items.map((user) => <TableRow key={user.id}><TableCell className="font-semibold">{user.name}</TableCell><TableCell>{user.mobileNumber}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user._count.customers}</TableCell><TableCell>{user._count.sessions}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(user)}>Edit</Button><Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(user.id)}>Delete</Button></div></TableCell></TableRow>)}</TableBody>
        </Table><State loading={loading} error={error} /></div></Card>
      {editing ? (
        <EditModal key={editing.id} value={editing} kind="user" onClose={() => setEditing(null)} onSaved={load} />
      ) : null}
    </>
  );
}

export function AdminCustomers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Editable | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await adminFetch("/api/v1/admin/customers"); const json = await response.json(); if (!response.ok) throw new Error(json.message); setItems(json.customers); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load customers."); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function remove(id: string) {
    if (!confirm("Delete this customer? Customers with game history cannot be deleted.")) return;
    const response = await adminFetch(`/api/v1/admin/customers/${id}`, { method: "DELETE" });
    const json = await response.json(); if (!response.ok) return setError(json.message); await load();
  }
  return (
    <>
      <Header title="Customers" description="View customer ownership, spend, pending balances, and account details." />
      <Card className="overflow-hidden rounded-2xl"><div className="overflow-x-auto">
        <Table className="min-w-[1180px]"><TableHeader><TableRow><TableHead>Customer Name</TableHead><TableHead>Customer Mobile</TableHead><TableHead>User Name</TableHead><TableHead>User Mobile</TableHead><TableHead>Total Spent</TableHead><TableHead>Pending</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>{!loading && !error && items.map((customer) => <TableRow key={customer.id}><TableCell className="font-semibold">{customer.name}</TableCell><TableCell>{customer.mobileNumber}</TableCell><TableCell>{customer.userName}</TableCell><TableCell>{customer.userMobileNumber}</TableCell><TableCell>{money(customer.totalSpent)}</TableCell><TableCell className={customer.pendingAmount ? "font-semibold text-amber-700" : ""}>{money(customer.pendingAmount)}</TableCell><TableCell className="text-right"><details className="relative inline-block"><summary className="cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold">Action</summary><div className="absolute right-0 z-10 mt-1 grid w-28 rounded-lg border bg-white p-1 shadow-xl"><button className="rounded px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setEditing(customer)}>Edit</button><button className="rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => remove(customer.id)}>Delete</button></div></details></TableCell></TableRow>)}</TableBody>
        </Table><State loading={loading} error={error} /></div></Card>
      {editing ? (
        <EditModal key={editing.id} value={editing} kind="customer" onClose={() => setEditing(null)} onSaved={load} />
      ) : null}
    </>
  );
}

export function AdminGames() {
  const [items, setItems] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { void (async () => { try { const response = await adminFetch("/api/v1/admin/games"); const json = await response.json(); if (!response.ok) throw new Error(json.message); setItems(json.games); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load games."); } finally { setLoading(false); } })(); }, []);
  return (
    <>
      <Header title="Games" description="Complete platform game history with ownership and billing details." />
      <Card className="overflow-hidden rounded-2xl"><div className="overflow-x-auto">
        <Table className="min-w-[1100px]"><TableHeader><TableRow><TableHead>Game Name</TableHead><TableHead>Table Name</TableHead><TableHead>Customer Name</TableHead><TableHead>User Name</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
          <TableBody>{!loading && !error && items.map((game) => <TableRow key={game.id}><TableCell className="font-semibold">{game.gameName}</TableCell><TableCell>{game.tableName}</TableCell><TableCell>{game.customerName}</TableCell><TableCell>{game.userName}</TableCell><TableCell>{money(game.amount)}</TableCell><TableCell><Badge variant="outline">{game.status}</Badge></TableCell><TableCell className="font-mono">{date(game.date)}</TableCell></TableRow>)}</TableBody>
        </Table><State loading={loading} error={error} /></div></Card>
    </>
  );
}

function EditModal({ value, kind, onClose, onSaved }: { value: Editable; kind: "user" | "customer"; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<Editable>(value);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await adminFetch(`/api/v1/admin/${kind === "user" ? "users" : "customers"}/${form.id}`, { method: "PATCH", body: JSON.stringify(form) });
    const json = await response.json(); if (!response.ok) return setError(json.message); onClose(); await onSaved();
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><form onSubmit={save} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold">Edit {kind}</h2><input className="h-11 rounded-xl border px-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required />{kind === "user" ? <input className="h-11 rounded-xl border px-3" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" required /> : null}<input className="h-11 rounded-xl border px-3" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="Mobile number" required />{error ? <p className="text-sm text-red-600">{error}</p> : null}<div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">Save</Button></div></form></div>;
}
