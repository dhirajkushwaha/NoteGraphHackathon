import React from 'react';
import { StudySpace } from '@/types';
import { SpaceCard } from './SpaceCard';
import { LoadingSpinner } from '@/components/UI/LoadSpinner';

interface SpaceListProps {
  spaces: StudySpace[];
  loading?: boolean;
  onDelete?: (id: string) => void;
  emptyMessage?: string;
}

export const SpaceList: React.FC<SpaceListProps> = ({
  spaces,
  loading = false,
  onDelete,
  emptyMessage = 'No study spaces found'
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No spaces</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {spaces.map((space) => (
        <SpaceCard key={space._id} space={space} onDelete={onDelete} />
      ))}
    </div>
  );
};