/**
 * StatusBadge - Color-coded status indicator
 * Displays status with appropriate color based on job/evaluation state
 */

"use client"
import React from 'react';
import { getStatusColor } from './utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = getStatusColor(status);

  const sizeClasses = size === 'md'
    ? 'px-3 py-1.5 text-sm'
    : 'px-2 py-1 text-xs';

  return (
    <div
      className={`inline-block ${sizeClasses} rounded font-semibold`}
      style={{
        backgroundColor: colors.bg,
        borderWidth: '1px',
        borderColor: colors.border,
        color: colors.text
      }}
    >
      {status.toUpperCase()}
    </div>
  );
}
