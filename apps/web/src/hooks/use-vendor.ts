"use client";

import { useState, useEffect, useCallback } from "react";
import { API_BASE, getAuthHeader } from "@/lib/api";

export type VendorStatus = "DRAFT" | "PENDING" | "APPROVED" | "SUSPENDED";

export interface VendorBankAccount {
  id: string;
  bankName: string;
  isPrimary: boolean;
  isVerified: boolean;
}

export interface Vendor {
  id: string;
  businessName: string;
  slug: string;
  status: VendorStatus;
  gstin?: string | null;
  pan?: string | null;
  about?: string | null;
  returnPolicy?: string | null;
  createdAt: string;
  bankAccounts: VendorBankAccount[];
}

interface UseVendorReturn {
  vendor: Vendor | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVendor(): UseVendorReturn {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/vendors/me`, {
        credentials: "include",
        headers: { ...getAuthHeader() },
      });
      if (res.status === 404) {
        setVendor(null);
      } else if (res.status === 401) {
        setVendor(null);
        setError("unauthorized");
      } else if (!res.ok) {
        setError("Failed to load vendor profile.");
      } else {
        const data = (await res.json()) as Vendor;
        setVendor(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVendor();
  }, [fetchVendor]);

  return { vendor, loading, error, refetch: fetchVendor };
}
