import React from 'react';
import { Card } from './Card';

interface PullToRefreshIndicatorProps {
  pullPercentage: number;
  isRefreshing: boolean;
  shouldRefresh: boolean;
}

const PullToRefreshIndicator = ({
  pullPercentage,
  isRefreshing,
  shouldRefresh
}: PullToRefreshIndicatorProps) => {
  const opacity = Math.min(pullPercentage / 100, 1);
  const scale = Math.min(0.5 + (pullPercentage / 100) * 0.5, 1);
  const rotation = pullPercentage * 3.6; // 360 degrees at 100%

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none"
      style={{
        opacity,
        transform: `translateY(${Math.min(pullPercentage / 2, 40)}px)`,
        transition: isRefreshing ? 'all 0.3s ease' : 'none'
      }}
    >
      <Card
        variant="glass"
        padding="none"
        rounded="full"
        className="w-10 h-10 flex items-center justify-center"
        style={{
          transform: `scale(${scale})`,
          transition: isRefreshing ? 'transform 0.3s ease' : 'none'
        }}
      >
        {isRefreshing ? (
          <span className="material-symbols-outlined text-primary text-2xl animate-spin">
            sync
          </span>
        ) : (
          <span
            className={`material-symbols-outlined text-2xl transition-colors duration-300 ${
              shouldRefresh ? 'text-primary' : 'text-gray-400'
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s linear, color 0.3s ease'
            }}
          >
            arrow_downward
          </span>
        )}
      </Card>
    </div>
  );
};

export default PullToRefreshIndicator;
