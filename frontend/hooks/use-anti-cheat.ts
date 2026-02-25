"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface AntiCheatMetrics {
    tabSwitchCount: number;
    blurCount: number;
    pasteCount: number;
    copyCount: number;
    firstTypedAt: number;
    totalActiveTime: number;
}

interface UseAntiCheatReturn extends AntiCheatMetrics {
    /** Call when user first types in the editor */
    recordFirstType: () => void;
    /** Call when paste is detected in the editor */
    recordPaste: () => void;
}

export function useAntiCheat(): UseAntiCheatReturn {
    const [metrics, setMetrics] = useState<AntiCheatMetrics>({
        tabSwitchCount: 0,
        blurCount: 0,
        pasteCount: 0,
        copyCount: 0,
        firstTypedAt: 0,
        totalActiveTime: 0,
    });

    const startTimeRef = useRef(Date.now());
    const activeStartRef = useRef(Date.now());
    const accumulatedActiveRef = useRef(0);

    // ─── Tab Visibility + Window Blur + Copy Detection ─────────

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab lost focus — accumulate active time
                accumulatedActiveRef.current += Date.now() - activeStartRef.current;
                setMetrics((prev) => ({
                    ...prev,
                    tabSwitchCount: prev.tabSwitchCount + 1,
                    totalActiveTime: accumulatedActiveRef.current,
                }));
            } else {
                // Tab regained focus — restart active timer
                activeStartRef.current = Date.now();
            }
        };

        const handleBlur = () => {
            // Window lost focus (covers alt-tab, clicking outside browser)
            setMetrics((prev) => ({
                ...prev,
                blurCount: prev.blurCount + 1,
            }));
        };

        const handleCopy = () => {
            setMetrics((prev) => ({
                ...prev,
                copyCount: prev.copyCount + 1,
            }));
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        document.addEventListener("copy", handleCopy);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            document.removeEventListener("copy", handleCopy);
        };
    }, []);

    // ─── Update total active time periodically ─────────────────

    useEffect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) {
                const currentActive =
                    accumulatedActiveRef.current + (Date.now() - activeStartRef.current);
                setMetrics((prev) => ({
                    ...prev,
                    totalActiveTime: currentActive,
                }));
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // ─── Record First Type ──────────────────────────────────────

    const recordFirstType = useCallback(() => {
        setMetrics((prev) => {
            if (prev.firstTypedAt > 0) return prev; // Already recorded
            return {
                ...prev,
                firstTypedAt: Date.now() - startTimeRef.current,
            };
        });
    }, []);

    // ─── Record Paste ───────────────────────────────────────────

    const recordPaste = useCallback(() => {
        setMetrics((prev) => ({
            ...prev,
            pasteCount: prev.pasteCount + 1,
        }));
    }, []);

    return {
        ...metrics,
        recordFirstType,
        recordPaste,
    };
}
