import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Chat() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const response = await api.get('/chat/conversations');
      return response.data;
    },
    refetchInterval: 10000 // Poll every 10 seconds
  });

  // Fetch users for new conversations
  const { data: users } = useQuery({
    queryKey: ['chat-users'],
    queryFn: async () => {
      const response = await api.get('/chat/users');
      return response.data;
    }
  });

  // Fetch messages for selected user
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedUser?._id],
    queryFn: async () => {
      if (!selectedUser?._id) return [];
      const response = await api.get(`/chat/messages/${selectedUser._id}`);
      return response.data;
    },
    enabled: !!selectedUser?._id,
    refetchInterval: 5000 // Poll every 5 seconds for new messages
  });

  // Unread count
  const { data: unreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: async () => {
      const response = await api.get('/chat/unread');
      return response.data;
    },
    refetchInterval: 10000
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/chat/messages', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    },
    onSuccess: () => {
      setMessageText('');
      setAttachments([]);
      queryClient.invalidateQueries(['chat-messages']);
      queryClient.invalidateQueries(['chat-conversations']);
      queryClient.invalidateQueries(['chat-unread']);
      setTimeout(() => refetchMessages(), 500);
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() && attachments.length === 0) return;
    if (!selectedUser?._id) return;

    const formData = new FormData();
    formData.append('recipient', selectedUser._id);
    formData.append('content', messageText);
    
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });

    sendMessageMutation.mutate(formData);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getConversationWithUser = (userId) => {
    return conversations?.find(conv => conv.user?._id === userId || conv.user === userId);
  };

  const unreadCount = unreadData?.unreadCount || 0;
  const totalUnread = conversations?.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0) || 0;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Chat with team members</p>
      </div>

      <div className="flex-1 flex gap-4 bg-white rounded-lg shadow-md overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
            {totalUnread > 0 && (
              <p className="text-xs text-primary-600 mt-1">{totalUnread} unread message{totalUnread !== 1 ? 's' : ''}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations && conversations.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {conversations.map((conversation) => {
                  const otherUser = conversation.user;
                  const isSelected = selectedUser?._id === otherUser?._id || selectedUser === otherUser?._id;
                  const unreadCount = conversation.unreadCount || 0;

                  return (
                    <button
                      key={otherUser?._id || otherUser}
                      onClick={() => setSelectedUser(otherUser)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {otherUser?.firstName} {otherUser?.lastName}
                            </p>
                            {conversation.latestMessage && (
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {format(new Date(conversation.latestMessage.createdAt), 'MMM d')}
                              </span>
                            )}
                          </div>
                          {conversation.latestMessage && (
                            <p className="text-xs text-gray-600 truncate">
                              {conversation.latestMessage.sender._id === user?.id ? 'You: ' : ''}
                              {conversation.latestMessage.content}
                            </p>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-primary-600 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet. Start a new chat!
              </div>
            )}

            {/* New Chat Section */}
            {users && users.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Start New Chat</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users
                    .filter(u => !conversations?.some(c => (c.user?._id === u._id || c.user === u._id)))
                    .map((otherUser) => (
                      <button
                        key={otherUser._id}
                        onClick={() => setSelectedUser(otherUser)}
                        className="w-full p-2 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                        </div>
                        <span className="text-sm text-gray-700">
                          {otherUser.firstName} {otherUser.lastName}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">{selectedUser.role}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages && messages.length > 0 ? (
                  messages.map((message) => {
                    const isOwn = message.sender._id === user?.id || message.sender === user?.id;
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && (
                            <p className="text-xs text-gray-500 mb-1 px-2">
                              {message.sender.firstName} {message.sender.lastName}
                            </p>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`block text-xs underline ${
                                      isOwn ? 'text-primary-100' : 'text-primary-600'
                                    }`}
                                  >
                                    📎 {att.name}
                                  </a>
                                ))}
                              </div>
                            )}
                            <p className={`text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                              {format(new Date(message.createdAt), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 text-sm py-8">
                    No messages yet. Start the conversation!
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                {attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded text-xs"
                      >
                        <span className="text-gray-700">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <label className="btn-secondary p-2 cursor-pointer">
                    <PaperClipIcon className="h-5 w-5" />
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 input resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={sendMessageMutation.isLoading || (!messageText.trim() && attachments.length === 0)}
                    className="btn-primary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

