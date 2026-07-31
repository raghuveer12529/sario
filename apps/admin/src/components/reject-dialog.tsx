"use client";

import { useEffect, useState } from "react";

interface Props {
  title: string;
  placeholder?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function RejectDialog({ title, placeholder = "Enter rejection reason…", onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl">
        <h3 className="text-base font-bold">{title}</h3>
        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
            rows={3}
            autoFocus
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
