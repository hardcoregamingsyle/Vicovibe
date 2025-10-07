import React, { useState, useRef, useEffect } from "react";
import { useChat } from "../hooks/useChat";

interface ChatBoxProps {
  projectId: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ projectId }) => {
  const { messages, send } = useChat(projectId);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    await send(input);
    setInput("");
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0b0c10] text-white rounded-2xl shadow-lg p-4">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-[#1a1a1a] rounded-xl p-3">
        {messages?.map((msg: any) => (
          <div
            key={msg._id}
            className={`p-2 rounded-lg ${
              msg.role === "assistant"
                ? "bg-blue-900/40 self-start"
                : "bg-green-900/40 self-end"
            } max-w-[80%]`}
          >
            <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="flex items-center bg-[#1f2833] rounded-xl p-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 resize-none bg-transparent text-white outline-none p-2 text-sm"
          rows={1}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 ml-2 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
