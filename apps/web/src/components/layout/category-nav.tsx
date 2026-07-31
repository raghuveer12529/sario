"use client";

import Link from "next/link";
import { useState, useRef, useCallback } from "react";

interface GrandChild {
  id: string;
  name: string;
  slug: string;
}

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  children: GrandChild[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  children: SubCategory[];
}

export function CategoryNav({ categories }: { categories: Category[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredChildId, setHoveredChildId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const openMenu = useCallback((id: string) => {
    clearTimer();
    setActiveId(id);
    setHoveredChildId(null);
  }, []);

  const scheduleClose = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setActiveId(null);
      setHoveredChildId(null);
    }, 150);
  }, []);

  const keepOpen = useCallback(() => clearTimer(), []);

  const activeCategory = categories.find((c) => c.id === activeId);

  // The child to show on the right panel: explicitly hovered, or first child that has grandchildren
  const displayChild =
    activeCategory?.children.find((c) => c.id === hoveredChildId) ??
    activeCategory?.children.find((c) => c.children?.length > 0) ??
    activeCategory?.children[0];

  if (!categories.length) return null;

  return (
    // onMouseLeave on the outer wrapper closes the dropdown
    <div
      className="relative border-t border-[#F0F0F0] bg-white"
      onMouseLeave={scheduleClose}
    >
      {/* ── Scrollable nav bar ── */}
      <div className="mx-auto flex max-w-7xl items-stretch overflow-x-auto px-4 scrollbar-none sm:px-6 lg:px-8">
        <Link
          href="/search"
          onMouseEnter={() => { clearTimer(); setActiveId(null); }}
          className="shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-[#4D4D4D] whitespace-nowrap transition-colors hover:border-primary hover:text-primary"
        >
          All
        </Link>

        {categories.map((cat) => {
          const hasChildren = cat.children.length > 0;
          const isActive = activeId === cat.id;
          return (
            <button
              key={cat.id}
              onMouseEnter={() => hasChildren ? openMenu(cat.id) : (clearTimer(), setActiveId(null))}
              className={`shrink-0 flex items-center gap-1 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-[#4D4D4D] hover:border-primary hover:text-primary"
              }`}
            >
              {cat.name}
              {hasChildren && (
                <svg
                  className={`h-3 w-3 flex-shrink-0 transition-transform duration-150 ${isActive ? "rotate-180 text-primary" : "text-[#C0C0C0]"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Mega dropdown — rendered OUTSIDE the overflow container so it is never clipped ── */}
      {activeCategory && activeCategory.children.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 border-t border-[#F0F0F0] bg-white shadow-2xl"
          onMouseEnter={keepOpen}
        >
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex gap-0">

              {/* Left column: direct children of active top-level category */}
              <div className="w-56 shrink-0 border-r border-[#F0F0F0] pr-4">
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA]">
                  {activeCategory.name}
                </p>
                <Link
                  href={`/search?categoryId=${activeCategory.id}`}
                  onClick={scheduleClose}
                  className="mb-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  View All
                </Link>
                <div className="my-1.5 border-t border-[#F5F5F5]" />
                <ul>
                  {activeCategory.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={`/search?categoryId=${child.id}`}
                        onMouseEnter={() => setHoveredChildId(child.id)}
                        onClick={scheduleClose}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors ${
                          displayChild?.id === child.id
                            ? "bg-[#F5F5F5] font-semibold text-primary"
                            : "text-[#3A3A3A] hover:bg-[#F5F5F5] hover:text-primary"
                        }`}
                      >
                        {child.name}
                        {child.children?.length > 0 && (
                          <svg className="h-3.5 w-3.5 shrink-0 text-[#C0C0C0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                          </svg>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right panel: grandchildren of the hovered/auto-selected child */}
              {displayChild && displayChild.children?.length > 0 && (
                <div className="flex-1 pl-6">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#AAAAAA]">
                    {displayChild.name}
                  </p>
                  <Link
                    href={`/search?categoryId=${displayChild.id}`}
                    onClick={scheduleClose}
                    className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                  >
                    View All {displayChild.name}
                  </Link>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3 lg:grid-cols-4">
                    {displayChild.children.map((gc) => (
                      <Link
                        key={gc.id}
                        href={`/search?categoryId=${gc.id}`}
                        onClick={scheduleClose}
                        className="flex items-center gap-2 rounded-md py-2 text-sm text-[#4D4D4D] transition-colors hover:text-primary"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCCCCC]" />
                        {gc.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
