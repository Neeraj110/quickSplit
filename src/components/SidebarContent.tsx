"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { X } from "lucide-react";

function SidebarContent({
  navigation,
  pathname,
  onClose,
}: {
  navigation: any[];
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto transition-transform duration-300 bg-surface-bright">
      <div className="flex h-20 shrink-0 items-start justify-between px-6 pt-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold text-on-surface tracking-tight">QuickSplit</h1>
          <span className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase mt-0.5">
            The Financial Atelier
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="lg:hidden -m-2.5 p-2.5 text-muted-foreground"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col px-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      className={`group flex gap-x-3 rounded-xl px-3 py-2.5 text-sm leading-6 font-semibold transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-on-surface hover:bg-surface-container-low"
                      }`}
                      onClick={onClose}
                    >
                      <item.icon
                        className={`h-5 w-5 shrink-0 ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-on-surface"
                        }`}
                      />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default SidebarContent;
