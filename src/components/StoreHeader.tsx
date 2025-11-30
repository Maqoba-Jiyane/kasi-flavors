import Link from "next/link";

type StoreHeaderProps = {
    name: string;
    area: string;
    city: string;
    isOpen: boolean;
    avgPrepTimeMinutes: number;
  };
  
  export function StoreHeader({
    name,
    area,
    city,
    isOpen,
    avgPrepTimeMinutes,
  }: StoreHeaderProps) {
    return (
      <header className="border-b border-slate-200 bg-white/70 px-4 py-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={'/'} >
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {name}
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                {area} · {city}
              </p>
            </Link >
  
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  isOpen
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60"
                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                }`}
              >
                <span className="mr-1 h-2 w-2 rounded-full bg-current" />
                {isOpen ? "Open now" : "Closed"}
              </span>
  
              <div className="hidden text-xs text-slate-500 sm:block dark:text-slate-300">
                ~ {avgPrepTimeMinutes} min prep time
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }
  