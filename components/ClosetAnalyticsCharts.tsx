// Separate Charts Component for Lazy Loading
// Optimized imports for better tree-shaking
import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartsProps {
  categoryData: Array<{ name: string; value: number }>;
  colorData: Array<{ name: string; value: number }>;
  ageData: Array<{ name: string; value: number }>;
  vibeData: Array<{ name: string; value: number }>;
  seasonData: Record<string, number>;
}

const CATEGORY_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#00BCD4', '#4CAF50', '#FFC107'];
const AGE_COLORS = ['#4CAF50', '#9E9E9E'];

const seasonEmojis: Record<string, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

export const ClosetAnalyticsCharts: React.FC<ChartsProps> = ({
  categoryData,
  colorData,
  ageData,
  vibeData,
  seasonData
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Category Distribution */}
      <div className="liquid-glass p-4 rounded-2xl">
        <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200 mb-4">
          Distribución por Categoría
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Colors */}
      <div className="liquid-glass p-4 rounded-2xl">
        <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200 mb-4">
          Top 5 Colores
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={colorData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#E91E63" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Age Distribution */}
      <div className="liquid-glass p-4 rounded-2xl">
        <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200 mb-4">
          Antigüedad de Prendas
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={ageData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {ageData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Vibes */}
      <div className="liquid-glass p-4 rounded-2xl">
        <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200 mb-4">
          Top 5 Estilos
        </h3>
        <div className="space-y-2">
          {vibeData.map(({ name, value }) => (
            <div key={name} className="flex justify-between items-center">
              <span className="text-text-primary dark:text-gray-300 capitalize">{name}</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal Distribution */}
      <div className="liquid-glass p-4 rounded-2xl md:col-span-2">
        <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200 mb-4">
          Distribución Estacional
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(seasonData).map(([season, count]) => (
            <div key={season} className="text-center">
              <div className="text-4xl mb-2">{seasonEmojis[season] || '📅'}</div>
              <div className="text-lg font-semibold text-text-primary dark:text-gray-200">{count}</div>
              <div className="text-sm text-text-secondary dark:text-gray-400 capitalize">{season}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
