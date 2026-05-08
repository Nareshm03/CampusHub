'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import axios from '@/lib/axios';
import { formatDistanceToNow } from 'date-fns';
import { PaperAirplaneIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function ChatInterface() {
  const { socket, connected } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', handleNewMessage);
    socket.on('message_notification', handleMessageNotification);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message');
      socket.off('message_notification');
      socket.off('user_typing');
      socket.off('messages_read');
    };
  }, [socket, selectedConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const { data } = await axios.get('/messages/conversations');
      setConversations(data.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const loadMessages = async (userId) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/messages/${userId}`);
      setMessages(data.data.messages);
      
      // Mark messages as read
      await axios.put(`/messages/${userId}/read`);
      
      if (socket) {
        socket.emit('mark_read', { senderId: userId });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await axios.get(`/messages/users/search?query=${query}`);
      setSearchResults(data.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleUserSelect = async (user) => {
    // Check if conversation already exists
    const existingConv = conversations.find(
      conv => conv.otherUser._id === user._id
    );

    if (existingConv) {
      setSelectedConversation(existingConv);
      await loadMessages(user._id);
      if (socket) {
        socket.emit('join_conversation', user._id);
      }
    } else {
      // Create new conversation
      const newConv = {
        conversationId: `temp_${user._id}`,
        otherUser: user,
        lastMessage: null,
        unreadCount: 0
      };
      setConversations([newConv, ...conversations]);
      setSelectedConversation(newConv);
      setMessages([]);
      if (socket) {
        socket.emit('join_conversation', user._id);
      }
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const content = newMessage.trim();
    setNewMessage('');

    if (socket && connected) {
      socket.emit('send_message', {
        receiverId: selectedConversation.otherUser._id,
        content,
        type: 'text'
      });
    } else {
      // Fallback to HTTP
      try {
        const { data } = await axios.post(
          `/messages/${selectedConversation.otherUser._id}`,
          { content, type: 'text' }
        );
        handleNewMessage(data.data);
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !selectedConversation) return;

    socket.emit('typing', {
      receiverId: selectedConversation.otherUser._id,
      isTyping: true
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', {
        receiverId: selectedConversation.otherUser._id,
        isTyping: false
      });
    }, 1000);
  };

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    
    // Update conversation list
    setConversations(prev => {
      const updated = prev.filter(c => c.conversationId !== message.conversation);
      return [{
        conversationId: message.conversation,
        otherUser: message.sender._id === selectedConversation?.otherUser._id 
          ? message.sender 
          : message.receiver,
        lastMessage: message,
        unreadCount: 0
      }, ...updated];
    });
  };

  const handleMessageNotification = ({ message, conversationId }) => {
    if (selectedConversation?.conversationId !== conversationId) {
      // Update unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.conversationId === conversationId
            ? { ...conv, unreadCount: conv.unreadCount + 1, lastMessage: message }
            : conv
        )
      );
    }
  };

  const handleUserTyping = ({ userId, isTyping }) => {
    if (selectedConversation?.otherUser._id === userId) {
      setIsTyping(isTyping);
    }
  };

  const handleMessagesRead = ({ conversationId, readAt }) => {
    if (selectedConversation?.conversationId === conversationId) {
      setMessages(prev => 
        prev.map(msg => ({ ...msg, isRead: true, readAt }))
      );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Conversations Sidebar */}
      <div className="w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user._id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-3 text-left"
                >
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.role}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.conversationId}
              onClick={() => {
                setSelectedConversation(conv);
                loadMessages(conv.otherUser._id);
                if (socket) {
                  socket.emit('join_conversation', conv.otherUser._id);
                }
              }}
              className={`w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-start gap-3 ${
                selectedConversation?.conversationId === conv.conversationId
                  ? 'bg-blue-50 dark:bg-gray-700'
                  : ''
              }`}
            >
              <UserCircleIcon className="h-12 w-12 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-white truncate">
                    {conv.otherUser.name}
                  </div>
                  {conv.lastMessage && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {conv.lastMessage?.content || 'Start a conversation'}
                </div>
                {conv.unreadCount > 0 && (
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="h-10 w-10 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {selectedConversation.otherUser.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConversation.otherUser.role}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isOwn = message.sender._id !== selectedConversation.otherUser._id;
                    return (
                      <div
                        key={message._id || index}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            isOwn
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <div>{message.content}</div>
                          <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            {isOwn && message.isRead && ' • Read'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
              {!connected && (
                <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Disconnected - Messages will be sent when connection is restored
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
