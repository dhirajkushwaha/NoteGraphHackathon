import React from 'react';
import Link from 'next/link';
import { StudySpace } from '@/types';
import { formatDate, truncateText } from '@/lib/utils';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';

interface SpaceCardProps {
  space: StudySpace;
  onDelete?: (id: string) => void;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ space, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm('Are you sure you want to delete this study space?')) {
      onDelete(space._id);
    }
  };

  return (
    <Link href={`/spaces/${space._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <div className="flex flex-col h-full">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {truncateText(space.subject, 40)}
            </h3>
            {space.topic && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {truncateText(space.topic, 60)}
              </p>
            )}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(space.createdAt)}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
              {space.users.length} member{space.users.length !== 1 ? 's' : ''}
            </span>
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                className="text-xs"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};