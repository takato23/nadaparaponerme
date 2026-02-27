import React, { useEffect, useState } from 'react';

interface ConfettiEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  speedX: number;
  speedY: number;
  rotationSpeed: number;
}

const COLORS = ['#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f97316'];

const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ trigger, onComplete }) => {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // Generate confetti pieces
    const pieces: Confetti[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      rotation: Math.random() * 360,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      speedX: (Math.random() - 0.5) * 2,
      speedY: Math.random() * 2 + 1,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }));

    setConfetti(pieces);

    // Clear after animation
    const timer = setTimeout(() => {
      setConfetti([]);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [trigger, onComplete]);

  if (confetti.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confetti-fall 3s linear forwards`,
            '--confetti-x': `${piece.speedX * 50}px`,
            '--confetti-rotate': `${piece.rotationSpeed * 360}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(var(--confetti-x)) rotate(var(--confetti-rotate));
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ConfettiEffect;
