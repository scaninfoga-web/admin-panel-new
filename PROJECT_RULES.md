# Scaninfoga Web Panel - Project Rules & Guidelines

## Overview

This is a Next.js 14+ web application for Scaninfoga Security Services. Follow these rules strictly when making any changes.

---

## 1. Theme & Colors

### Primary Colors

```
Background:     #060b17 (dark navy)
Primary:        #10b981 (emerald-500)
Primary Light:  #34d399 (emerald-400)
Secondary:      #06b6d4 (cyan-500)
Text Primary:   #ffffff (white)
Text Secondary: #94a3b8 (slate-400)
Text Muted:     #64748b (slate-500)
Border:         #334155 (slate-700)
Card BG:        #0f172a (slate-900)
Card BG Alt:    #1e293b (slate-800)
```

### Gradient Usage

```css
/* Primary gradient */
bg-gradient-to-r from-emerald-500 to-emerald-600

/* Background gradients */
bg-gradient-to-b from-[#060b17] via-[#060b17]/95 to-[#060b17]

/* Text gradients */
bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent
```

### Glass/Blur Effects

```css
/* Glassmorphism */
bg-gray-900/50 backdrop-blur-xl border border-slate-700/50

/* Card style */
bg-slate-900/50 backdrop-blur-xl border border-slate-800
```

---

## 2. Typography

- **Headings**: Use `font-bold` with white color
- **Body text**: Use `text-slate-400` or `text-slate-300`
- **Links**: Use `text-emerald-400` with `hover:text-emerald-300`
- **Muted text**: Use `text-slate-500`

---

## 3. Custom Scrollbar

**ALWAYS** use `scrollbar-custom` class on any scrollable element. Never use default browser scrollbar.

```jsx
<div className="scrollbar-custom overflow-y-auto">{/* content */}</div>
```

Defined in `styles/globals.css`. Dark theme matched:

- 6px width/height
- `#1e293b` thumb (slate-800), `#334155` on hover (slate-700)
- Transparent track
- Firefox: `scrollbar-width: thin`

`CustomTable` already includes `scrollbar-custom` — no need to add it when using the table.

---

## 4. Component Structure

### Always Use TypeScript Interfaces

```typescript
interface ComponentProps {
  title: string;
  description?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

function Component({
  title,
  description,
  onClick,
  children,
}: ComponentProps): JSX.Element {
  // component logic
}
```

### Export Pattern

```typescript
// Named exports for utilities
export function helperFunction() {}

// Default export for page components
export default function PageComponent() {}
```

---

## 5. Animation Guidelines

### Use Framer Motion

```typescript
import {
  motion,
  AnimatePresence,
  useInView,
  useScroll,
  useTransform,
} from 'framer-motion';
```

### Standard Animation Variants

```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
```

### Scroll-Based Animations

```typescript
const ref = useRef<HTMLDivElement>(null);
const isInView = useInView(ref, { once: true, margin: '-100px' });
const { scrollYProgress } = useScroll({
  target: ref,
  offset: ['start end', 'end start'],
});
```

---

## 6. Button Styles

### Primary Button (Emerald)

```jsx
<Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 font-semibold text-black hover:shadow-lg hover:shadow-emerald-500/25">
  Get Started
</Button>
```

### Outline Button

```jsx
<Button
  variant="outline"
  className="border-emerald-500/50 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/10"
>
  Learn More
</Button>
```

### Ghost Button

```jsx
<Button
  variant="ghost"
  className="text-slate-400 hover:bg-white/5 hover:text-white"
>
  Cancel
</Button>
```

---

## 7. Card Components

### Standard Card

```jsx
<div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl">
  {/* content */}
</div>
```

### Interactive Card with Hover

```jsx
<motion.div
  className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/50"
  whileHover={{ y: -5 }}
>
  {/* content */}
</motion.div>
```

---

## 8. Icons

### Use Lucide React Icons

```typescript
import { Shield, Lock, Eye, Target, Zap, ArrowRight } from 'lucide-react';
```

### Icon Sizing

- Small: `h-4 w-4`
- Medium: `h-5 w-5`
- Large: `h-6 w-6`
- XL: `h-8 w-8`

### Icon with Color

```jsx
<Shield className="h-5 w-5 text-emerald-400" />
```

---

## 9. Layout Rules

### Page Structure

```jsx
<div className="relative min-h-screen bg-[#060b17]">
  <Navbar />
  <main className="relative z-10">{/* Page content */}</main>
  <Footer />
</div>
```

### Section Spacing

```jsx
<section className="relative z-10 mx-auto max-w-7xl px-4 py-20">
  {/* section content */}
</section>
```

### Container Widths

- `max-w-7xl` - Full width sections
- `max-w-5xl` - Content sections
- `max-w-3xl` - Text-heavy sections
- `max-w-2xl` - Narrow content

---

## 10. Responsive Design

### Breakpoints

- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

### Mobile-First Approach

```jsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
  {/* items */}
</div>
```

### Hide/Show

```jsx
<div className="hidden lg:block">Desktop only</div>
<div className="block lg:hidden">Mobile only</div>
```

---

## 11. Form Elements

### Input Fields

```jsx
<input
  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
  placeholder="Enter value..."
/>
```

### Select Dropdowns

```jsx
<select className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none">
  <option>Option 1</option>
</select>
```

---

## 12. Loading States

### Skeleton

```jsx
<div className="h-10 w-full animate-pulse rounded-xl bg-slate-800" />
```

### Spinner

```jsx
<div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
```

---

## 13. State Management

**No Redux.** Use session cookies for auth, `sessionStorage` for cached data.

### Auth (token + user)

Stored as session cookies via `cookies-next`. Session ends → cookies gone.

```typescript
import { getCookie, setCookie, deleteCookie } from "cookies-next";

// Read token
const raw = getCookie("accessToken");
const token = raw ? JSON.parse(raw as string) : null;

// Read user
const rawUser = getCookie("user");
const user = rawUser ? JSON.parse(rawUser as string) : null;

// Save (session cookie — no maxAge)
setCookie("accessToken", JSON.stringify(token), { path: "/" });
setCookie("user", JSON.stringify(user), { path: "/" });

// Logout
deleteCookie("accessToken");
deleteCookie("user");
```

### Client Info

Auto-fetched on page load, cached in `sessionStorage` under `client_info`. Attached to every API call via `lib/api.ts`. No manual management needed.

### API Module (`lib/api.ts`)

Reads token from cookie + clientInfo from sessionStorage automatically. Just use the helpers:

```typescript
import { get, post, put, patch, del } from "@/lib/api";
```

---

## 14. API Calls

### Use Server Actions or API Routes

```typescript
// Server action
'use server';

export async function fetchData() {
  // fetch logic
}
```

### Error Handling

```typescript
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch');
  return await response.json();
} catch (error) {
  toast.error('Something went wrong');
}
```

---

## 15. Toast Notifications

### Use Sonner

```typescript
import { toast } from 'sonner';

// Success
toast.success('Operation successful');

// Error
toast.error('Something went wrong');

// With ID (prevents duplicates)
toast.error('Error message', { id: 'unique-id', duration: 5000 });
```

---

## 16. File Organization

```
components/
├── common/          # Shared components
├── services/        # Service-related components
├── sub/             # Sub-components (navbar, footer, etc.)
└── ui/              # UI primitives (shadcn)

app/
├── (home-pages)/    # Public pages
├── dashboard/       # Protected dashboard pages
└── api/             # API routes

lib/
├── utils.ts         # Utility functions
├── constant.ts      # Constants and data
└── types.ts         # TypeScript types
```

---

## 17. Import Order

```typescript
// 1. React/Next imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party imports
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';

// 3. Local imports - components
import { Button } from '@/components/ui/button';
import Navbar from '@/components/sub/navbar';

// 4. Local imports - utilities
import { cn } from '@/lib/utils';

// 5. Types
import type { ServiceProps } from '@/lib/types';
```

---

## 18. Naming Conventions

- **Components**: PascalCase (`ServiceCard.tsx`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_ITEMS`)
- **Types/Interfaces**: PascalCase (`interface UserData`)
- **CSS classes**: kebab-case (via Tailwind)

---

## 19. DO NOT

- Use inline styles (use Tailwind classes)
- Use `any` type (define proper types)
- Use default browser scrollbar (use `scrollbar-custom`)
- Use colors outside the theme palette
- Create new CSS files (use Tailwind or globals.css)
- Use `var` (use `const` or `let`)
- Skip error handling in async operations
- Use pixel values (use Tailwind spacing)
- Use `rounded-lg`, `rounded-2xl`, or other border radius values (always use `rounded-xl`)
- Create new component files when one already exists in `components/custom/`
- Create new utility files — add to `utils/functions.ts` instead
- Duplicate existing utilities (`formatDate`, `cn`, etc.)
- Make the whole page/window scrollable — only internal content areas (tables, lists) may scroll

---

## 20. ALWAYS

- Use TypeScript with proper types
- Use Framer Motion for animations
- Use the established color palette
- Use `scrollbar-custom` class for scrollable areas
- Use responsive design (mobile-first)
- Use semantic HTML elements
- Handle loading and error states
- Use `cn()` utility for conditional classes
- Keep components focused and reusable
- Use `rounded-xl` for all border radius (cards, buttons, badges, inputs, etc.)
- On table pages: give the page root `flex flex-col h-full gap-N`, wrap `CustomTable` in `<div className="min-h-0 flex-1">`, and pass `maxHeight="100%"` to `CustomTable`
- On content pages (no table): give the root motion/div `h-full overflow-y-auto scrollbar-custom` so content scrolls within the fixed main area

---

## 21. Use Existing Custom Components & Utilities — NEVER Create New Ones

**STRICT RULE:** Before building anything, check these two directories first. If a component or utility already exists, **use it**. Do NOT create duplicates, wrappers, or alternatives.

### `components/custom/` — Reusable UI Components

| Component | File | Purpose |
|-----------|------|---------|
| `CustomTable` | `custom-table.tsx` | Data table with resize, sort, infinite scroll |
| `Loader` | `custom-loader.tsx` | Spinner — use everywhere for loading states |
| `Title` | `custom-title.tsx` | Page title with optional back button |
| `CustomInput` | `custom-input.tsx` | Styled input field |
| `CustomSelect` | `custom-select.tsx` | Styled select dropdown |
| `CustomForm` | `custom-form.tsx` | Form wrapper |
| `CustomTabs` | `custom-tab.tsx` | Tabbed content |
| `Modal` | `modal.tsx` | Dialog/modal wrapper |
| `Pagination` | `pagination.tsx` | Page-based pagination |
| `Sidebar` | `sidebar.tsx` | Admin sidebar navigation |
| `Navbar` | `navbar.tsx` | Top navigation bar |
| `Notes` | `notes.tsx` | Notes display |
| `NoteForm` | `note-form.tsx` | Note creation form |

### `utils/` — Shared Utility Functions

| Function | File | Purpose |
|----------|------|---------|
| `formatDate` | `utils/functions.ts` | Format any timestamp to IST display string |

### `lib/` — Core Modules

| Module | File | Purpose |
|--------|------|---------|
| API helpers | `lib/api.ts` | `get`, `post`, `put`, `patch`, `del`, `postWithProgress` |
| Client info | `lib/header.ts` | Auto-fetched device/browser/IP info, cached in sessionStorage |
| `cn` | `lib/utils.ts` | Tailwind class merge utility |

### Rules

- **DO NOT** create new component files if one already exists in `components/custom/`
- **DO NOT** create new utility files if the function belongs in `utils/functions.ts`
- **DO NOT** duplicate `formatDate`, `cn`, or any existing utility
- **DO** add new functions to `utils/functions.ts` if they are reusable across pages
- **DO** add new reusable components to `components/custom/` only
- **DO** import from `@/utils/functions`, `@/lib/api`, `@/lib/utils`, `@/components/custom/*`

---

## 22. Data Tables — `CustomTable`

All data tables **must** use `CustomTable` from `components/custom/custom-table.tsx`. Do **not** create new table components.

### Import

```typescript
import {
  CustomTable,
  type ColumnDef,
  type SortState,
} from "@/components/custom/custom-table";
```

### Column Definition

```typescript
const columns: ColumnDef<RowType>[] = [
  {
    id: "name",            // unique id — used as sort_by key
    header: "Name",        // displayed header text
    accessorKey: "name",   // key on row object (optional if using render only)
    width: 180,            // default px width
    minWidth: 80,          // resize min (default 60)
    maxWidth: 400,         // resize max (default 600)
    sortable: true,        // show sort toggle
    resizable: true,       // drag-to-resize (default true)
    sticky: "left",        // "left" | "right" for frozen columns
    render: (value, row, index) => <span>{value}</span>,
  },
];
```

### Infinite Scroll (preferred over pagination)

```tsx
<CustomTable<RowType>
  columns={columns}
  data={rows}
  loading={initialLoading}
  loadingMore={loadingMore}
  keyExtractor={(row) => row.id}
  sort={sort}
  onSortChange={setSort}
  hasMore={hasNext}
  onLoadMore={handleLoadMore}
  onRowClick={(row) => router.push(`/items/${row.id}`)}
  emptyMessage="No items found"
/>
```

- `loading` — full-body spinner for initial fetch
- `loadingMore` — small bottom spinner while appending pages
- `hasMore` + `onLoadMore` — triggers when user scrolls within 200px of bottom
- `maxHeight` — defaults to `calc(100vh - 280px)`, override as needed

### Loading State

Use the shared `Loader` component from `components/custom/custom-loader.tsx`:

```typescript
import { Loader } from "@/components/custom/custom-loader";

// Full page loader
<Loader />

// Compact loader
<Loader className="py-4" loaderStyle="h-5 w-5" />
```

### Cursor-Based Pagination Pattern

Backend APIs use cursor pagination. Follow this data-fetching pattern:

```typescript
const [data, setData] = useState<Item[]>([]);
const [nextCursor, setNextCursor] = useState<string | null>(null);
const [hasNext, setHasNext] = useState(false);
const [loading, setLoading] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);

const fetchData = useCallback(
  async (cursor?: string | null, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const params: Record<string, string> = { limit: "20" };
      if (cursor) params.cursor = cursor;
      // ...add filters/sort params

      const res = await get("/api/endpoint", params);
      const items = res.data?.items ?? [];
      setData((prev) => (append ? [...prev, ...items] : items));
      setNextCursor(res.data?.next_cursor ?? null);
      setHasNext(res.data?.has_next ?? false);
    } catch {
      toast.error("Failed to fetch");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  },
  [/* filter/sort deps */],
);

const handleLoadMore = useCallback(() => {
  if (!loadingMore && hasNext && nextCursor) {
    fetchData(nextCursor, true);
  }
}, [loadingMore, hasNext, nextCursor, fetchData]);
```

### Badge Color Conventions

| Type | Color |
|------|-------|
| Active / Approved / Success | `bg-emerald-500/10 text-emerald-400` |
| Pending / Warning | `bg-amber-500/10 text-amber-400` |
| Inactive / Failed / Rejected | `bg-red-500/10 text-red-400` |
| Info / Secondary | `bg-cyan-500/10 text-cyan-400` |
| Neutral | `bg-slate-500/10 text-slate-400` |

### Filter Bar Pattern

Filters go inside a `Card` above the table:

```tsx
<Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
  <div className="flex flex-wrap items-center gap-3">
    {/* Search input, Select dropdowns, Clear/Refresh buttons */}
  </div>
</Card>
```

- Input: `border-slate-700 bg-slate-900 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50`
- Select: `border-slate-700 bg-slate-900 text-slate-300`
- SelectItem focus: `focus:bg-emerald-500/10 focus:text-emerald-400`
