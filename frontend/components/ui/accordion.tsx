"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
    title: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function AccordionItem({
    title,
    icon,
    badge,
    defaultOpen = false,
    children,
    className,
}: AccordionItemProps) {
    const [open, setOpen] = React.useState(defaultOpen);

    return (
        <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden", className)}>
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
                    {badge}
                </div>
                <motion.svg
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-4 h-4 text-zinc-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </motion.svg>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
