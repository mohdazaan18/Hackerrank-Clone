"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseTimerOptions {
    /** Time limit in minutes */
    timeLimitMinutes: number;
    /** Timestamp when the test began (for resuming sessions) */
    startTime?: number;
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

export function useTimer({
    timeLimitMinutes,
    startTime,
    onExpire,
}: UseTimerOptions): UseTimerReturn {
    const totalSeconds = timeLimitMinutes * 60;

    // Calculate initial time left lazily
    const [timeLeft, setTimeLeft] = useState(() => {
        const elapsedSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        return Math.max(0, totalSeconds - elapsedSeconds);
    });
    const [isExpired, setIsExpired] = useState(false);
    const onExpireRef = useRef(onExpire);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    // Reset when timeLimitMinutes changes (e.g. test loads async)
    useEffect(() => {
        const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        const remaining = Math.max(0, (timeLimitMinutes * 60) - elapsed);
        setTimeLeft(remaining);
        setIsExpired(remaining <= 0);
    }, [timeLimitMinutes, startTime]);

    useEffect(() => {
        if (isExpired) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const next = prev - 1;
                if (next <= 0) {
                    clearInterval(interval);
                    setIsExpired(true);
                    // Fire callback in next tick to avoid state update during render
                    setTimeout(() => onExpireRef.current(), 0);
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isExpired]);

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
