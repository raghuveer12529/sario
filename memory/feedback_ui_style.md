---
name: Sario UI Style — Meesho-inspired
description: All storefront UI must follow the Meesho-inspired design system defined here. Apply this to every new page or component.
type: feedback
---

Always use the Meesho-inspired design system for the Sario storefront (`apps/web`). Do not revert to shadcn defaults or generic Tailwind styling.

**Why:** User explicitly requested the entire storefront UI match Meesho's visual language and said to use this style going forward.

**How to apply:** Apply these rules to every new page, component, or UI change in `apps/web`.

---

## Color Palette
| Token | Value | Usage |
|---|---|---|
| Primary | `hsl(307, 55%, 39%)` ≈ `#9B2D8E` | Buttons, links, logo, focus rings |
| Primary light | `#F9F0F9` | Hover backgrounds, selected states |
| Background | `#F5F5F5` | Page background (gray) |
| Surface/Card | `#FFFFFF` | Cards, panels, header |
| Border | `#F0F0F0` / `#E8E8E8` | Card borders, dividers |
| Text primary | `#1A1A1A` | Headings, prices, labels |
| Text secondary | `#696969` | Subtitles, metadata |
| Text muted | `#9B9B9B` | Placeholders, tertiary |
| Discount green | `#26A541` | Discount %, "Free Delivery" |
| Error | `#E02B2B` | Errors, destructive |

## Layout Rules
- Page background: `bg-[#F5F5F5]` (gray)
- Content sections: `bg-white rounded-sm border border-[#F0F0F0]` — NOT rounded-xl, NOT rounded-2xl
- Use `rounded-sm` everywhere (Meesho uses sharp/minimal rounding), NOT `rounded-xl` or `rounded-2xl`
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Sections separated by `mt-3` gap (stacked white cards on gray)

## Header
- White background with `shadow-md`
- Logo: `text-2xl font-extrabold text-primary`
- Search: `bg-[#F5F5F5] border border-[#E8E8E8]` with search icon, focus highlights border purple
- Nav: Person icon + Cart icon (icon + label stacked), "Sign In" outlined purple button
- Sub-header: horizontal scrollable category text links (`text-sm font-medium text-[#4D4D4D] hover:text-primary`)

## Buttons
- Primary CTA: `bg-primary text-white rounded-sm font-bold` — NOT `bg-foreground`, NOT `rounded-xl`
- Secondary/outlined: `border-2 border-primary text-primary bg-white rounded-sm font-bold hover:bg-[#F9F0F9]`
- Destructive/remove: `text-[#9B9B9B] hover:text-[#E02B2B]`
- Disabled: `disabled:opacity-50`

## Product Cards
```
[White card, rounded-sm, border #F0F0F0, hover:shadow-md]
  [3:4 aspect image, bg-[#F5F5F5], overflow-hidden]
    [Optional: green "X% OFF" badge top-left, bg-[#26A541] text-white]
  [Padding p-2]
    [Name: text-xs font-medium text-[#1A1A1A] line-clamp-2]
    [Price row: bold price + line-through MRP + green "X% off"]
    ["Free Delivery" text-xs font-medium text-[#26A541]]
```

## Typography
- Section headings: `text-base font-bold text-[#1A1A1A]` (not text-2xl)
- Prices: `text-sm font-bold text-[#1A1A1A]`
- Discount: `text-xs font-semibold text-[#26A541]`
- Strikethrough MRP: `text-xs text-[#9B9B9B] line-through`
- Labels/metadata: `text-xs text-[#696969]`

## Forms & Inputs
- Input: `border border-[#E8E8E8] rounded-sm px-3 py-2.5 text-sm outline-none focus:border-primary`
- Label: `text-xs font-semibold text-[#4D4D4D]`
- Error: `bg-red-50 border border-red-100 text-[#E02B2B] text-xs px-3 py-2 rounded-sm`

## Price Details Panel (Cart/Checkout)
- White card with `border-[#F0F0F0]`
- Header: `text-sm font-bold uppercase tracking-wide text-[#696969]` with bottom border
- Row: `flex justify-between text-sm text-[#4D4D4D]`
- Total row: `font-bold text-[#1A1A1A]` with dashed top border
- Free: `font-semibold text-[#26A541]`

## Auth Page
- Purple header strip at top of card (`bg-primary text-white px-6 py-8`)
- White form body below
- "Back to Home" link below card

## Do NOT use
- `rounded-xl`, `rounded-2xl` — use `rounded-sm`
- `bg-foreground text-background` for buttons — use `bg-primary text-white`
- `text-muted-foreground` — use `text-[#696969]` or `text-[#9B9B9B]`
- `hover:bg-accent` — use `hover:bg-[#F9F0F9]` or `hover:text-primary`
- Emoji icons in category pills on homepage — use circular emoji containers with colored backgrounds
