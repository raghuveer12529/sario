"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";

interface VendorDetail {
  id: string;
  businessName: string;
  slug: string;
  status: string;
  gstin?: string;
  pan?: string;
  about?: string;
  returnPolicy?: string;
  createdAt: string;
  user: { name: string; phone: string };
  bankAccounts: Array<{
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    isVerified: boolean;
  }>;
  _count: { products: number };
}

export function VendorDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    adminFetch<VendorDetail>(`/admin/vendors/${id}`)
      .then(setVendor)
      .catch((err: unknown) => setError(getErrorMessage(err, "Failed to load vendor details.")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-xl bg-white shadow-2xl transition-transform duration-500 ease-in-out flex flex-col h-full animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div>
            <h2 className="text-lg font-black text-gray-900">Vendor Details</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {id}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-12 w-3/4 rounded-2xl bg-gray-100" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 rounded-2xl bg-gray-100" />
                <div className="h-20 rounded-2xl bg-gray-100" />
              </div>
              <div className="h-40 rounded-2xl bg-gray-100" />
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 p-6 text-center border border-red-100">
              <p className="text-sm font-bold text-red-600">{error}</p>
              <button onClick={onClose} className="mt-4 text-xs font-bold text-red-600 underline">Close</button>
            </div>
          ) : vendor ? (
            <>
              {/* Profile Card */}
              <div className="rounded-3xl bg-[#F8F9FC] border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{vendor.businessName}</h3>
                    <p className="text-sm font-bold text-primary mt-1">@{vendor.slug}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    vendor.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {vendor.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Products</p>
                    <p className="text-xl font-black text-gray-900">{vendor._count.products}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Joined</p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(vendor.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Owner Information</h4>
                <div className="space-y-3 px-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Full Name</span>
                    <span className="text-sm font-bold text-gray-900">{vendor.user.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">Phone Number</span>
                    <span className="text-sm font-bold text-gray-900">{vendor.user.phone}</span>
                  </div>
                </div>
              </section>

              {/* Tax Details */}
              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Tax & KYC</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">GSTIN</p>
                    <p className="text-sm font-mono font-bold text-gray-900">{vendor.gstin || "NOT PROVIDED"}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PAN</p>
                    <p className="text-sm font-mono font-bold text-gray-900">{vendor.pan || "NOT PROVIDED"}</p>
                  </div>
                </div>
              </section>

              {/* Bank Details */}
              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Bank Account</h4>
                {vendor.bankAccounts.map((bank, idx) => (
                  <div key={idx} className="rounded-2xl bg-gray-50 border border-gray-100 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-gray-900">{bank.bankName}</p>
                      {bank.isVerified ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-tighter">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-yellow-600 uppercase tracking-tighter">Unverified</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Holder</p>
                        <p className="font-bold text-gray-900 truncate">{bank.accountHolder}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">IFSC</p>
                        <p className="font-bold text-gray-900">{bank.ifsc}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Account Number</p>
                        <p className="font-mono font-bold text-gray-900 tracking-wider">{bank.accountNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              {/* Policies */}
              <section className="pb-10">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 px-2">Store Profile</h4>
                <div className="space-y-4">
                  <div className="px-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">About</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{vendor.about || "No description provided."}</p>
                  </div>
                  <div className="px-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Return Policy</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{vendor.returnPolicy || "Standard Sario return policy applies."}</p>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
