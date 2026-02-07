// components/chat/FileUploader.tsx
'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface UploadProgress {
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
  fileId?: string;
  ingestionStatus?: string;
}

interface FileUploaderProps {
  spaceId: string;
  onUploadComplete: () => void;
}

export function FileUploader({ spaceId, onUploadComplete }: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    
    // Initialize upload progress for each file
    const initialUploads: UploadProgress[] = files.map(file => ({
      filename: file.name,
      progress: 0,
      status: 'pending'
    }));
    
    setUploads(initialUploads);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update status to uploading
        setUploads(prev => prev.map((upload, idx) => 
          idx === i ? { ...upload, status: 'uploading', progress: 10 } : upload
        ));

        const formData = new FormData();
        formData.append('file', file);

        try {
          // Upload with progress tracking
          const response = await api.post(`/spaces/${spaceId}/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploads(prev => prev.map((upload, idx) => 
                  idx === i ? { ...upload, progress } : upload
                ));
              }
            }
          });

          // Update status based on response
          setUploads(prev => prev.map((upload, idx) => 
            idx === i ? { 
              ...upload, 
              progress: 100, 
              status: response.data.ingestion.status === 'success' ? 'completed' : 'processing',
              fileId: response.data.file_id,
              ingestionStatus: response.data.ingestion.status
            } : upload
          ));

        } catch (error: any) {
          console.error(`Upload failed for ${file.name}:`, error);
          setUploads(prev => prev.map((upload, idx) => 
            idx === i ? { 
              ...upload, 
              status: 'failed', 
              error: error.response?.data?.detail || error.message || 'Upload failed'
            } : upload
          ));
        }
      }

      // Refresh data after all uploads
      onUploadComplete();
      
      // Clear uploads after 5 seconds
      setTimeout(() => {
        setUploads([]);
      }, 5000);

    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const getStatusColor = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'uploading': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'processing': return 'Processing...';
      case 'failed': return 'Failed';
      case 'uploading': return 'Uploading...';
      default: return 'Pending';
    }
  };

  return (
    <div className="space-y-6">
      {/* File upload area */}
      <div className="flex items-center justify-center w-full">
        <label className={`
          flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer
          ${isUploading 
            ? 'border-gray-400 bg-gray-100 dark:border-gray-600 dark:bg-gray-800' 
            : 'border-gray-300 hover:border-primary-500 bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-400'
          }
        `}>
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isUploading ? (
              <div className="w-8 h-8 mb-2 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">{isUploading ? 'Uploading...' : 'Click to upload'}</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PDF, DOC, DOCX, TXT, MD, CSV, JSON (Max 10MB)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.csv,.json"
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Upload progress list */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Upload Progress ({uploads.filter(u => u.status === 'completed').length}/{uploads.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploads.map((upload, index) => (
              <div key={index} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {upload.filename}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(upload.status)}`} />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {getStatusText(upload.status)}
                        {upload.ingestionStatus && upload.ingestionStatus !== 'success' && (
                          <span className="ml-2">({upload.ingestionStatus})</span>
                        )}
                      </p>
                    </div>
                    {upload.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {upload.error}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {upload.progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(upload.status)}`}
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• <span className="font-medium">Supported formats:</span> PDF, DOC, DOCX, TXT, MD, CSV, JSON</p>
        <p>• <span className="font-medium">Maximum file size:</span> 10MB per file</p>
        <p>• <span className="font-medium">Processing:</span> Files are analyzed and added to the knowledge graph</p>
        <p>• <span className="font-medium">Multiple files:</span> Select multiple files at once</p>
      </div>
    </div>
  );
}