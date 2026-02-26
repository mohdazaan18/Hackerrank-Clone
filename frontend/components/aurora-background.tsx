"use client";

import { motion } from "framer-motion";

/**
 * FluidObsidianBackground — Oily, viscous, refractive environment.
 *
 * FIXED: Removed the backdrop-filter "refractive lens" layer that was
 * bleeding through to dashboard content and causing blank screen.
 * The blur is now ONLY on individual blobs via CSS filter (safe).
 *
 * 4 large blobs with animated borderRadius for organic wiggle.
 * Dark: mix-blend-mode: screen on deep navy base.
 * Light: mix-blend-mode: multiply.
 * SVG turbulence noise at 0.03 prevents color banding.
 */

const BLOB_CONFIGS = [
    {
        // Blob 1: Deep Indigo — largest, fastest
        size: "85vw",
        position: { top: "-20%", left: "-15%" },
        blur: "blur(100px)",
        lightColor: "rgba(196, 181, 253, 0.30)",
        darkColor: "rgba(99, 102, 241, 0.25)",
        duration: 25,
        radiusA: "30% 70% 70% 30% / 30% 30% 70% 70%",
        radiusB: "60% 40% 30% 70% / 60% 30% 70% 40%",
        radiusC: "40% 60% 50% 50% / 50% 60% 40% 50%",
        movement: {
            x: ["0%", "3%", "-2%", "1%", "0%"],
            y: ["0%", "-2%", "3%", "-1%", "0%"],
        },
        scale: [1, 1.06, 0.97, 1.04, 1],
        rotate: [0, 5, -3, 8, 0],
    },
    {
        // Blob 2: Muted Violet — slowest, deepest blur
        size: "70vw",
        position: { bottom: "-15%", right: "-10%" },
        blur: "blur(160px)",
        lightColor: "rgba(147, 197, 253, 0.25)",
        darkColor: "rgba(139, 92, 246, 0.20)",
        duration: 45,
        radiusA: "60% 40% 30% 70% / 60% 30% 70% 40%",
        radiusB: "30% 70% 70% 30% / 30% 30% 70% 70%",
        radiusC: "50% 50% 40% 60% / 40% 50% 60% 50%",
        movement: {
            x: ["0%", "-2%", "1.5%", "-1%", "0%"],
            y: ["0%", "2%", "-1.5%", "2.5%", "0%"],
        },
        scale: [1, 1.04, 1.08, 1.02, 1],
        rotate: [0, -4, 6, -5, 0],
    },
    {
        // Blob 3: Phantom Cyan — tension accent
        size: "60vw",
        position: { top: "40%", left: "25%" },
        blur: "blur(140px)",
        lightColor: "rgba(167, 243, 208, 0.20)",
        darkColor: "rgba(45, 212, 191, 0.15)",
        duration: 35,
        radiusA: "50% 50% 40% 60% / 40% 60% 50% 50%",
        radiusB: "40% 60% 60% 40% / 60% 40% 40% 60%",
        radiusC: "60% 40% 50% 50% / 50% 50% 60% 40%",
        movement: {
            x: ["0%", "2.5%", "-2%", "1.5%", "0%"],
            y: ["0%", "-3%", "2%", "-2%", "0%"],
        },
        scale: [1, 1.05, 0.98, 1.07, 1],
        rotate: [0, 10, -6, 12, 0],
    },
    {
        // Blob 4: Ghost warmth
        size: "75vw",
        position: { top: "-5%", right: "-20%" },
        blur: "blur(120px)",
        lightColor: "rgba(221, 214, 254, 0.18)",
        darkColor: "rgba(99, 102, 241, 0.12)",
        duration: 50,
        radiusA: "40% 60% 50% 50% / 50% 60% 40% 50%",
        radiusB: "50% 50% 60% 40% / 40% 50% 50% 60%",
        radiusC: "30% 70% 40% 60% / 60% 40% 70% 30%",
        movement: {
            x: ["0%", "-1.5%", "2%", "-2%", "0%"],
            y: ["0%", "1.5%", "-2.5%", "1%", "0%"],
        },
        scale: [1, 1.03, 1.06, 1.01, 1],
        rotate: [0, -3, 7, -2, 0],
    },
];

export function FluidObsidianBackground() {
    return (
        <div
            className="fixed inset-0 overflow-hidden pointer-events-none"
            style={{ zIndex: -10 }}
        >
            {/* SVG Noise Filter */}
            <svg className="absolute w-0 h-0" aria-hidden="true">
                <defs>
                    <filter id="obsidian-grain">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.65"
                            numOctaves="4"
                            stitchTiles="stitch"
                        />
                        <feColorMatrix type="saturate" values="0" />
                    </filter>
                </defs>
            </svg>

            {/* Blob layer — blur is on each blob only (safe, won't affect content) */}
            <div className="absolute inset-0">
                {BLOB_CONFIGS.map((blob, i) => (
                    <motion.div
                        key={i}
                        className="absolute mix-blend-multiply dark:mix-blend-screen"
                        style={{
                            width: blob.size,
                            height: blob.size,
                            ...blob.position,
                            filter: blob.blur,
                        }}
                        animate={{
                            ...blob.movement,
                            scale: blob.scale,
                            rotate: blob.rotate,
                            borderRadius: [
                                blob.radiusA,
                                blob.radiusB,
                                blob.radiusC,
                                blob.radiusA,
                            ],
                        }}
                        transition={{
                            duration: blob.duration,
                            repeat: Infinity,
                            repeatType: "loop",
                            ease: "linear",
                        }}
                    >
                        <div
                            className="absolute inset-0 rounded-[inherit] dark:hidden"
                            style={{ background: blob.lightColor }}
                        />
                        <div
                            className="absolute inset-0 rounded-[inherit] hidden dark:block"
                            style={{ background: blob.darkColor }}
                        />
                    </motion.div>
                ))}
            </div>

            {/* Grain overlay — SVG turbulence at soft-light */}
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.025]"
                style={{
                    filter: "url(#obsidian-grain)",
                    mixBlendMode: "soft-light",
                }}
            />
        </div>
    );
}
