'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  MessageSquare,
  Heart,
  Shield,
  Loader2,
  Send,
  Stethoscope,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollAreaViewport, ScrollAreaScrollbar, ScrollAreaThumb } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { sendChatMessage } from '@/lib/llm_chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
}

interface ChatSectionProps {
  patientId: number;
  patientName: string;
  patient: any;
  summary: any;
  vitalSigns: any[];
  tests: any[];
  doctorName: string;
}

export function ChatSection({
  patientId,
  patientName,
  patient,
  summary,
  vitalSigns,
  tests,
  doctorName,
}: ChatSectionProps) {
  const { getAccessTokenSilently } = useAuth0();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      sender: 'copilot',
      text: `Hello, Dr. ${doctorName}! I'm **DeepCardio Copilot** 🫀, your cardiology assistant. How can I assist with ${patientName}'s heart health today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: messages.length,
      sender: 'user',
      text: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = await getAccessTokenSilently();
      console.log('Auth0 Token:', token);
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        console.log('Decoded Token Payload:', decodedToken);
      } catch (e) {
        console.error('Failed to decode token:', e);
      }

      const patientContext = {
        demographics: patient?.demographics,
        contact_info: patient?.contact_info,
        social_info: patient?.social_info,
        symptoms: patient?.symptoms,
        personal_history: patient?.personal_history,
        vital_signs: vitalSigns,
        tests,
        risks: patient?.risks,
        summary,
        follow_up_actions: patient?.follow_up_actions,
        recommendations: patient?.recommendations,
        referrals: patient?.referrals,
        life_style_advice: patient?.life_style_advice,
        presumptive_diagnoses: patient?.presumptive_diagnoses,
        tests_to_order: patient?.tests_to_order,
      };
      console.log('Sending to LLM:', { patient_id: patientId, message: input, patient_context: patientContext });

      const { response } = await sendChatMessage({
        patient_id: patientId,
        message: input,
        patient_context: patientContext,
      });

      console.log('LLM Response:', response);
      const copilotMessage: Message = {
        id: messages.length + 1,
        sender: 'copilot',
        text: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, copilotMessage]);
    } catch (err: any) {
      console.error('Failed to fetch chat response:', err);
      let errorMessage = 'Failed to get response from DeepCardio Copilot. Please try again.';
      if (err.message.includes('API key')) {
        errorMessage = 'OpenAI API key is missing or invalid. Please check the environment configuration.';
      }
      toast.error(errorMessage);
      const errorMsg: Message = {
        id: messages.length + 1,
        sender: 'copilot',
        text: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
      {/* Header */}
      <div className="relative bg-gradient-to-r from-blue-700 via-indigo-800 to-red-800 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,0 C30,50 70,50 100,0 L100,100 L0,100 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <h1 className="text-4xl font-extrabold text-white flex items-center gap-4">
            <Stethoscope className="w-10 h-10 pulse-animation text-red-400" />
            DeepCardio Copilot
          </h1>
          <p className="text-lg text-blue-100 mt-3 max-w-xl">
            AI-driven cardiology insights for {patientName}’s heart health.
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-md rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-100 to-red-100">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <Heart className="w-6 h-6 text-red-500 pulse-animation" />
                Cardiology Chat
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white px-3 py-1">
                HIPAA Compliant
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[70vh] pr-4">
              <ScrollAreaViewport ref={scrollAreaRef}>
                <div className="space-y-6">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          'flex items-start gap-3',
                          msg.sender === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <Avatar className="w-10 h-10">
                          {msg.sender === 'copilot' ? (
                            <>
                              <AvatarImage src="/heart-logo.png" alt="DeepCardio" />
                              <AvatarFallback className="bg-blue-100 text-blue-600">DC</AvatarFallback>
                            </>
                          ) : (
                            <AvatarFallback className="bg-blue-600 text-white">
                              {doctorName[0]}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div
                          className={cn(
                            'max-w-[75%] rounded-lg p-4 shadow-md',
                            msg.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gradient-to-br from-gray-50 to-blue-50 text-gray-900'
                          )}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ children }) => (
                                <table className="w-full border-collapse my-2 text-sm">
                                  {children}
                                </table>
                              ),
                              th: ({ children }) => (
                                <th className="border border-gray-300 bg-gray-100 p-2 text-left font-semibold text-gray-700">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="border border-gray-300 p-2">{children}</td>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-base font-semibold mt-3 mb-2 text-gray-800">{children}</h3>
                              ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                          <p className="text-xs mt-2 opacity-60">
                            {format(new Date(msg.timestamp), 'h:mm a')}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start items-center gap-3"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src="/heart-logo.png" alt="DeepCardio" />
                        <AvatarFallback className="bg-blue-100 text-blue-600">DC</AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg p-4 max-w-[75%] shadow-md">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <p className="text-sm text-gray-600 font-medium">
                            DeepCardio Copilot is analyzing...
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollAreaViewport>
              <ScrollAreaScrollbar orientation="vertical">
                <ScrollAreaThumb className="bg-blue-400" />
              </ScrollAreaScrollbar>
            </ScrollArea>
            <div className="mt-6 flex items-center gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about heart health..."
                className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-300 rounded-lg py-3 text-sm"
                disabled={loading}
              />
              <Button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-red-600 hover:from-blue-700 hover:to-red-700 text-white rounded-lg px-5 py-3"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <span>Secured by DeepCardio AI</span>
          </div>
          <span>Cardiology AI v1.0</span>
        </div>
      </div>
    </div>
  );
}