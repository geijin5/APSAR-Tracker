import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';

export default function Chat() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch conversations (includes groups and 1-on-1)
  const { data: conversations, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const response = await api.get('/chat/conversations');
      return response.data;
    },
    refetchInterval: 10000 // Poll every 10 seconds
  });

  // Fetch groups
  const { data: groups } = useQuery({
    queryKey: ['chat-groups'],
    queryFn: async () => {
      const response = await api.get('/chat/groups');
      return response.data;
    }
  });

  // Fetch users for new conversations
  const { data: users } = useQuery({
    queryKey: ['chat-users'],
    queryFn: async () => {
      const response = await api.get('/chat/users');
      return response.data;
    }
  });

  // Determine message endpoint based on conversation type
  const getMessagesEndpoint = () => {
    if (!selectedConversation) return null;
    
    if (selectedConversation.type === 'group') {
      const group = selectedConversation.group;
      if (group.type === 'custom') {
        return `/chat/messages/group/custom/${group.name}`;
      }
      return `/chat/messages/group/${group.type}`;
    } else {
      return `/chat/messages/${selectedConversation.user._id}`;
    }
  };

  // Fetch messages for selected conversation
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', selectedConversation?.type, selectedConversation?.user?._id, selectedConversation?.group?.type, selectedConversation?.group?.name],
    queryFn: async () => {
      const endpoint = getMessagesEndpoint();
      if (!endpoint) return [];
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: !!selectedConversation,
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

  // Clear chat mutation
  const clearChatMutation = useMutation({
    mutationFn: async (endpoint) => {
      const response = await api.delete(endpoint);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-messages']);
      queryClient.invalidateQueries(['chat-conversations']);
      refetchMessages();
    }
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/chat/groups', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat-groups']);
      queryClient.invalidateQueries(['chat-conversations']);
      setShowCreateGroup(false);
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    const formData = new FormData();
    formData.append('content', messageText);
    
    if (selectedConversation.type === 'group') {
      const group = selectedConversation.group;
      if (group.type === 'custom') {
        formData.append('groupName', group.name);
      } else {
        formData.append('groupType', group.type);
      }
    } else {
      formData.append('recipient', selectedConversation.user._id);
    }
    
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });

    sendMessageMutation.mutate(formData);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleClearChat = () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return;
    
    const group = selectedConversation.group;
    let endpoint;
    if (group.type === 'custom') {
      endpoint = `/chat/clear/custom/${group.name}`;
    } else {
      endpoint = `/chat/clear/${group.type}`;
    }

    if (window.confirm(`Are you sure you want to clear all messages in ${group.name}? This cannot be undone.`)) {
      clearChatMutation.mutate(endpoint);
    }
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const memberIds = formData.getAll('members');
    
    createGroupMutation.mutate({
      name: formData.get('name'),
      description: formData.get('description'),
      memberIds: memberIds
    });
  };

  const getConversationDisplayName = (conv) => {
    if (conv.type === 'group') {
      return conv.group.name;
    } else {
      return `${conv.user.firstName} ${conv.user.lastName}`;
    }
  };

  const getConversationIcon = (conv) => {
    if (conv.type === 'group') {
      return UserGroupIcon;
    } else {
      return UserCircleIcon;
    }
  };

  const canClearChat = () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return false;
    const group = selectedConversation.group;
    
    // Callout can only be cleared by admin/operator/trainer
    if (group.type === 'callout') {
      return ['admin', 'operator', 'trainer'].includes(user?.role);
    }
    
    // Other groups can be cleared by anyone (though we might want to restrict this)
    return true;
  };

  const unreadCount = unreadData?.unreadCount || 0;

  // Separate conversations into groups and 1-on-1
  // Use groups query as fallback if conversations hasn't loaded yet
  const groupConversations = conversations?.filter(c => c.type === 'group') || 
    (groups?.map(g => ({
      type: 'group',
      group: {
        _id: g._id,
        name: g.name,
        type: g.type,
        description: g.description
      },
      latestMessage: null,
      unreadCount: 0
    })) || []);
  const oneOnOneConversations = conversations?.filter(c => c.type === 'user') || [];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Chat with team members and groups</p>
        </div>
        <button
          onClick={() => setShowCreateGroup(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Group
        </button>
      </div>

      <div className="flex-1 flex gap-4 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Conversations</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-primary-600 mt-1">{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Group Chats Section */}
            <div className="mb-4">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Group Chats</h3>
              </div>
              {groupConversations.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {groupConversations.map((conversation) => {
                    const isSelected = selectedConversation?.type === 'group' && 
                      selectedConversation?.group?._id === conversation.group?._id;
                    const unreadCount = conversation.unreadCount || 0;
                    const Icon = getConversationIcon(conversation);

                    return (
                      <button
                        key={conversation.group?._id || conversation.group?.type}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {getConversationDisplayName(conversation)}
                              </p>
                              {conversation.latestMessage ? (
                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                  {format(new Date(conversation.latestMessage.createdAt), 'MMM d')}
                                </span>
                              ) : null}
                            </div>
                            {conversation.latestMessage ? (
                              <p className="text-xs text-gray-600 truncate">
                                {conversation.latestMessage.sender?.firstName}: {conversation.latestMessage.content}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 italic">No messages yet</p>
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
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {isLoadingConversations ? 'Loading groups...' : conversationsError ? 'Error loading groups' : 'No groups available'}
                </div>
              )}
            </div>

            {/* 1-on-1 Conversations Section */}
            {oneOnOneConversations.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direct Messages</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {oneOnOneConversations.map((conversation) => {
                    const isSelected = selectedConversation?.type === 'user' && 
                      selectedConversation?.user?._id === conversation.user?._id;
                    const unreadCount = conversation.unreadCount || 0;

                    return (
                      <button
                        key={conversation.user._id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50 border-l-4 border-primary-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {conversation.user.firstName?.[0]}{conversation.user.lastName?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {getConversationDisplayName(conversation)}
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
              </div>
            )}

            {(!conversations || conversations.length === 0) && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet. Start a new chat!
              </div>
            )}

            {/* New Chat Section */}
            {users && users.length > 0 && (
              <div className="border-t border-gray-200 p-4 mt-auto">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Start New Chat</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users
                    .filter(u => !oneOnOneConversations.some(c => c.user?._id === u._id))
                    .map((otherUser) => (
                      <button
                        key={otherUser._id}
                        onClick={() => setSelectedConversation({ type: 'user', user: otherUser })}
                        className="w-full p-2 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {otherUser.firstName?.[0]}{otherUser.lastName?.[0]}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
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
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedConversation.type === 'group' ? (
                    <>
                      <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white">
                        <UserGroupIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {getConversationDisplayName(selectedConversation)}
                        </h3>
                        {selectedConversation.group?.description && (
                          <p className="text-xs text-gray-500">{selectedConversation.group.description}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {selectedConversation.user.firstName?.[0]}{selectedConversation.user.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {getConversationDisplayName(selectedConversation)}
                        </h3>
                        <p className="text-xs text-gray-500 capitalize">{selectedConversation.user.role}</p>
                      </div>
                    </>
                  )}
                </div>
                {canClearChat() && (
                  <button
                    onClick={handleClearChat}
                    disabled={clearChatMutation.isLoading}
                    className="btn-secondary flex items-center gap-2 text-sm"
                    title="Clear all messages"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Clear Chat
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages && messages.length > 0 ? (
                  messages.map((message) => {
                    const isExternal = message.isExternal;
                    const isOwn = !isExternal && (message.sender?._id === user?.id || message.sender === user?.id);
                    const senderName = isExternal 
                      ? message.externalSenderName 
                      : (message.sender?.firstName && message.sender?.lastName 
                          ? `${message.sender.firstName} ${message.sender.lastName}` 
                          : 'Unknown');
                    
                    // Get source badge color
                    const getSourceColor = (source) => {
                      switch(source) {
                        case 'dispatch': return 'bg-blue-600';
                        case 'fire': return 'bg-red-600';
                        case 'ems': return 'bg-green-600';
                        case 'police': return 'bg-indigo-600';
                        default: return 'bg-orange-600';
                      }
                    };

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && (
                            <div className="flex items-center gap-2 mb-1 px-2">
                              <p className="text-xs text-gray-500">
                                {senderName}
                              </p>
                              {isExternal && (
                                <span className={`text-xs px-2 py-0.5 rounded-full text-white font-semibold ${getSourceColor(message.externalSource)}`}>
                                  {message.externalSource?.toUpperCase() || 'ADLC'}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isOwn
                                ? 'bg-primary-600 text-white'
                                : isExternal
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-600 text-gray-900 dark:text-gray-100'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {isExternal && (
                              <div className="mb-1 pb-1 border-b border-orange-200">
                                <p className="text-xs font-semibold text-orange-700">
                                  📡 External Message
                                </p>
                              </div>
                            )}
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
                        <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
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

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <form onSubmit={handleCreateGroup}>
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Group</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="input"
                    placeholder="Enter group name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Members</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
                    {users && users.length > 0 ? (
                      users.map((u) => (
                        <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            name="members"
                            value={u._id}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {u.firstName} {u.lastName}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No users available</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isLoading}
                  className="btn-primary"
                >
                  {createGroupMutation.isLoading ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
