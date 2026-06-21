"use client";

import { useEffect, useState } from "react";
import { DashboardIcon } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type VenueTable = {
  id: string;
  name: string;
  category: "POOL" | "SNOOKER";
  pricingMode: "PER_HOUR" | "PER_GAME";
  price: number;
  durationMinutes: number | null;
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

  async function loadTables(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }

    try {
      setLoadError("");
      const response = await fetch("/api/tables", { cache: "no-store" });
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

    fetch("/api/tables", { cache: "no-store" })
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
    const response = await fetch(url, {
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

  async function deleteSelectedTable(table: VenueTable) {
    const confirmed = window.confirm(`Delete ${table.name}?`);

    if (!confirmed) {
      return;
    }

    await fetch(`/api/tables/${table.id}`, { method: "DELETE" });
    await loadTables();
  }

  return (
    <>
      <Card className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-xl bg-white">
        <CardHeader className="border-b border-zinc-200 p-6">
          <div>
            <CardTitle className="text-2xl">Tables</CardTitle>
            <p className="mt-2 text-sm text-zinc-500">
              Manage pool and snooker tables with per-hour or per-game pricing.
            </p>
          </div>
          <Button onClick={openCreateModal}>
            <DashboardIcon name="plus" className="size-4" />
            Create New Table
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Table Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-zinc-500">
                      Loading tables...
                    </TableCell>
                  </TableRow>
                ) : loadError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-red-600">
                      {loadError}
                    </TableCell>
                  </TableRow>
                ) : tables.length ? (
                  tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell className="font-semibold">{table.name}</TableCell>
                      <TableCell>{formatCategory(table.category)}</TableCell>
                      <TableCell>{formatPricing(table)}</TableCell>
                      <TableCell>
                        {table.pricingMode === "PER_HOUR" ? "Per Hour" : "Per Game"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditModal(table)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => deleteSelectedTable(table)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-zinc-500">
                      No tables found. Create your first table.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/30 px-4">
          <div className="w-full max-w-lg rounded-lg border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 p-5">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingTable ? "Edit Table" : "Create New Table"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">Add table pricing and play duration.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-md border border-zinc-200 text-zinc-600"
                aria-label="Close table form"
              >
                x
              </button>
            </div>

            <form className="grid gap-4 p-5" onSubmit={saveTable}>
              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Table Name
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="h-11 rounded-md border border-zinc-300 px-3 outline-none focus:border-zinc-950"
                  placeholder="Table 1"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Category
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm({ ...form, category: event.target.value as FormState["category"] })
                    }
                    className="h-11 rounded-md border border-zinc-300 px-3 outline-none focus:border-zinc-950"
                  >
                    <option value="POOL">Pool</option>
                    <option value="SNOOKER">Snooker</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-zinc-700">
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
                    className="h-11 rounded-md border border-zinc-300 px-3 outline-none focus:border-zinc-950"
                  >
                    <option value="PER_HOUR">Per Hour</option>
                    <option value="PER_GAME">Per Game</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-zinc-700">
                Price
                <input
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  className="h-11 rounded-md border border-zinc-300 px-3 outline-none focus:border-zinc-950"
                  placeholder="500"
                  required
                />
              </label>

              {form.pricingMode === "PER_GAME" ? (
                <div className="grid gap-2">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">How Long is One Game?</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Set the fixed countdown time for one game on this table.
                    </p>
                  </div>
                  <p className="text-sm font-medium text-zinc-700">Time Format</p>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <label className="grid gap-2 text-sm font-medium text-zinc-700">
                      Hour
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={form.durationHours}
                        onChange={(event) =>
                          setForm({ ...form, durationHours: event.target.value })
                        }
                        className="h-11 rounded-md border border-zinc-300 bg-white px-3 outline-none focus:border-zinc-950"
                        required
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-zinc-700">
                      Minute
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={form.durationMinutes}
                        onChange={(event) =>
                          setForm({ ...form, durationMinutes: event.target.value })
                        }
                        className="h-11 rounded-md border border-zinc-300 bg-white px-3 outline-none focus:border-zinc-950"
                        required
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
