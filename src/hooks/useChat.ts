import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:3000';

export interface ChatUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface MessageReaction {
  id: string;
  userId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments: string; // JSON
  replyToId?: string;
  isDeleted: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  reactions: MessageReaction[];
  reads: { userId: string; readAt: string }[];
}

export interface ConversationMember {
  userId: string;
  role: string;
  lastReadAt: string;
  isMuted: boolean;
}

export interface Conversation {
  id: string;
  name?: string;
  isGroup: boolean;
  avatar?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage?: ChatMessage;
  onlineMembers?: string[];
  myMembership?: ConversationMember;
}

export interface TypingInfo {
  userId: string;
  conversationId: string;
}

export function useChat(userId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map()); // convId -> userIds

  // Event listeners - components subscribe via these maps
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, handler: (data: unknown) => void) => {
    if (!listenersRef.current.has(event)) listenersRef.current.set(event, new Set());
    listenersRef.current.get(event)!.add(handler);
    return () => { listenersRef.current.get(event)?.delete(handler); };
  }, []);

  // Typed helpers
  const joinConversation = useCallback((conversationId: string) => emit('join_conversation', { conversationId }), [emit]);
  const leaveConversation = useCallback((conversationId: string) => emit('leave_conversation', { conversationId }), [emit]);
  const sendTypingStart = useCallback((conversationId: string) => emit('typing_start', { conversationId }), [emit]);
  const sendTypingStop = useCallback((conversationId: string) => emit('typing_stop', { conversationId }), [emit]);
  const sendMarkRead = useCallback((conversationId: string, lastMessageId: string) =>
    emit('mark_read', { conversationId, lastMessageId }), [emit]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${API_BASE}/chat`, {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('user_online', ({ userId: uid }: { userId: string }) => {
      setOnlineUsers(prev => new Set([...prev, uid]));
    });
    socket.on('user_offline', ({ userId: uid }: { userId: string }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(uid); return s; });
    });

    socket.on('typing_start', ({ userId: uid, conversationId }: TypingInfo) => {
      setTypingUsers(prev => {
        const m = new Map(prev);
        if (!m.has(conversationId)) m.set(conversationId, new Set());
        m.get(conversationId)!.add(uid);
        return m;
      });
    });
    socket.on('typing_stop', ({ userId: uid, conversationId }: TypingInfo) => {
      setTypingUsers(prev => {
        const m = new Map(prev);
        m.get(conversationId)?.delete(uid);
        return m;
      });
    });

    // Forward all other events to registered listeners
    const FORWARDED_EVENTS = [
      'new_message', 'message_edited', 'message_deleted',
      'reaction_updated', 'message_read',
      'conversation_updated', 'member_added', 'member_removed',
    ];
    for (const evt of FORWARDED_EVENTS) {
      socket.on(evt, (data: unknown) => {
        listenersRef.current.get(evt)?.forEach(fn => fn(data));
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId]);

  return {
    connected,
    onlineUsers,
    typingUsers,
    joinConversation,
    leaveConversation,
    sendTypingStart,
    sendTypingStop,
    sendMarkRead,
    on,
  };
}
