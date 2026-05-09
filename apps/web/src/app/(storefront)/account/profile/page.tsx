"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading, updateProfile, logout } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
    if (user) {
      setName(user.name || "");
      setEmail((user as any).email || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      await updateProfile({ name, email, avatarUrl });
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-[#1A1A1A]">My Profile</h1>
        <button
          onClick={logout}
          className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-[#E8E8E8] bg-white p-6 shadow-sm text-center">
            <div className="relative mx-auto mb-4 h-32 w-32">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || "User"}
                  onError={() => setAvatarUrl("")}
                  className="h-full w-full rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-4xl font-bold text-primary">
                  {name?.[0] || user?.phone?.slice(-2) || "U"}
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">{name || "Unnamed User"}</h2>
            <p className="text-sm text-[#696969]">{user?.phone}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-100">
                Verified Account
              </span>
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            <button className="flex w-full items-center px-4 py-3 text-sm font-semibold text-primary bg-primary/5 rounded-lg text-left">
              Personal Information
            </button>
            <button 
              onClick={() => router.push("/account/orders")}
              className="flex w-full items-center px-4 py-3 text-sm font-medium text-[#4D4D4D] hover:bg-[#F5F5F5] rounded-lg text-left transition-colors"
            >
              Order History
            </button>
            <button className="flex w-full items-center px-4 py-3 text-sm font-medium text-[#4D4D4D] hover:bg-[#F5F5F5] rounded-lg text-left transition-colors">
              Saved Addresses
            </button>
          </nav>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-[#E8E8E8] bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D] uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-md border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D] uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-md border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D] uppercase tracking-wider text-[#9B9B9B]">
                    Phone Number (Fixed)
                  </label>
                  <input
                    type="tel"
                    disabled
                    value={user?.phone || ""}
                    className="w-full rounded-md border border-[#F0F0F0] bg-[#F9F9F9] px-4 py-2.5 text-sm text-[#9B9B9B] outline-none cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-[#4D4D4D] uppercase tracking-wider">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full rounded-md border border-[#E8E8E8] bg-white px-4 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-primary transition-colors"
                  />
                  <p className="mt-1.5 text-[10px] text-[#9B9B9B]">
                    Enter a public URL for your profile picture.
                  </p>
                </div>
              </div>

              {message && (
                <div className={`rounded-md px-4 py-3 text-sm font-medium ${
                  message.type === "success" 
                    ? "bg-green-50 text-green-700 border border-green-100" 
                    : "bg-red-50 text-red-700 border border-red-100"
                }`}>
                  {message.text}
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-primary px-8 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSaving ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
