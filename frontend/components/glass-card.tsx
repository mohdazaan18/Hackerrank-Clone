"use client";

import { ReactNode, useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    glowColor?: string;
    interactive?: boolean;
}

/**
 * GlassCard — High-Viscosity Luminous Motion.
 *
 * Physics: stiffness:35, damping:20, mass:1.5 — heavy magnetic drag.
 * Glow: stationary refractive pulse (breathes over 8s), NOT shimmer.
 * Border: opacity brightens near cursor via radial mask.
 * Hover: backdrop-blur ramps 20→40px over 0.6s.
 */
export function GlassCard({
    children,
    className,
    glowColor = "99, 102, 241",
    interactive = true,
}: GlassCardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovering, setIsHovering] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Heavy magnetic spring — mass creates drag and overshoot settle
    const spotX = useSpring(mouseX, { stiffness: 35, damping: 20, mass: 1.5 });
    const spotY = useSpring(mouseY, { stiffness: 35, damping: 20, mass: 1.5 });

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!containerRef.current || !interactive) return;
            const rect = containerRef.current.getBoundingClientRect();
            mouseX.set(e.clientX - rect.left);
            mouseY.set(e.clientY - rect.top);
        },
        [interactive, mouseX, mouseY]
    );

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 35, damping: 20, mass: 1.5 }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className={cn(
                "sovereign-glass group relative overflow-hidden rounded-xl",
                isHovering ? "glass-hover" : "",
                className
            )}
        >
            {/* Soft-follow glow — 1000px, 6% opacity, magnetic drag */}
            {interactive && (
                <motion.div
                    className="pointer-events-none absolute -inset-px z-0 rounded-[inherit]"
                    style={{
                        opacity: isHovering ? 1 : 0,
                        transition: "opacity 600ms ease",
                        background: `radial-gradient(1000px circle at ${spotX}px ${spotY}px, rgba(${glowColor}, 0.06), transparent 80%)`,
                    }}
                />
            )}

            {/* Border catch — brightens near cursor */}
            {interactive && (
                <motion.div
                    className="pointer-events-none absolute -inset-px z-0 rounded-[inherit]"
                    style={{
                        opacity: isHovering ? 1 : 0,
                        transition: "opacity 600ms ease",
                        background: `radial-gradient(500px circle at ${spotX}px ${spotY}px, rgba(${glowColor}, 0.04), transparent 60%)`,
                        mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                        maskComposite: "exclude",
                        WebkitMaskComposite: "xor",
                        padding: "1px",
                    }}
                />
            )}

            {/* Refractive Pulse — slow breathing glow, NOT shimmer */}
            <div className="absolute inset-0 rounded-[inherit] pointer-events-none z-0 premium-glow-pulse" />

            {/* Razor-edge highlight */}
            <div className="absolute inset-0 rounded-[inherit] pointer-events-none z-0 sovereign-edge" />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}
