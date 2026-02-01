/**
 * LookReveal Composition
 *
 * Animated video that reveals outfit items one by one,
 * perfect for sharing on Instagram Stories or TikTok.
 *
 * Animation sequence:
 * 1. Intro with logo (0-30 frames)
 * 2. Items reveal one by one (30-180 frames)
 * 3. Full outfit display with pulse (180-210 frames)
 * 4. Watermark/CTA (210-240 frames)
 */

import React from "react";
import {
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    spring,
    Sequence,
    Img,
    AbsoluteFill,
} from "remotion";

// Types
export interface LookItem {
    id: string;
    imageUrl: string;
    category: "top" | "bottom" | "shoes" | "accessory" | "outerwear";
    name: string;
}

export interface LookRevealProps {
    [key: string]: unknown;
    title: string;
    items: LookItem[];
    backgroundColor?: string;
    accentColor?: string;
}

// Sub-components
const Logo: React.FC<{ accentColor: string }> = ({ accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({
        frame,
        fps,
        config: { damping: 12 },
    });

    const opacity = interpolate(frame, [0, 15], [0, 1], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                opacity,
                transform: `scale(${scale})`,
            }}
        >
            {/* Eye Icon */}
            <div
                style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${accentColor}, #EC4899)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 60px ${accentColor}50`,
                }}
            >
                <span
                    style={{
                        fontSize: 60,
                        color: "white",
                    }}
                >
                    👁️
                </span>
            </div>
            <h1
                style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "white",
                    marginTop: 20,
                    letterSpacing: "-0.02em",
                }}
            >
                Ojo de Loca
            </h1>
        </div>
    );
};

const ClothingCard: React.FC<{
    item: LookItem;
    index: number;
    totalItems: number;
}> = ({ item, index, totalItems }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Stagger entrance: each item enters 15 frames after the previous
    const delay = index * 15;
    const localFrame = Math.max(0, frame - delay);

    const slideIn = spring({
        frame: localFrame,
        fps,
        config: { damping: 15 },
    });

    const opacity = interpolate(localFrame, [0, 10], [0, 1], {
        extrapolateRight: "clamp",
    });

    // Calculate position based on item count for a nice grid
    const isVertical = totalItems <= 3;
    const itemHeight = isVertical ? 280 : 200;
    const itemWidth = isVertical ? 220 : 180;

    return (
        <div
            style={{
                opacity,
                transform: `translateY(${interpolate(slideIn, [0, 1], [50, 0])}px) scale(${interpolate(slideIn, [0, 1], [0.8, 1])})`,
                width: itemWidth,
                height: itemHeight,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                border: "3px solid rgba(255,255,255,0.2)",
            }}
        >
            <Img
                src={item.imageUrl}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                }}
            />
            {/* Category label */}
            <div
                style={{
                    position: "absolute",
                    bottom: 10,
                    left: 10,
                    right: 10,
                    background: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 10,
                    padding: "8px 12px",
                }}
            >
                <span
                    style={{
                        color: "white",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    {item.name}
                </span>
            </div>
        </div>
    );
};

const Title: React.FC<{ title: string; accentColor: string }> = ({
    title,
    accentColor,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideUp = spring({
        frame,
        fps,
        config: { damping: 20 },
    });

    return (
        <h2
            style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 56,
                fontWeight: 800,
                color: "white",
                textAlign: "center",
                transform: `translateY(${interpolate(slideUp, [0, 1], [30, 0])}px)`,
                opacity: interpolate(slideUp, [0, 1], [0, 1]),
                textShadow: `0 4px 20px ${accentColor}50`,
            }}
        >
            {title}
        </h2>
    );
};

const Watermark: React.FC = () => {
    const frame = useCurrentFrame();

    const opacity = interpolate(frame, [0, 15], [0, 0.8], {
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                opacity,
                display: "flex",
                alignItems: "center",
                gap: 10,
            }}
        >
            <span style={{ fontSize: 20 }}>👁️</span>
            <span
                style={{
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 18,
                    color: "rgba(255,255,255,0.7)",
                    fontWeight: 500,
                }}
            >
                Creado con Ojo de Loca
            </span>
        </div>
    );
};

// Main Composition
export const LookReveal: React.FC<LookRevealProps> = ({
    title,
    items,
    backgroundColor = "#0F172A",
    accentColor = "#8B5CF6",
}) => {
    const { width, height } = useVideoConfig();
    const isVertical = height > width;

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColor}DD 50%, ${accentColor}20 100%)`,
            }}
        >
            {/* Decorative gradient orbs */}
            <div
                style={{
                    position: "absolute",
                    top: "10%",
                    right: "-10%",
                    width: 400,
                    height: 400,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${accentColor}40, transparent 70%)`,
                    filter: "blur(60px)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    bottom: "20%",
                    left: "-10%",
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, #EC489940, transparent 70%)`,
                    filter: "blur(60px)",
                }}
            />

            {/* Sequence 1: Logo Intro (frames 0-30) */}
            <Sequence from={0} durationInFrames={30}>
                <AbsoluteFill
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Logo accentColor={accentColor} />
                </AbsoluteFill>
            </Sequence>

            {/* Sequence 2: Title + Items Reveal (frames 30-210) */}
            <Sequence from={30} durationInFrames={180}>
                <AbsoluteFill
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: isVertical ? 60 : 40,
                        gap: isVertical ? 40 : 30,
                    }}
                >
                    <Title title={title} accentColor={accentColor} />

                    {/* Items Grid */}
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "center",
                            gap: 20,
                            maxWidth: "100%",
                        }}
                    >
                        {items.map((item, index) => (
                            <ClothingCard
                                key={item.id}
                                item={item}
                                index={index}
                                totalItems={items.length}
                            />
                        ))}
                    </div>
                </AbsoluteFill>
            </Sequence>

            {/* Sequence 3: Watermark (frames 210-240) */}
            <Sequence from={210} durationInFrames={30}>
                <AbsoluteFill
                    style={{
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        paddingBottom: 80,
                    }}
                >
                    <Watermark />
                </AbsoluteFill>
            </Sequence>
        </AbsoluteFill>
    );
};
