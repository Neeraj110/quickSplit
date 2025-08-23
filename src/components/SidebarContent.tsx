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
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r transition-transform duration-300">
      <div className="flex h-16 shrink-0 items-center justify-between px-6 ">
        <h1 className="text-xl font-bold text-foreground">QuickSplit</h1>
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

      <nav className="flex flex-1 flex-col px-6">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={onClose}
                    >
                      <item.icon
                        className={`h-6 w-6 shrink-0 ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
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
