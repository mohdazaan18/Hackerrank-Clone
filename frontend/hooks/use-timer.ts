"use client";

import { useState, useEffect, useRef } from "react";

interface UseTimerOptions {
    /** Absolute timestamp (ms) when the test expires — from server */
    expiresAt: number | null;
    /** Total duration in minutes — for progress calculation */
    totalMinutes: number;
    /** Callback when timer expires */
    onExpire: () => void;
}

interface UseTimerReturn {
    /** Time left in seconds */
    timeLeft: number;
    /** Whether the timer has expired */
    isExpired: boolean;
    /** Formatted time string (HH:MM:SS) */
    formattedTime: string;
    /** Progress percentage (0-100, 100 = full) */
    progress: number;
}

function formatTime(totalSeconds: number): string {
    if (totalSeconds <= 0) return "00:00:00";

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
        .map((v) => v.toString().padStart(2, "0"))
        .join(":");
}

/**
 * Server-authoritative timer hook.
 *
 * `expiresAt` is an absolute timestamp from the server.
 * Remaining time = expiresAt - Date.now() (client clock).
 * The server clock offset was already accounted for when
 * the caller computed `expiresAt` (adjusted by serverTime delta).
 */
export function useTimer({
    expiresAt,
    totalMinutes,
    onExpire,
}: UseTimerOptions): UseTimerReturn {
    const totalSeconds = totalMinutes * 60;
    const onExpireRef = useRef(onExpire);
    const hasFiredRef = useRef(false);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    const computeRemaining = () => {
        if (!expiresAt) return totalSeconds; // Not loaded yet — show full
        return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    };

    const [timeLeft, setTimeLeft] = useState(computeRemaining);
    const [isExpired, setIsExpired] = useState(false);

    // Reset when expiresAt changes (e.g. session fetched)
    useEffect(() => {
        if (!expiresAt) return;
        const remaining = computeRemaining();
        setTimeLeft(remaining);
        if (remaining <= 0) {
            setIsExpired(true);
            if (!hasFiredRef.current) {
                hasFiredRef.current = true;
                setTimeout(() => onExpireRef.current(), 0);
            }
        } else {
            setIsExpired(false);
            hasFiredRef.current = false;
        }
    }, [expiresAt]);

    // Countdown interval
    useEffect(() => {
        if (isExpired || !expiresAt) return;

        const interval = setInterval(() => {
            const remaining = computeRemaining();
            setTimeLeft(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
                setIsExpired(true);
                if (!hasFiredRef.current) {
                    hasFiredRef.current = true;
                    setTimeout(() => onExpireRef.current(), 0);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isExpired, expiresAt]);

    const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;

    return {
        timeLeft,
        isExpired,
        formattedTime: formatTime(timeLeft),
        progress,
    };
}

/**
 * Format seconds into a reader-friendly string (e.g. "45 min", "1h 30min")
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
