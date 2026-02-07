export interface User {
  id: string;
  email: string;
  username: string;
  created_at?: string;
}

export interface StudySpace {
  _id: string;
  id?: string;
  subject: string;
  topic?: string;
  users: string[];
  created_by?: string;
  createdAt: string;
}

export interface File {
  _id: string;
  spaceId: string;
  path: string;
  filename: string;
  type: string;
  size: number;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface ChatMessage {
  _id: string;
  spaceId: string;
  author: string;
  authorType: 'user' | 'ai';
  text: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  username: string;
}

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

export interface ApiError {
  error: string;
  status_code?: number;
  detail?: string;
}