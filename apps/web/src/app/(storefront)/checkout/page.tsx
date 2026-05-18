"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { apiFetch } from "@/lib/api";
import { formatPaise } from "@sario/ui";
import { useAuth } from "@/hooks/use-auth";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface CartLineItem {
  variantId: string;
  quantity: number;
  pricePaise: number;
  variant: {
    name: string;
    product: { name: string; slug: string };
    images: Array<{ url: string }>;
  };
}

interface CartSummary {
  subtotal: number;
  shipping: number;
  total: number;
  itemCount: number;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab",
  "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const inputClass = "w-full rounded-lg border border-[#E8E8E8] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary placeholder:text-[#CCCCCC]";
const labelClass = "mb-1 block text-xs font-semibold text-[#4D4D4D]";

function LockIcon() {
  return (
    <svg className="h-4 w-4 text-[#696969]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

export default function CheckoutPage() {
  const [step, setStep] = useState<"address" | "review" | "done">("address");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [cartItems, setCartItems] = useState<CartLineItem[]>([]);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: "", phone: "", line1: "", line2: "",
    city: "", state: "", pincode: "",
  });

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    // Load saved addresses
    apiFetch<Address[]>("/me/addresses").then((data) => {
      setAddresses(data);
      if (data.length > 0 && data[0]) {
        setSelectedAddressId(data[0].id);
        setShowNewForm(false);
      } else {
        setShowNewForm(true);
      }
    }).catch(() => setShowNewForm(true));

    // Load cart with full items
    apiFetch<{ items: CartLineItem[] }>("/cart")
      .then((c) => {
        const items = c.items ?? [];
        setCartItems(items);
        const subtotal = items.reduce((s, i) => s + i.pricePaise * i.quantity, 0);
        const shipping = subtotal >= 200000 ? 0 : 5000;
        setCart({ subtotal, shipping, total: subtotal + shipping, itemCount: items.length });
      })
      .catch(() => null);
  }, [isAuthenticated, authLoading]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const validateAddress = () => {
    if (!form.fullName || !form.line1 || !form.city || !form.state) return "Please fill all required fields.";
    if (!/^\d{10}$/.test(form.phone)) return "Please enter a valid 10-digit phone number.";
    if (!/^\d{6}$/.test(form.pincode)) return "Please enter a valid 6-digit pincode.";
    return null;
  };

  const saveAddress = async () => {
    const err = validateAddress();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const addr = await apiFetch<Address>("/me/addresses", {
        method: "POST",
        body: JSON.stringify({ ...form, isDefault: true }),
      });
      setAddresses([addr, ...addresses]);
      setSelectedAddressId(addr.id);
      setShowNewForm(false);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  interface RazorpayResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }

  const handlePayment = (razorpayOrderId: string, amountPaise: number) => {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amountPaise,
      currency: "INR",
      name: "Sario",
      description: "Saree Purchase",
      order_id: razorpayOrderId,
      handler: async (response: RazorpayResponse) => {
        setLoading(true);
        try {
          const result = await apiFetch<{ orderNumber?: string }>("/checkout/verify", {
            method: "POST",
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          if (result.orderNumber) setOrderNumber(result.orderNumber);
          const eta = new Date();
          eta.setDate(eta.getDate() + 7);
          setEstimatedDelivery(eta.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
          setStep("done");
        } catch {
          setError("Payment verification failed. If money was deducted, please contact support.");
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        name: user?.name ?? "",
        contact: user?.phone ?? "",
        email: user?.email ?? "",
      },
      theme: {
        color: "#9333ea",
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const isDev = process.env.NODE_ENV === "development";

  const devConfirm = async (razorpayOrderId: string) => {
    setLoading(true);
    try {
      await apiFetch(`/checkout/dev/confirm/${razorpayOrderId}`, { method: "POST" });
      const eta = new Date();
      eta.setDate(eta.getDate() + 7);
      setEstimatedDelivery(eta.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }));
      setOrderNumber(`ORD-${Date.now().toString(36).toUpperCase()}`);
      setStep("done");
    } catch {
      setError("Dev confirmation failed.");
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ razorpayOrderId: string; amountPaise: number }>("/checkout/initiate", {
        method: "POST",
        body: JSON.stringify({ addressId: selectedAddressId }),
      });
      
      // If we're in dev and no Razorpay key is set, show a prompt or just use devConfirm
      if (isDev && !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        await devConfirm(data.razorpayOrderId);
      } else {
        handlePayment(data.razorpayOrderId, data.amountPaise);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex min-h-screen items-center justify-center bg-[#F5F5F5]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;

  if (!isAuthenticated) {
    return (
      <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm rounded-xl border border-[#F0F0F0] bg-white p-8 text-center">
          <p className="text-lg font-bold text-[#1A1A1A]">Sign in to checkout</p>
          <Link href="/auth" className="mt-4 block rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90">
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="bg-[#F5F5F5] min-h-screen flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-[#F0F0F0] bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F9ED]">
              <svg className="h-8 w-8 text-[#26A541]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Order Confirmed</h1>
            <p className="mt-2 text-sm text-[#696969] leading-relaxed">
              Your saree is being prepared by the weaver. You&apos;ll receive an SMS and email confirmation shortly.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] divide-y divide-[#F0F0F0]">
            {orderNumber && (
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Order Number</span>
                <span className="text-sm font-bold text-[#1A1A1A] font-mono">{orderNumber}</span>
              </div>
            )}
            {estimatedDelivery && (
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Est. Delivery</span>
                <span className="text-sm font-bold text-[#1A1A1A]">by {estimatedDelivery}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3">
              <span className="text-xs font-bold text-[#9B9B9B] uppercase tracking-wider">Confirmation</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">SMS + Email</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link href="/account/orders" className="block rounded-xl bg-primary py-3.5 text-center text-sm font-bold text-white hover:opacity-90 transition-all">
              Track My Order
            </Link>
            <Link href="/" className="block rounded-xl border border-[#E8E8E8] py-3.5 text-center text-sm font-medium text-[#4D4D4D] hover:border-primary hover:text-primary transition-all">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[#F5F5F5] min-h-screen pb-12">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-0 rounded-xl border border-[#F0F0F0] bg-white overflow-hidden">
          {(["address", "review"] as const).map((s, i) => (
            <div
              key={s}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                step === s ? "border-primary text-primary bg-primary/5" : "border-transparent text-[#9B9B9B]"
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? "bg-primary text-white" : "bg-[#E8E8E8] text-[#9B9B9B]"}`}>
                {i + 1}
              </span>
              {s === "address" ? "Delivery Address" : "Review & Pay"}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === "address" && (
              <div className="rounded-xl border border-[#F0F0F0] bg-white p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#1A1A1A]">Delivery Address</h2>
                  {addresses.length > 0 && !showNewForm && (
                    <button onClick={() => setShowNewForm(true)} className="text-xs font-bold text-primary hover:underline">
                      + Add New Address
                    </button>
                  )}
                </div>

                {!showNewForm && (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-all ${selectedAddressId === addr.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-[#E8E8E8] hover:border-gray-300"}`}
                      >
                        <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} className="mt-0.5 accent-primary" />
                        <div className="text-sm">
                          <p className="font-bold text-[#1A1A1A]">{addr.fullName} · {addr.phone}</p>
                          <p className="text-[#696969] mt-0.5">{addr.line1}{addr.line2 && `, ${addr.line2}`}, {addr.city}, {addr.state} — {addr.pincode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {showNewForm && (
                  <div className="space-y-4 rounded-xl border border-[#E8E8E8] p-5 bg-[#FAFAFA]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-[#1A1A1A]">New Delivery Address</p>
                      {addresses.length > 0 && (
                        <button onClick={() => setShowNewForm(false)} className="text-xs font-medium text-[#696969] hover:text-[#1A1A1A]">
                          Cancel
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className={labelClass}>Full Name</label><input required value={form.fullName} onChange={f("fullName")} className={inputClass} placeholder="Recipient's Name" /></div>
                      <div><label className={labelClass}>Phone</label><input required type="tel" value={form.phone} onChange={f("phone")} className={inputClass} placeholder="10-digit number" /></div>
                    </div>
                    <div><label className={labelClass}>Address Line 1</label><input required value={form.line1} onChange={f("line1")} className={inputClass} placeholder="House/Flat no., Street, Area" /></div>
                    <div>
                      <label className={labelClass}>Address Line 2 <span className="font-normal text-[#9B9B9B]">(optional)</span></label>
                      <input value={form.line2} onChange={f("line2")} className={inputClass} placeholder="Landmark, apartment etc" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><label className={labelClass}>City</label><input required value={form.city} onChange={f("city")} className={inputClass} placeholder="City" /></div>
                      <div>
                        <label className={labelClass}>State</label>
                        <select required value={form.state} onChange={f("state")} className={inputClass}>
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div><label className={labelClass}>Pincode</label><input required maxLength={6} value={form.pincode} onChange={f("pincode")} className={inputClass} placeholder="6 digits" /></div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (showNewForm) {
                      void saveAddress();
                    } else {
                      setStep("review");
                    }
                  }}
                  disabled={loading}
                  className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                  {loading ? "Saving..." : showNewForm ? "Deliver to this address" : "Continue to Payment"}
                </button>
              </div>
            )}

            {step === "review" && (
              <div className="rounded-xl border border-[#F0F0F0] bg-white p-5 space-y-5 shadow-sm">
                <h2 className="text-base font-bold text-[#1A1A1A]">Review & Pay</h2>

                <div className="rounded-xl border border-[#E8E8E8] p-4 bg-gray-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B] mb-1.5">Delivery Details</p>
                      <p className="text-sm font-bold text-[#1A1A1A]">{addresses.find(a => a.id === selectedAddressId)?.fullName} · {addresses.find(a => a.id === selectedAddressId)?.phone}</p>
                      <p className="text-sm text-[#696969] mt-0.5">
                        {addresses.find(a => a.id === selectedAddressId)?.line1}{addresses.find(a => a.id === selectedAddressId)?.line2 && `, ${addresses.find(a => a.id === selectedAddressId)?.line2}`}, {addresses.find(a => a.id === selectedAddressId)?.city}, {addresses.find(a => a.id === selectedAddressId)?.state} — {addresses.find(a => a.id === selectedAddressId)?.pincode}
                      </p>
                    </div>
                    <button onClick={() => { setStep("address"); setError(null); }} className="text-xs font-bold text-primary hover:underline shrink-0">
                      Edit
                    </button>
                  </div>
                </div>

                {/* Cart line items on review step */}
                {cartItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9B9B9B]">
                      Order Items ({cartItems.length})
                    </p>
                    <div className="divide-y divide-[#F0F0F0] rounded-xl border border-[#E8E8E8] overflow-hidden">
                      {cartItems.map((item) => (
                        <div key={item.variantId} className="flex items-center gap-3 bg-white px-4 py-3">
                          {item.variant.images[0] && (
                            <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F5] border border-[#F0F0F0]">
                              <Image
                                src={item.variant.images[0].url}
                                alt={item.variant.product.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1A1A1A] leading-tight line-clamp-1">
                              {item.variant.product.name}
                            </p>
                            <p className="text-[11px] text-[#9B9B9B] mt-0.5">{item.variant.name} · Qty {item.quantity}</p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-[#1A1A1A]">
                            {formatPaise(item.pricePaise * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-[#FDF8EE] border border-[#F9EBC8] px-4 py-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#F5E0A3] flex items-center justify-center shrink-0">
                    <svg className="h-6 w-6 text-[#856404]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#856404]">Razorpay Secure Payment</p>
                    <p className="text-[11px] text-[#856404]/80">UPI, Cards, Net Banking, Wallets supported</p>
                  </div>
                </div>

                <button
                  onClick={() => { void placeOrder(); }}
                  disabled={loading || !cart}
                  className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100"
                >
                  {loading ? "Initializing Secure Payment..." : cart ? `Pay ${formatPaise(cart.total)}` : "Proceed to Payment"}
                </button>

                <p className="flex items-center justify-center gap-2 text-[11px] text-[#9B9B9B]">
                  <LockIcon /> 256-bit SSL Secure Checkout
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            {cart && (
              <div className="sticky top-24 h-fit rounded-xl border border-[#F0F0F0] bg-white shadow-sm overflow-hidden">
                <div className="border-b border-[#F0F0F0] px-5 py-4 bg-gray-50/50">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[#9B9B9B]">Order Summary</h2>
                </div>
                <div className="px-5 py-5 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#696969]">Items ({cart.itemCount})</span>
                    <span className="font-medium text-[#1A1A1A]">{formatPaise(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#696969]">Delivery Charges</span>
                    <span className={cart.shipping === 0 ? "font-bold text-[#26A541]" : "font-medium text-[#1A1A1A]"}>
                      {cart.shipping === 0 ? "FREE" : formatPaise(cart.shipping)}
                    </span>
                  </div>
                  <div className="border-t border-dashed border-[#E8E8E8] pt-4 flex justify-between">
                    <span className="text-base font-bold text-[#1A1A1A]">Total Payable</span>
                    <span className="text-base font-extrabold text-primary">{formatPaise(cart.total)}</span>
                  </div>
                </div>
                {cart.shipping === 0 && (
                  <div className="bg-[#F0F9F1] px-5 py-3 border-t border-[#DDF0E0]">
                    <p className="text-[11px] font-medium text-[#26A541] flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                      Free delivery on this order!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
