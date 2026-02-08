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


export interface SpaceUser {
  id: string;
  username: string;
  email: string;
  is_owner: boolean;
  added_at?: string;
}












// Add these to your existing types.ts

export interface PostGroup {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  is_public: boolean;
  created_by: string;
  members: string[];
  moderators: string[];
  createdAt: string;
  created_by_user?: {
    id: string;
    username: string;
  };
  is_member?: boolean;
  is_moderator?: boolean;
  is_creator?: boolean;
  member_count?: number;
  current_user_role?: 'creator' | 'moderator' | 'member' | 'non_member';
}

export interface Post {
  _id: string;
  groupId: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  files: string[];
  upvotes: number;
  downvotes: number;
  comments: Comment[];
  is_pinned: boolean;
  createdAt: string;
  author?: {
    id: string;
    username: string;
  };
  comment_count?: number;
  user_upvoted?: boolean;
  user_downvoted?: boolean;
  group?: {
    id: string;
    name: string;
    is_public: boolean;
  };
}

export interface Comment {
  _id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  author?: {
    id: string;
    username: string;
  };
}

export interface CreateGroupData {
  name: string;
  description?: string;
  is_public: boolean;
}

export interface CreatePostData {
  title: string;
  content: string;
  tags?: string[];
  files?: string[];
}

export interface CreateCommentData {
  content: string;
  parentCommentId?: string;
}