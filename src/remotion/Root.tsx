/**
 * Remotion Root - Entry point for all video compositions
 *
 * This file defines all available video compositions that can be
 * rendered by Remotion.
 */

import { Composition, Folder } from "remotion";
import { LookReveal, LookRevealProps } from "./compositions/LookReveal";

// Default composition props for preview
const defaultLookRevealProps: LookRevealProps = {
    title: "Mi Look del Día",
    items: [
        {
            id: "1",
            imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400",
            category: "top",
            name: "Blusa Blanca",
        },
        {
            id: "2",
            imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400",
            category: "bottom",
            name: "Jeans Azul",
        },
        {
            id: "3",
            imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400",
            category: "shoes",
            name: "Sneakers Blancas",
        },
    ],
    backgroundColor: "#0F172A",
    accentColor: "#8B5CF6",
};

export const RemotionRoot: React.FC = () => {
    return (
        <Folder name="Looks">
            {/* Look Reveal - Vertical Story Format (9:16) */}
            <Composition
                id="LookReveal"
                component={LookReveal}
                durationInFrames={240} // 8 seconds at 30fps
                fps={30}
                width={1080}
                height={1920}
                defaultProps={defaultLookRevealProps}
            />

            {/* Look Reveal - Square Format (1:1) for Feed */}
            <Composition
                id="LookRevealSquare"
                component={LookReveal}
                durationInFrames={240}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={defaultLookRevealProps}
            />
        </Folder>
    );
};

