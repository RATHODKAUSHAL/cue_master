"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { userFetch } from "@/lib/auth/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PendingEntry = {
  id: string;
  amount: number;
  type: "CREATED" | "PAID";
  createdAt: string;
};

type Customer = {
  id: string;
  name: string;
  mobileNumber: string;
  pendingAmount: number;
  walletBalance: number;
  updatedAt: string;
  pendingEntries: PendingEntry[];
};

type CustomerProfile = {
  id: string;
  name: string;
  mobileNumber: string;
  pendingAmount: number;
  walletBalance: number;
  createdAt: string;
  metrics: {
    gamesPlayed: number;
    sessionsPlayed: number;
    totalPaid: number;
    totalPendingCreated: number;
    totalPendingPaid: number;
  };
  sessions: Array<{
    id: string;
    pricingMode: "PER_HOUR" | "PER_GAME";
    gameCount: number;
    plannedDurationMinutes: number;
    finalAmount: number | null;
    finalizedAt: string | null;
    customerShare: number;
    table: { name: string };
  }>;
  payments: Array<{
    id: string;
    mode: "CASH" | "UPI" | "WALLET" | "PENDING";
    amount: number;
    createdAt: string;
  }>;
  pendingEntries: Array<{
    id: string;
    type: "CREATED" | "PAID";
    amount: number;
    note: string | null;
    createdAt: string;
  }>;
};

const fieldClass =
  "h-11 rounded-md border border-zinc-300 bg-white px-3 outline-none transition focus:border-[#337418] focus:ring-2 focus:ring-[#337418]/15";

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [payingCustomer, setPayingCustomer] = useState<Customer | null>(null);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [profileCustomerId, setProfileCustomerId] = useState("");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileTab, setProfileTab] = useState<"overview" | "games" | "payments">(
    "overview",
  );

  async function loadCustomers(search = activeSearch, showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await userFetch(`/api/customers?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "Unable to load customers.");
      setCustomers(data.customers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    userFetch("/api/customers", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Unable to load customers.");
        return data;
      })
      .then((data) => {
        if (active) setCustomers(data.customers);
      })
      .catch((loadError: Error) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function searchCustomers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = searchInput.trim();
    setActiveSearch(nextSearch);
    void loadCustomers(nextSearch);
  }

  function clearSearch() {
    setSearchInput("");
    setActiveSearch("");
    void loadCustomers("");
  }

  function openCreateModal() {
    setCustomerName("");
    setMobileNumber("");
    setFormError("");
    setModalOpen(true);
  }

  async function saveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const response = await userFetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customerName, mobileNumber }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "Unable to add customer.");
      setModalOpen(false);
      await loadCustomers(activeSearch, false);
    } catch (saveError) {
      setFormError(saveError instanceof Error ? saveError.message : "Unable to add customer.");
    } finally {
      setSaving(false);
    }
  }

  function openPendingPayment(customer: Customer) {
    setPayingCustomer(customer);
    setPendingPaymentAmount(String(customer.pendingAmount));
    setPaymentError("");
  }

  async function submitPendingPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payingCustomer) return;

    setPaymentSaving(true);
    setPaymentError("");

    try {
      const response = await userFetch(`/api/customers/${payingCustomer.id}/pay-pending`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(pendingPaymentAmount) }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "Unable to pay pending amount.");

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === payingCustomer.id
            ? { ...customer, pendingAmount: data.pendingAmount }
            : customer,
        ),
      );
      setPayingCustomer(null);

      if (profile?.id === payingCustomer.id) {
        await openCustomerProfile(payingCustomer.id);
      }

      await loadCustomers(activeSearch, false);
    } catch (payError) {
      setPaymentError(
        payError instanceof Error ? payError.message : "Unable to pay pending amount.",
      );
    } finally {
      setPaymentSaving(false);
    }
  }

  async function openCustomerProfile(customerId: string) {
    setProfileCustomerId(customerId);
    setProfileTab("overview");
    setProfile(null);
    setProfileError("");
    setProfileLoading(true);

    try {
      const response = await userFetch(`/api/customers/${customerId}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load customer profile.");
      setProfile(data.customer);
    } catch (profileLoadError) {
      setProfileError(
        profileLoadError instanceof Error
          ? profileLoadError.message
          : "Unable to load customer profile.",
      );
    } finally {
      setProfileLoading(false);
    }
  }

  function closeCustomerProfile() {
    setProfileCustomerId("");
    setProfile(null);
    setProfileError("");
  }

  useEffect(() => {
    if (!profileCustomerId) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeCustomerProfile();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [profileCustomerId]);

  return (
    <>
      <Card className="-m-4 min-h-[calc(100vh-4rem)] overflow-hidden rounded-[1.5rem] border border-brand-green bg-white text-zinc-800 shadow-xs sm:-m-6 lg:m-0 lg:min-h-[calc(100vh-8rem)]">
        <CardHeader className="m-4 flex-col rounded-[1.35rem] border border-[#337418]/15 bg-[#f4ebe1]/30 p-4 shadow-sm sm:m-6 sm:flex-row sm:items-center sm:rounded-[1.75rem] sm:p-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#337418] sm:text-xs">Customers</p>
            <CardTitle className="mt-2 text-2xl font-extrabold text-zinc-950">Customers</CardTitle>
            <p className="mt-2 text-sm font-medium text-zinc-500">
              View every customer, search details, and add new players.
            </p>
          </div>
          <Button className="bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]" onClick={openCreateModal}>
            <Plus aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
            Add Customer
          </Button>
        </CardHeader>

        <CardContent className="p-3 pb-24 sm:p-6 sm:pb-28">
          <form
            className="mb-4 grid gap-3 rounded-2xl border border-[#337418]/15 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto_auto]"
            onSubmit={searchCustomers}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#337418] focus:ring-2 focus:ring-[#337418]/15"
              placeholder="Search by customer name or mobile number"
              aria-label="Search customers"
            />
            <Button className="bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]" type="submit">Search</Button>
            <Button type="button" variant="outline" className="border-[#337418]/20 bg-white text-[#337418] hover:bg-[#337418]/10 hover:text-[#337418]" onClick={clearSearch}>
              Clear
            </Button>
          </form>

          {activeSearch ? (
            <p className="mb-3 text-sm text-zinc-500">
              Showing results for <span className="font-semibold text-zinc-950">{activeSearch}</span>
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-2xl border border-[#337418]/15 bg-zinc-100" />
              ))
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700 md:col-span-2 xl:col-span-3">
                {error}
              </div>
            ) : customers.length ? (
              customers.map((customer) => (
                <article key={customer.id} className="rounded-[1.15rem] border-2 border-[#337418] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_38px_rgba(51,116,24,0.06)] sm:rounded-[1.55rem]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold text-zinc-950">{customer.name}</h2>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">{customer.mobileNumber}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold ${customer.pendingAmount > 0 ? "bg-red-50 text-red-600" : "bg-[#337418]/15 text-[#337418]"}`}>
                      {customer.pendingAmount > 0 ? "Pending" : "Clear"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm">
                    <div>
                      <p className="text-zinc-400">Pending</p>
                      <p className={`mt-1 font-bold ${customer.pendingAmount > 0 ? "text-red-600" : "text-[#337418]"}`}>{money(customer.pendingAmount)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Wallet</p>
                      <p className="mt-1 font-bold text-zinc-900">{money(customer.walletBalance)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-zinc-400">Recent Pending Entry</p>
                      <p className="mt-1 font-bold text-zinc-900">
                        {customer.pendingEntries[0]
                          ? `${money(customer.pendingEntries[0].amount)} - ${new Date(customer.pendingEntries[0].createdAt).toLocaleDateString("en-IN")}`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {customer.pendingAmount > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                        onClick={() => openPendingPayment(customer)}
                      >
                        Pay Pending
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      className="bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]"
                      onClick={() => openCustomerProfile(customer.id)}
                    >
                      Profile
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-[#337418]/15 bg-white p-8 text-center text-sm font-semibold text-zinc-500 shadow-sm md:col-span-2 xl:col-span-3">
                No customers found.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-zinc-200">
            <Table className="min-w-[1040px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Recent Pending Entry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="p-0">
                      <div className="divide-y divide-zinc-200">
                        {Array.from({ length: 6 }, (_, index) => (
                          <div
                            key={index}
                            className="grid animate-pulse grid-cols-7 gap-4 px-4 py-4"
                          >
                            {Array.from({ length: 7 }, (_, cell) => (
                              <div
                                key={cell}
                                className="h-4 rounded bg-zinc-100"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-red-600">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : customers.length ? (
                  customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-semibold">{customer.name}</TableCell>
                        <TableCell>{customer.mobileNumber}</TableCell>
                        <TableCell
                          className={customer.pendingAmount > 0 ? "font-semibold text-red-600" : ""}
                        >
                          {money(customer.pendingAmount)}
                        </TableCell>
                        <TableCell>{money(customer.walletBalance)}</TableCell>
                        <TableCell>
                          {customer.pendingEntries[0]
                            ? `${money(customer.pendingEntries[0].amount)} · ${new Date(
                                customer.pendingEntries[0].createdAt,
                              ).toLocaleDateString("en-IN")}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              customer.pendingAmount > 0
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }
                          >
                            {customer.pendingAmount > 0 ? "Payment Pending" : "No Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {customer.pendingAmount > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPendingPayment(customer)}
                              >
                                Pay Pending Amount
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              onClick={() => openCustomerProfile(customer.id)}
                            >
                              Customer Profile
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-zinc-500">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 grid items-end bg-zinc-950/60 px-0 backdrop-blur-sm sm:place-items-center sm:px-4">
          <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.75rem] border border-[#337418]/25 bg-white shadow-2xl sm:max-w-lg sm:rounded-[1.5rem]">
            <div className="flex items-start justify-between border-b border-[#337418]/15 bg-[#F4F6E9] p-5 text-zinc-950">
              <div>
                <h2 className="text-lg font-extrabold">Add Customer</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Add the customer name and 10-digit mobile number.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(false)}
                aria-label="Close customer form"
                className="rounded-xl text-zinc-500 hover:bg-[#337418]/10 hover:text-[#337418]"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={saveCustomer}>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Customer Name
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className={fieldClass}
                  placeholder="Customer name"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Customer Mobile Number
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(event) =>
                    setMobileNumber(event.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  className={fieldClass}
                  placeholder="9876543210"
                  required
                />
              </label>

              {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button className="h-11 rounded-xl bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]" type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add Customer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {payingCustomer ? (
        <div className="fixed inset-0 z-50 grid items-end bg-zinc-950/60 px-0 backdrop-blur-sm sm:place-items-center sm:px-4">
          <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.75rem] border border-[#337418]/25 bg-white shadow-2xl sm:max-w-lg sm:rounded-[1.5rem]">
            <div className="flex items-start justify-between border-b border-[#337418]/15 bg-[#F4F6E9] p-5 text-zinc-950">
              <div>
                <h2 className="text-lg font-extrabold">Pay Pending Amount</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {payingCustomer.name} currently owes {money(payingCustomer.pendingAmount)}.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPayingCustomer(null)}
                aria-label="Close pending payment form"
                className="rounded-xl text-zinc-500 hover:bg-[#337418]/10 hover:text-[#337418]"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              </Button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={submitPendingPayment}>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Amount Paid
                <input
                  type="number"
                  min="1"
                  max={payingCustomer.pendingAmount}
                  value={pendingPaymentAmount}
                  onChange={(event) => setPendingPaymentAmount(event.target.value)}
                  className={fieldClass}
                  required
                />
                <span className="text-xs font-normal text-zinc-500">
                  Enter the full amount or any partial amount.
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPendingPaymentAmount(String(Math.ceil(payingCustomer.pendingAmount / 2)))
                  }
                >
                  Pay Half
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPendingPaymentAmount(String(payingCustomer.pendingAmount))
                  }
                >
                  Clear Full Amount
                </Button>
              </div>

              {paymentError ? (
                <p className="text-sm font-medium text-red-600">{paymentError}</p>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setPayingCustomer(null)}>
                  Cancel
                </Button>
                <Button className="h-11 rounded-xl bg-[#337418] text-[#F8F8F8] hover:bg-[#337418]" type="submit" disabled={paymentSaving}>
                  {paymentSaving ? "Paying..." : "Pay"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {profileCustomerId ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Close customer profile"
            onClick={closeCustomerProfile}
          />
          <aside className="absolute inset-y-0 right-0 w-full overflow-y-auto border-l border-[#337418]/20 bg-[#F8F8F8] shadow-2xl sm:w-[70vw] lg:w-[65vw]">
            <div className="sticky top-0 z-20 flex items-start justify-between border-b border-[#337418]/15 bg-white/95 p-5 backdrop-blur-xl sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[#337418] shadow-[0_0_0_4px_rgba(51,116,24,0.12)]" />
                  <h2 className="text-xl font-semibold">Customer Profile</h2>
                </div>
                <p className="mt-1 text-sm text-zinc-500">Live customer activity overview</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeCustomerProfile}
                aria-label="Close customer profile"
                className="rounded-full border border-zinc-200 bg-white shadow-sm transition hover:rotate-90 hover:bg-red-50 hover:text-red-600"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-5 shrink-0" />
              </Button>
            </div>

            <div className="p-5 sm:p-6">
              {profileLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-28 rounded-xl bg-zinc-100" />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="h-24 rounded-lg bg-zinc-100" />
                    ))}
                  </div>
                  <div className="h-72 rounded-xl bg-zinc-100" />
                  <div className="h-64 rounded-xl bg-zinc-100" />
                </div>
              ) : profileError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
                  {profileError}
                </div>
              ) : profile ? (
                <div className="space-y-6">
                  <div className="relative overflow-hidden rounded-2xl border border-[#337418]/20 bg-white p-5 text-zinc-950 shadow-sm sm:p-6">
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-[#337418]/20 bg-[#337418]/10 text-xl font-bold text-[#337418]">
                          {profile.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-2xl font-semibold">{profile.name}</p>
                          <p className="mt-1 text-sm text-zinc-500">{profile.mobileNumber}</p>
                          <p className="mt-2 text-xs text-zinc-400">
                            Member since{" "}
                            {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur ${
                          profile.pendingAmount > 0
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-[#337418]/20 bg-[#337418]/10 text-[#337418]"
                        }`}
                      >
                        {profile.pendingAmount > 0
                          ? `${money(profile.pendingAmount)} pending`
                          : "Account clear"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#337418]/15 bg-white p-1.5 shadow-sm">
                    {[
                      ["overview", "Overview"],
                      ["games", "Game History"],
                      ["payments", "Payments"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setProfileTab(value as "overview" | "games" | "payments")
                        }
                        className={`min-w-fit flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                          profileTab === value
                            ? "bg-[#337418] text-white shadow-md shadow-[#337418]/15"
                            : "text-zinc-500 hover:bg-[#337418]/10 hover:text-[#337418]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Games Played",
                        value: profile.metrics.gamesPlayed,
                        colors: "border-blue-100 bg-blue-50 text-blue-700",
                      },
                      {
                        label: "Sessions",
                        value: profile.metrics.sessionsPlayed,
                        colors: "border-violet-100 bg-violet-50 text-violet-700",
                      },
                      {
                        label: "Total Paid",
                        value: money(profile.metrics.totalPaid),
                        colors: "border-emerald-100 bg-emerald-50 text-emerald-700",
                      },
                      {
                        label: "Pending",
                        value: money(profile.pendingAmount),
                        colors:
                          profile.pendingAmount > 0
                            ? "border-amber-100 bg-amber-50 text-amber-700"
                            : "border-emerald-100 bg-emerald-50 text-emerald-700",
                      },
                      ...(profile.walletBalance > 0
                        ? [
                            {
                              label: "Advance",
                              value: money(profile.walletBalance),
                              colors: "border-emerald-100 bg-emerald-50 text-emerald-700",
                            },
                          ]
                        : []),
                    ].map((metric) => (
                      <div
                        key={metric.label}
                        className={`rounded-xl border p-4 transition hover:-translate-y-1 hover:shadow-lg ${metric.colors}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                          {metric.label}
                        </p>
                        <p className="mt-3 text-2xl font-bold">{metric.value}</p>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`grid gap-5 xl:grid-cols-[1.1fr_0.9fr] ${
                      profileTab === "overview" ? "" : "hidden"
                    }`}
                  >
                    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">Payment Health</h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            Pending collection progress
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {profile.metrics.totalPendingCreated
                            ? Math.min(
                                100,
                                Math.round(
                                  (profile.metrics.totalPendingPaid /
                                    profile.metrics.totalPendingCreated) *
                                    100,
                                ),
                              )
                            : 100}
                          % recovered
                        </span>
                      </div>
                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                          style={{
                            width: `${
                              profile.metrics.totalPendingCreated
                                ? Math.min(
                                    100,
                                    (profile.metrics.totalPendingPaid /
                                      profile.metrics.totalPendingCreated) *
                                      100,
                                  )
                                : 100
                            }%`,
                          }}
                        />
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-red-50 p-4">
                          <p className="text-xs text-red-500">Pending Created</p>
                          <p className="mt-1 text-lg font-bold text-red-700">
                            {money(profile.metrics.totalPendingCreated)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-4">
                          <p className="text-xs text-emerald-500">Pending Recovered</p>
                          <p className="mt-1 text-lg font-bold text-emerald-700">
                            {money(profile.metrics.totalPendingPaid)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
                      <h3 className="font-semibold text-violet-950">Player Snapshot</h3>
                      <div className="mt-4 space-y-3">
                        {[
                          [
                            "Average games/session",
                            profile.metrics.sessionsPlayed
                              ? (
                                  profile.metrics.gamesPlayed /
                                  profile.metrics.sessionsPlayed
                                ).toFixed(1)
                              : "0",
                            "text-violet-700",
                          ],
                          [
                            "Average paid/session",
                            money(
                              profile.metrics.sessionsPlayed
                                ? Math.round(
                                    profile.metrics.totalPaid /
                                      profile.metrics.sessionsPlayed,
                                  )
                                : 0,
                            ),
                            "text-emerald-700",
                          ],
                          ...(profile.walletBalance > 0
                            ? [["Advance amount", money(profile.walletBalance), "text-blue-700"]]
                            : []),
                        ].map(([label, value, color]) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm transition hover:translate-x-1"
                          >
                            <span className="text-sm text-zinc-500">{label}</span>
                            <strong className={color}>{value}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm ${
                      profileTab === "games" ? "" : "hidden"
                    }`}
                  >
                    <div className="border-b border-blue-100 bg-blue-50/50 p-4">
                      <h3 className="font-semibold">Game History by Date</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Completed sessions and customer share
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[720px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Table</TableHead>
                            <TableHead>Games / Time</TableHead>
                            <TableHead>Customer Share</TableHead>
                            <TableHead>Final Bill</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profile.sessions.length ? (
                            profile.sessions.map((session) => (
                              <TableRow key={session.id} className="hover:bg-blue-50/60">
                                <TableCell>
                                  {session.finalizedAt
                                    ? new Date(session.finalizedAt).toLocaleDateString("en-IN")
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                    {session.table.name}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {session.pricingMode === "PER_GAME"
                                    ? `${session.gameCount} game${
                                        session.gameCount === 1 ? "" : "s"
                                      }`
                                    : `${Math.floor(session.plannedDurationMinutes / 60)}h ${
                                        session.plannedDurationMinutes % 60
                                      }m`}
                                </TableCell>
                                <TableCell className="font-semibold text-violet-700">
                                  {money(session.customerShare)}
                                </TableCell>
                                <TableCell className="font-semibold text-emerald-700">
                                  {money(session.finalAmount || 0)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="py-8 text-center text-zinc-500">
                                No completed games.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div
                    className={`grid gap-5 xl:grid-cols-2 ${
                      profileTab === "payments" ? "" : "hidden"
                    }`}
                  >
                  <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm">
                    <div className="border-b border-amber-100 bg-amber-50/60 p-4">
                      <h3 className="font-semibold text-amber-950">Pending Activity</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Created {money(profile.metrics.totalPendingCreated)} · Paid{" "}
                        {money(profile.metrics.totalPendingPaid)}
                      </p>
                    </div>
                    <div className="max-h-[32rem] divide-y divide-zinc-100 overflow-y-auto">
                      {profile.pendingEntries.length ? (
                        profile.pendingEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-4 p-4 transition hover:bg-zinc-50"
                          >
                            <div>
                              <p className="text-sm font-semibold">
                                {entry.type === "PAID" ? "Pending Paid" : "Pending Added"}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {new Date(entry.createdAt).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <span
                              className={
                                entry.type === "PAID"
                                  ? "font-semibold text-emerald-600"
                                  : "font-semibold text-red-600"
                              }
                            >
                              {entry.type === "PAID" ? "-" : "+"}
                              {money(entry.amount)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="p-6 text-center text-sm text-zinc-500">
                          No pending activity.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                    <div className="border-b border-emerald-100 bg-emerald-50/60 p-4">
                      <h3 className="font-semibold text-emerald-950">Payment Records</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Cash, UPI, wallet, and pending payments
                      </p>
                    </div>
                    <div className="max-h-[32rem] divide-y divide-zinc-100 overflow-y-auto">
                      {profile.payments.length ? (
                        profile.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between gap-4 p-4 transition hover:bg-emerald-50/40"
                          >
                            <div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  payment.mode === "CASH"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : payment.mode === "UPI"
                                      ? "bg-blue-100 text-blue-700"
                                      : payment.mode === "WALLET"
                                        ? "bg-violet-100 text-violet-700"
                                        : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {payment.mode}
                              </span>
                              <p className="mt-2 text-xs text-zinc-500">
                                {new Date(payment.createdAt).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <span className="text-lg font-bold text-emerald-700">
                              {money(payment.amount)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="p-6 text-center text-sm text-zinc-500">
                          No payment records.
                        </p>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
