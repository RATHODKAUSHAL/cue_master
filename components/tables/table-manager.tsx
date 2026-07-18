"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { userFetch } from "@/lib/auth/client";

type VenueTable = {
  id: string;
  name: string;
  category: "POOL" | "SNOOKER";
  pricingMode: "PER_HOUR" | "PER_GAME";
  price: number;
  durationMinutes: number | null;
  createdAt?: string;
};

type FormState = {
  name: string;
  category: "POOL" | "SNOOKER";
  pricingMode: "PER_HOUR" | "PER_GAME";
  price: string;
  durationHours: string;
  durationMinutes: string;
};

const emptyForm: FormState = {
  name: "",
  category: "POOL",
  pricingMode: "PER_HOUR",
  price: "",
  durationHours: "1",
  durationMinutes: "0",
};

function formatCategory(category: VenueTable["category"]) {
  return category === "POOL" ? "Pool" : "Snooker";
}

function formatPricing(table: VenueTable) {
  if (table.pricingMode === "PER_GAME") {
    const total = table.durationMinutes || 45;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    const duration = [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""]
      .filter(Boolean)
      .join(" ");

    return `₹ ${table.price} / game (${duration})`;
  }

  return `₹ ${table.price} / hour`;
}

function formatDisplayPricing(table: VenueTable) {
  const rupee = String.fromCharCode(8377);

  if (table.pricingMode === "PER_GAME") {
    const total = table.durationMinutes || 45;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    const duration = [hours ? `${hours}h` : "", minutes ? `${minutes}m` : ""]
      .filter(Boolean)
      .join(" ");

    return `${rupee} ${table.price} / game (${duration})`;
  }

  return `${rupee} ${table.price} / hour`;
}

function formatDate(date?: string) {
  if (!date) {
    return "Created recently";
  }

  return `Created on ${new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function SmallIcon({ name }: { name: "calendar" | "edit" | "trash" | "more" | "table" }) {
  const common = "fill-none stroke-current stroke-[1.9] stroke-linecap-round stroke-linejoin-round";
  const paths = {
    calendar: <path className={common} d="M7 3v4M17 3v4M4 8h16M5 5h14v15H5z" />,
    edit: <path className={common} d="m5 16-.8 3.8L8 19l9.7-9.7-3-3L5 16Zm8.7-8.7 3 3" />,
    trash: <path className={common} d="M5 7h14M10 11v6M14 11v6M8 7l.7 12h6.6L16 7M9.5 7l.8-2h3.4l.8 2" />,
    table: <path className={common} d="M5 9h14v7H5zM7 16v3M17 16v3M8 12.5h8" />,
    more: (
      <>
        <circle cx="12" cy="5" r="1.2" className="fill-current" />
        <circle cx="12" cy="12" r="1.2" className="fill-current" />
        <circle cx="12" cy="19" r="1.2" className="fill-current" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      {paths[name]}
    </svg>
  );
}

function formFromTable(table: VenueTable): FormState {
  const total = table.durationMinutes || (table.pricingMode === "PER_GAME" ? 45 : 60);
  return {
    name: table.name,
    category: table.category,
    pricingMode: table.pricingMode,
    price: String(table.price),
    durationHours: String(Math.floor(total / 60)),
    durationMinutes: String(total % 60),
  };
}

export function TableManager() {
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<VenueTable | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [deletingTable, setDeletingTable] = useState<VenueTable | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadTables(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setLoadError("");
      const response = await userFetch("/api/tables", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        setLoadError(data.message || "Unable to load tables.");
        setTables([]);
        return;
      }

      setTables(data.tables);
    } catch {
      setLoadError("Unable to load tables.");
      setTables([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    userFetch("/api/tables", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load tables.");
        }

        return data;
      })
      .then((data) => {
        if (active) {
          setLoadError("");
          setTables(data.tables);
        }
      })
      .catch((fetchError: Error) => {
        if (active) {
          setLoadError(fetchError.message);
          setTables([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function openCreateModal() {
    setEditingTable(null);
    setForm(emptyForm);
    setError("");
    setOpen(true);
  }

  function openEditModal(table: VenueTable) {
    setEditingTable(table);
    setForm(formFromTable(table));
    setError("");
    setOpen(true);
  }

  async function saveTable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const url = editingTable ? `/api/tables/${editingTable.id}` : "/api/tables";
    const method = editingTable ? "PUT" : "POST";
    const response = await userFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
        durationHours: Number(form.durationHours),
        durationMinutes: Number(form.durationMinutes),
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.message || "Unable to save table.");
      return;
    }

    setOpen(false);
    await loadTables();
  }

  function openDeleteConfirmation(table: VenueTable) {
    setDeletingTable(table);
    setDeleteError("");
  }

  async function deleteSelectedTable() {
    if (!deletingTable) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await userFetch(`/api/tables/${deletingTable.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete table.");
      }

      setDeletingTable(null);
      await loadTables(false);
    } catch (deleteTableError) {
      setDeleteError(
        deleteTableError instanceof Error ? deleteTableError.message : "Unable to delete table.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="-m-4 min-h-[calc(100vh-4rem)] border border-brand-green bg-white p-4 pb-24 rounded-[1.5rem] shadow-xs text-zinc-800 sm:-m-6 sm:p-6 sm:pb-28 lg:m-0 lg:min-h-[calc(100vh-8rem)] lg:p-6">
        <div className="rounded-[1.35rem] border border-[#337418]/15 bg-[#f4ebe1]/30 p-4 shadow-sm sm:rounded-[1.75rem] sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-5">
            <div className="min-w-0">
              <h1 className="mt-2 text-xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
                Manage <span className="text-[#337418]">Tables</span>
              </h1>
            </div>
            <Button
              onClick={openCreateModal}
              className="h-11 w-full rounded-[1.1rem] glass-btn-biscuit px-5 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 sm:h-14 sm:text-base flex items-center justify-center gap-2"
            >
              <Plus aria-hidden="true" strokeWidth={1.8} className="size-4.5 shrink-0" />
              Create Table
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:mt-6 sm:gap-5">
          {loading ? (
            <div className="rounded-[1.55rem] border border-zinc-200 bg-white/80 p-8 text-center text-sm font-semibold text-zinc-500 shadow-sm backdrop-blur">
              Loading tables...
            </div>
          ) : loadError ? (
            <div className="rounded-[1.55rem] border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700 shadow-sm">
              {loadError}
            </div>
          ) : tables.length ? (
            tables.map((table) => (
              <article
                key={table.id}
                title={`${formatDate(table.createdAt)} - ${formatPricing(table)}`}
                className="rounded-[1.15rem] border-2 border-[#337418] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] sm:rounded-[1.55rem] sm:p-6 transition-all duration-200 hover:shadow-[0_12px_38px_rgba(51,116,24,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#337418]/25 bg-[#337418]/10 text-[#337418] shadow-sm sm:size-14">
                      <SmallIcon name="table" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="min-w-0 truncate text-lg font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
                        {table.name}
                      </h2>
                      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 sm:mt-2 sm:text-xs">
                        {formatCategory(table.category)} table
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="rounded-full bg-[#337418]/10 px-3 py-1 text-xs font-extrabold text-[#337418] sm:px-4 sm:py-1.5 sm:text-sm">
                      {table.pricingMode === "PER_HOUR" ? "Per Hour" : "Per Game"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-400">Category</p>
                    <p className="mt-1 text-sm font-extrabold text-zinc-900 sm:text-base">
                      {formatCategory(table.category)}
                    </p>
                  </div>
                  <div className="min-w-0 border-l border-zinc-100 pl-4">
                    <p className="text-xs font-medium text-zinc-400">Pricing</p>
                    <p className="mt-1 break-words text-sm font-extrabold text-zinc-900 sm:text-base">
                      {formatDisplayPricing(table)}
                    </p>
                  </div>
                  <div className="min-w-0 border-l border-zinc-100 pl-4 col-span-2 sm:col-span-1">
                    <p className="text-xs font-medium text-zinc-400">Mode</p>
                    <p className="mt-1 text-sm font-extrabold text-zinc-900 sm:text-base">
                      {table.pricingMode === "PER_HOUR" ? "Per Hour" : "Per Game"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-150 pt-4 text-xs text-zinc-400 font-semibold">
                  {/* <span>Created on {formatDate(table.createdAt)}</span> */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openEditModal(table)}
                      className="glass-btn-biscuit rounded-xl font-extrabold px-3 py-1 shadow-xs flex items-center gap-1 text-[11px]"
                    >
                      <SmallIcon name="edit" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openDeleteConfirmation(table)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 rounded-xl font-extrabold px-3 py-1 shadow-xs flex items-center gap-1 text-[11px]"
                    >
                      <SmallIcon name="trash" />
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.55rem] border border-zinc-200 bg-white p-8 text-center shadow-xs">
              <p className="text-base font-bold text-zinc-800">No tables found.</p>
              <p className="mt-2 text-sm text-zinc-400 font-medium">Create your first pool or snooker table.</p>
              <Button
                onClick={openCreateModal}
                className="mt-5 glass-btn-biscuit font-bold px-5"
              >
                <Plus aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
                Create Table
              </Button>
            </div>
          )}
        </div>
      </section>

      {open ? (
        <div className="fixed inset-0 z-50 grid items-end bg-zinc-950/55 px-0 backdrop-blur-sm sm:place-items-center sm:px-4">
          <div className="max-h-[92dvh] w-full overflow-hidden rounded-t-[1.75rem] border border-zinc-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-[1.5rem]">
            <div className="flex items-center justify-between gap-4 bg-[#202020] p-5 text-white">
              <div>
                <h2 className="mt-1 text-xl font-bold tracking-normal">
                  {editingTable ? "Edit Table" : "Create New Table"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-lg font-bold text-white transition hover:bg-white/15"
                aria-label="Close table form"
              >
                X
              </button>
            </div>

            <form className="grid max-h-[calc(92dvh-7rem)] gap-4 overflow-y-auto bg-[#F8F8F8] p-5" onSubmit={saveTable}>
              <label className="grid gap-2 text-sm font-bold text-[#202020]">
                Table Name
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                  placeholder="Table 1"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#202020]">
                  Category
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value as FormState["category"] })
                    }
                    className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                  >
                    <option value="POOL">Pool</option>
                    <option value="SNOOKER">Snooker</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-bold text-[#202020]">
                  Price Mode
                  <select
                    value={form.pricingMode}
                    onChange={(event) => {
                      const pricingMode = event.target.value as FormState["pricingMode"];
                      setForm({
                        ...form,
                        pricingMode,
                        durationHours: pricingMode === "PER_GAME" ? "0" : form.durationHours,
                        durationMinutes: pricingMode === "PER_GAME" ? "45" : form.durationMinutes,
                      });
                    }}
                    className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                  >
                    <option value="PER_HOUR">Per Hour</option>
                    <option value="PER_GAME">Per Game</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-bold text-[#202020]">
                Price
                <input
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                  placeholder="500"
                  required
                />
              </label>

              {form.pricingMode === "PER_GAME" ? (
                <div className="grid gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#202020]">How Long is One Game?</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Set the fixed countdown time for one game on this table.
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#202020]">Time Format</p>
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-200 bg-white p-3">
                    <label className="grid gap-2 text-sm font-bold text-[#202020]">
                      Hour
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={form.durationHours}
                        onChange={(event) =>
                          setForm({ ...form, durationHours: event.target.value })
                        }
                        className="h-12 rounded-2xl border border-zinc-200 bg-[#F8F8F8] px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                        required
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-[#202020]">
                      Minute
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={form.durationMinutes}
                        onChange={(event) =>
                          setForm({ ...form, durationMinutes: event.target.value })
                        }
                        className="h-12 rounded-2xl border border-zinc-200 bg-[#F8F8F8] px-4 text-sm font-semibold outline-none transition focus:border-[#337418] focus:ring-4 focus:ring-[#337418]/15"
                        required
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)} className="h-12 rounded-2xl">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-12 rounded-2xl bg-[#337418] font-bold text-white hover:bg-[#337418]"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingTable ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white shadow-2xl">
            <div className="border-b border-zinc-200 p-5">
              <h2 className="text-lg font-semibold text-zinc-950">Delete Table</h2>
              <p className="mt-2 text-sm text-zinc-500">
                are you sure want tou delete this table.
              </p>
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {deletingTable.name}
              </p>
            </div>

            <div className="grid gap-4 p-5">
              {deleteError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {deleteError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setDeletingTable(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={deleteSelectedTable}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
