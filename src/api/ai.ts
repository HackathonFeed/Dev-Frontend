import { apiRequest } from './client';
import type { ValidatorResponse } from '../types';

// ── Idea Validator ────────────────────────────────────────────────────────────

export interface ValidateIdeaRequest {
  projectTitle: string;
  hackathonName?: string | null;
  techStack?: string | null;
  conceptPitch: string;
}

export async function validateIdea(payload: ValidateIdeaRequest): Promise<ValidatorResponse> {
  return apiRequest<ValidatorResponse>('/ai/validate-idea', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Legacy stateless chat ─────────────────────────────────────────────────────

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiHackathonContext {
  id?: string | null;
  title: string;
  themes?: string[];
  deadline?: string | null;
  prize_pool?: string | null;
  mode?: string | null;
  source_platform?: string | null;
  eligibility?: string[];
  tags?: string[];
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  hackathon_context?: AiHackathonContext | null;
}

export interface AiChatResponse {
  reply: string;
}

export async function chatWithCopilot(payload: AiChatRequest): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Chat Sessions ─────────────────────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  hackathon_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  hackathon_context: AiHackathonContext | null;
  created_at: string;
  updated_at: string;
  messages: ChatSessionMessage[];
}

export interface CreateSessionPayload {
  hackathon_context?: AiHackathonContext | null;
}

export interface UpdateSessionPayload {
  title?: string;
  hackathon_context?: AiHackathonContext | null;
}

export interface SendMessagePayload {
  message: string;
}

export interface ProjectSnippet {
  id: string;
  title: string;
  tagline: string | null;
  url: string;
  thumbnail: string | null;
  technologies: string[];
  hackathon_name: string | null;
  likes_count: number | null;
  views: number | null;
  team_members_count: number;
  is_winner: boolean;
  github_url?: string | null;
  demo_url?: string | null;
}

export interface SendMessageResponse {
  reply: string;
  session_id: string;
  message_id: string;
  projects?: ProjectSnippet[] | null;
}

export async function listChatSessions(): Promise<ChatSession[]> {
  return apiRequest<ChatSession[]>('/ai/sessions', { method: 'GET' });
}

export async function createChatSession(payload: CreateSessionPayload): Promise<ChatSessionDetail> {
  return apiRequest<ChatSessionDetail>('/ai/sessions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getChatSession(sessionId: string): Promise<ChatSessionDetail> {
  return apiRequest<ChatSessionDetail>(`/ai/sessions/${sessionId}`, { method: 'GET' });
}

export async function updateChatSession(
  sessionId: string,
  payload: UpdateSessionPayload,
): Promise<ChatSessionDetail> {
  return apiRequest<ChatSessionDetail>(`/ai/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await apiRequest<null>(`/ai/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function sendSessionMessage(
  sessionId: string,
  payload: SendMessagePayload,
): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>(`/ai/sessions/${sessionId}/chat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
