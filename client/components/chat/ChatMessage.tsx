import React from 'react';
import { ChatMessage as ChatMessageType } from '@/types';
import { formatDate } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.authorType === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-3xl rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white rounded-br-none'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
        }`}
      >
        <div className="flex items-center mb-1">
          {!isUser && (
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          <span className={`text-sm font-medium ${isUser ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
            {isUser ? 'You' : 'Study Assistant'}
          </span>
          <span className={`mx-2 text-xs ${isUser ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'}`}>
            •
          </span>
          <span className={`text-xs ${isUser ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'}`}>
            {formatDate(message.createdAt)}
          </span>
        </div>
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
      </div>
    </div>
  );
};