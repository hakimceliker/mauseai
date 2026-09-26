'use client';

import React, { useState } from 'react';

export interface Message {
  id: string;
  sender: 'user' | 'claude' | 'gpt4' | 'mouseai' | 'system';
  content: string;
  timestamp: string;
  role?: string;
}

interface ConversationPanelProps {
  messages: Message[];
  taskId: string;
}

const senderConfig = {
  user: { label: 'Kullanıcı', color: 'bg-blue-500/10 border-blue-500/30 text-blue-100', avatar: '👤' },
  claude: { label: 'Claude', color: 'bg-purple-500/10 border-purple-500/30 text-purple-100', avatar: '🧠' },
  gpt4: { label: 'GPT-4', color: 'bg-orange-500/10 border-orange-500/30 text-orange-100', avatar: '⚡' },
  mouseai: { label: 'MouseAI', color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-100', avatar: '🤖' },
  system: { label: 'Sistem', color: 'bg-slate-500/10 border-slate-500/30 text-slate-100', avatar: '⚙️' },
};

export function ConversationPanel({ messages }: ConversationPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [allMessages, setAllMessages] = useState(messages);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setAllMessages([...allMessages, message]);
      setNewMessage('');

      // Simulate AI response after a short delay
      setTimeout(() => {
        const aiResponse: Message = {
          id: `msg-${Date.now()}`,
          sender: 'mouseai',
          content: 'Mesajınız alındı ve işleniyor...',
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };
        setAllMessages((prev) => [...prev, aiResponse]);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm overflow-hidden">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {allMessages.map((message) => {
          const config = senderConfig[message.sender];
          return (
            <div key={message.id} className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${config.color} border`}>
                  {config.avatar}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-300">{config.label}</span>
                  <span className="text-xs text-slate-500">{message.timestamp}</span>
                </div>
                <div className={`rounded-lg p-3 ${config.color} border break-words`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input */}
      <div className="border-t border-slate-700/50 p-4 bg-slate-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Mesaj yazın..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-200"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
