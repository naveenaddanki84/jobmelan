'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { startMockInterview, processInterviewAnswer, InterviewFeedback } from '@/actions/interview-actions';
import { ResumeSchema } from '@/types';
import { X, Send, User, Bot, ThumbsUp, AlertCircle, RefreshCcw, Briefcase } from 'lucide-react';
import { UpgradePrompt } from './UpgradePrompt';
import { cn } from '@/lib/utils';

interface InterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeSchema;
  jobDescription: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  feedback?: InterviewFeedback;
}

export const InterviewModal: React.FC<InterviewModalProps> = ({
  isOpen,
  onClose,
  resumeData,
  jobDescription
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Start interview when opened
  useEffect(() => {
    if (isOpen && !interviewStarted) {
      handleStartInterview();
    }
  }, [isOpen]);

  const handleStartInterview = async () => {
    setLoading(true);
    setError(null);
    setInterviewStarted(true);
    setMessages([]);

    try {
      const context = `
        Role: ${resumeData.basics.name}
        Skills: ${resumeData.skills.map(s => s.keywords.join(', ')).join('; ')}
        Experience: ${resumeData.experience.map(e => `${e.position} at ${e.company}`).join('; ')}
      `;

      const response = await startMockInterview(jobDescription, context);

      setMessages([
        {
          id: 'welcome',
          role: 'ai',
          content: response.message
        }
      ]);
    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message immediately
    const newMessages = [
      ...messages,
      { id: Date.now().toString(), role: 'user' as const, content: userMessage }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Get the last AI question
      const lastAiMessage = messages.filter(m => m.role === 'ai').pop();
      const currentQuestion = lastAiMessage ? lastAiMessage.content : "Tell me about yourself.";

      const context = `
        Role: ${resumeData.basics.name}
        Skills: ${resumeData.skills.map(s => s.keywords.join(', ')).join('; ')}
      `;

      const response = await processInterviewAnswer(
        currentQuestion,
        userMessage,
        jobDescription,
        context
      );

      // Add AI response with feedback
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: response.message,
          feedback: response.feedback
        }
      ]);

    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (e: any) => {
    const errorMessage = e?.message || String(e);
    if (errorMessage.includes("PRO_SUBSCRIPTION_REQUIRED") || errorMessage === "PRO_SUBSCRIPTION_REQUIRED") {
      setShowUpgradePrompt(true);
    } else {
      console.error("Interview error:", e);
      setError("Failed to connect to AI interviewer. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-gradient-to-r from-brand-50 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg text-brand-700">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-display">Mock Interview</h2>
              <p className="text-xs text-stone-500">Interactive AI Interviewer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleStartInterview} title="Restart Interview">
              <RefreshCcw className="w-4 h-4" />
            </Button>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-6 custom-scrollbar">
          {messages.length === 0 && loading && (
            <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-2">
              <Bot className="w-8 h-8 animate-bounce" />
              <p className="text-sm">Preparing your interview...</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}>

              {/* Message Bubble */}
              <div className={cn(
                "p-4 rounded-2xl shadow-sm text-sm leading-relaxed relative",
                msg.role === 'user'
                  ? "bg-brand-600 text-white rounded-tr-none"
                  : "bg-white border border-stone-200 text-stone-700 rounded-tl-none"
              )}>
                {/* Avatar Icon */}
                <div className={cn(
                  "absolute -top-3 w-6 h-6 rounded-full flex items-center justify-center border shadow-sm text-xs",
                  msg.role === 'user'
                    ? "bg-brand-700 border-brand-500 text-white -right-2"
                    : "bg-white border-stone-200 text-brand-600 -left-2"
                )}>
                  {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>

                {msg.content}
              </div>

              {/* Feedback Block (Only for AI messages that have feedback on the PREVIOUS user answer) */}
              {msg.role === 'ai' && msg.feedback && (
                <div className="mt-3 ml-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl w-full text-sm animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2 text-indigo-700 font-semibold">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Feedback on your answer</span>
                    <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs border border-indigo-200">
                      Score: {msg.feedback.rating}/10
                    </span>
                  </div>
                  <p className="text-stone-600 mb-3">{msg.feedback.feedback}</p>

                  <div className="bg-white/60 p-3 rounded-lg border border-indigo-100/50">
                    <p className="text-xs font-bold text-indigo-600 mb-1">Better Answer Example:</p>
                    <p className="text-xs text-stone-600 italic">"{msg.feedback.betterAnswer}"</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && messages.length > 0 && (
            <div className="self-start flex items-center gap-2 text-stone-400 text-xs ml-2">
              <Bot className="w-4 h-4" />
              <span className="animate-pulse">AI is thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-stone-200 shrink-0">
          {error && (
            <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your answer here..."
              className="flex-1 resize-none border border-stone-300 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm min-h-[50px] max-h-[120px]"
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || loading}
              className="h-auto px-4 rounded-xl"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-[10px] text-stone-400 mt-2 text-center">
            Press Enter to send. AI will provide instant feedback on your answer.
          </p>
        </div>

      </div>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Interactive Mock Interview"
      />
    </div>
  );
};
