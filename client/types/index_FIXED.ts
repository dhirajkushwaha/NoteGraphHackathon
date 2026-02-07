/**
 * User model - represents an authenticated user
 */
export interface User {
  id: string;
  email: string;
  username: string;
  created_at?: string;
}

/**
 * StudySpace model - represents a study space for organizing materials
 */
export interface StudySpace {
  _id: string;
  id?: string; // Alias for _id for consistency
  subject: string;
  topic?: string;
  users: string[];
  created_by?: string;
  createdAt: string;
}

/**
 * File model - represents an uploaded document
 * Note: Using 'UploadedFile' to avoid shadowing browser's File type
 */
export interface UploadedFile {
  _id: string;
  spaceId: string;
  path: string;
  filename: string;
  type: string;
  size: number;
  uploadedBy?: string;
  uploadedAt: string;
}

/**
 * ChatMessage model - represents a message in a study space chat
 */
export interface ChatMessage {
  _id: string;
  spaceId: string;
  author: string;
  authorType: 'user' | 'ai';
  text: string;
  createdAt: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData extends LoginCredentials {
  username: string;
}

/**
 * Statistics for a study space
 */
export interface SpaceStats {
  space_id: string;
  files: number;
  chats: number;
  graph: {
    chunks: number;
    concepts: number;
    relationships: number;
    space: string;
  };
  space_info: {
    subject: string;
    topic?: string;
    created_at: string;
  };
}

/**
 * API error response
 */
export interface ApiError {
  error: string;
  status_code?: number;
  detail?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  skip?: number;
  limit?: number;
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  message: string;
  file_id: string;
  filename: string;
  size: number;
  ingestion_status: string;
}
