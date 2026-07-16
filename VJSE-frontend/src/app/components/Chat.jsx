import React, { useEffect, useState, useRef } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat as StreamChatProvider,
  Channel,
  Window,
  ChannelHeader,
  MessageList,
  MessageComposer,
  Thread,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';

const apiKey = import.meta.env.VITE_STREAM_API_KEY;

export default function Chat({ currentUser, targetUser }) {
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [useMockChat, setUseMockChat] = useState(false);

  // Mock Chat State
  const [mockMessages, setMockMessages] = useState([
    {
      id: 1,
      senderId: targetUser.id,
      senderName: targetUser.name,
      text: `Hello ${currentUser.name}! Happy to connect. I see you are looking for strategic advice. How can I help you today?`,
      time: new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (useMockChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mockMessages, useMockChat]);

  useEffect(() => {
    if (!apiKey || apiKey === 'undefined') {
      console.warn("Stream API Key missing. Falling back to local Mock Chat simulation.");
      setUseMockChat(true);
      return;
    }

    let active = true;
    let client;
    
    try {
      client = StreamChat.getInstance(apiKey);
    } catch (e) {
      console.error("Stream client creation failed:", e);
      setUseMockChat(true);
      return;
    }

    async function initChat() {
      try {
        const response = await fetch('/api/chat/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: String(currentUser.id),
            userName: currentUser.name,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch chat token');
        }

        const { token } = await response.json();

        if (!active) return;

        await client.connectUser(
          {
            id: String(currentUser.id),
            name: currentUser.name,
          },
          token
        );

        const sortedIds = [String(currentUser.id), String(targetUser.id)].sort();
        const channelId = sortedIds.join('-');

        const newChannel = client.channel('messaging', channelId, {
          name: `Chat with ${targetUser.name}`,
          members: [String(currentUser.id), String(targetUser.id)],
        });

        await newChannel.watch();

        if (!active) return;

        setChatClient(client);
        setChannel(newChannel);
      } catch (err) {
        console.error('Error initializing Stream Chat, falling back to mock:', err);
        setUseMockChat(true);
      }
    }

    initChat();

    return () => {
      active = false;
      if (client && client.disconnectUser) {
        client.disconnectUser();
      }
    };
  }, [currentUser.id, currentUser.name, targetUser.id, targetUser.name]);

  const handleSendMockMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMessage = {
      id: Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: inputVal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMockMessages(prev => [...prev, userMessage]);
    setInputVal('');

    setTimeout(() => {
      let replyText = "That sounds interesting! Let's set up a call to talk about it further.";
      const lower = userMessage.text.toLowerCase();
      if (lower.includes("hello") || lower.includes("hi")) {
        replyText = `Hi ${currentUser.name}! How is VentureSpark doing?`;
      } else if (lower.includes("advice") || lower.includes("feedback")) {
        replyText = "I would be happy to review your prototype and offer my feedback. Send over the pitch deck or demo link!";
      } else if (lower.includes("pilot") || lower.includes("partner")) {
        replyText = "We are open to pilot partnerships. What kind of integration timeline are you looking at?";
      }

      setMockMessages(prev => [...prev, {
        id: Date.now() + 1,
        senderId: targetUser.id,
        senderName: targetUser.name,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    }, 1500);
  };

  if (useMockChat) {
    return (
      <div className="flex flex-col h-full bg-[#111111] text-white">
        {/* Mock Header */}
        <div className="flex items-center justify-between border-b border-[#1F2937] p-4 bg-[#161616]">
          <div>
            <h4 className="font-bold text-white text-base">{targetUser.name}</h4>
            <p className="text-xs text-[#9CA3AF]">Status: Online • Connected via Mock Simulator</p>
          </div>
          <span className="text-[10px] uppercase font-bold text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded-full border border-[#3B82F6]/30">
            Mock Mode
          </span>
        </div>

        {/* Mock Messages List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[460px] min-h-[350px]">
          <div className="text-center my-2">
            <span className="text-[10px] bg-[#1e293b] text-[#3B82F6] px-2 py-1 rounded border border-[#1F2937]">
              Notice: Stream API key was not configured. Loaded mock chat simulation.
            </span>
          </div>
          {mockMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  isMe
                    ? 'bg-[#3B82F6] text-white rounded-br-none'
                    : 'bg-[#1C1C1C] text-white border border-[#2A2A2A] rounded-bl-none'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <span className={`block text-[9px] mt-1 text-right ${isMe ? 'text-[#E0F2FE]/70' : 'text-[#9CA3AF]'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Mock Input */}
        <form onSubmit={handleSendMockMessage} className="border-t border-[#1F2937] p-4 bg-[#161616] flex gap-2">
          <input
            placeholder={`Send message to ${targetUser.name}...`}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-[#0A0A0A] border border-[#1F2937] focus:border-[#3B82F6] text-white rounded-xl h-11 px-4 outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl px-5 h-11 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    );
  }

  if (!chatClient || !channel) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <p>Connecting to chat...</p>
      </div>
    );
  }

  return (
    <StreamChatProvider client={chatClient}>
      <Channel channel={channel}>
        <Window>
          <ChannelHeader />
          <MessageList />
          <MessageComposer />
        </Window>
        <Thread />
      </Channel>
    </StreamChatProvider>
  );
}
