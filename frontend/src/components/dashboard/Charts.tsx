'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Enterprise blue palette
const COLORS = [
  '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  '#1d4ed8', '#1e40af', '#7c3aed', '#a78bfa',
];

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      titleColor: '#ffffff',
      bodyColor: '#d1d5db',
      cornerRadius: 8,
      padding: 10,
      titleFont: { family: 'Inter', weight: 'bold' as const, size: 13 },
      bodyFont: { family: 'Inter', weight: 'bold' as const, size: 12 },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { family: 'Inter', size: 11, weight: 'bold' as const },
        color: '#9ca3af',
      },
      border: { display: false },
    },
    y: {
      grid: { color: '#f3f4f6' },
      ticks: {
        font: { family: 'Inter', size: 11 },
        color: '#9ca3af',
      },
      border: { display: false },
    },
  },
};

interface ChartProps {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export function BarChart({ labels, datasets }: ChartProps) {
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: COLORS[i % COLORS.length],
      borderRadius: 6,
      borderSkipped: false as const,
      maxBarThickness: 40,
    })),
  };

  return <Bar data={data} options={commonOptions} />;
}

export function LineChart({ labels, datasets }: ChartProps) {
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: `${COLORS[i % COLORS.length]}15`,
      borderWidth: 2.5,
      pointRadius: 4,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: COLORS[i % COLORS.length],
      pointBorderWidth: 2,
      tension: 0.3,
      fill: true,
    })),
  };

  return <Line data={data} options={commonOptions} />;
}

interface DoughnutProps {
  labels: string[];
  dataPoints: number[];
}

export function DoughnutChart({ labels, dataPoints }: DoughnutProps) {
  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        backgroundColor: COLORS.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#ffffff',
        bodyColor: '#d1d5db',
        cornerRadius: 8,
        padding: 10,
      },
    },
  };

  return <Doughnut data={data} options={opts} />;
}
