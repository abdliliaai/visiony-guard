import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageCircle, 
  Mic, 
  MicOff, 
  Send, 
  Bot, 
  User, 
  Wifi, 
  WifiOff,
  Minimize2,
  Maximize2,
  X,
  Shield,
  Volume2,
  VolumeX
} from 'lucide-react';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { toast } from 'sonner';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'function' | 'system';
  content: string;
  timestamp: Date;
  functionCall?: {
    name: string;
    args: any;
    result?: any;
  };
}

interface SecurityChatbotProps {
  className?: string;
}

export function SecurityChatbot({ className }: SecurityChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  
  const chatRef = useRef<RealtimeChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        type: 'assistant',
        content: "Hello! I'm your Vision-Y Security Assistant. I can help you with security events, case management, device status, and threat analysis. You can type or use voice commands. How can I assist you today?",
        timestamp: new Date()
      }]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMessage = (data: any) => {
    console.log('Chatbot received message:', data.type, data);

    if (data.type === 'response.audio_transcript.delta') {
      if (data.delta) {
        setCurrentTranscript(prev => prev + data.delta);
      }
    } else if (data.type === 'response.audio_transcript.done') {
      if (currentTranscript.trim()) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: currentTranscript.trim(),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentTranscript('');
      }
    } else if (data.type === 'response.audio.delta') {
      setIsSpeaking(true);
    } else if (data.type === 'response.audio.done') {
      setIsSpeaking(false);
    } else if (data.type === 'response.function_call_arguments.done') {
      // Handle function call
      const functionMessage: Message = {
        id: Date.now().toString(),
        type: 'function',
        content: `Called function: ${data.name}`,
        timestamp: new Date(),
        functionCall: {
          name: data.name,
          args: JSON.parse(data.arguments)
        }
      };
      setMessages(prev => [...prev, functionMessage]);
    } else if (data.type === 'input_audio_buffer.speech_started') {
      setIsListening(true);
    } else if (data.type === 'input_audio_buffer.speech_stopped') {
      setIsListening(false);
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    if (connected) {
      toast.success('Connected to AI Security Assistant');
    } else {
      toast.error('Disconnected from AI Security Assistant');
    }
  };

  const connectToChat = async () => {
    try {
      if (chatRef.current) {
        chatRef.current.disconnect();
      }

      chatRef.current = new RealtimeChat(handleMessage, handleConnectionChange);
      await chatRef.current.connect();
    } catch (error) {
      console.error('Error connecting to chat:', error);
      toast.error('Failed to connect to AI assistant');
    }
  };

  const disconnectFromChat = () => {
    if (chatRef.current) {
      chatRef.current.disconnect();
      chatRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
  };

  const sendTextMessage = async () => {
    if (!inputText.trim() || !chatRef.current) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      await chatRef.current.sendMessage(inputText);
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  const formatMessageContent = (message: Message) => {
    if (message.functionCall) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="font-medium">Function: {message.functionCall.name}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <strong>Parameters:</strong>
            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
              {JSON.stringify(message.functionCall.args, null, 2)}
            </pre>
          </div>
        </div>
      );
    }
    return message.content;
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 bg-gradient-primary hover:bg-gradient-primary/90 shadow-glow"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className={`w-96 ${isMinimized ? 'h-16' : 'h-[600px]'} shadow-elegant transition-all duration-200`}>
        {/* Header */}
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-primary rounded">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm">Security AI Assistant</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1">
                  {isConnected ? (
                    <>
                      <Wifi className="w-3 h-3 text-success" />
                      Connected
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-destructive" />
                      Disconnected
                    </>
                  )}
                  {isListening && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <Mic className="w-3 h-3 mr-1" />
                      Listening
                    </Badge>
                  )}
                  {isSpeaking && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <Volume2 className="w-3 h-3 mr-1" />
                      Speaking
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="h-7 w-7 p-0"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="h-7 w-7 p-0"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  disconnectFromChat();
                }}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <Separator />
            <CardContent className="flex flex-col h-[500px] p-0">
              {/* Connection Controls */}
              {!isConnected && (
                <div className="p-4 border-b">
                  <Button
                    onClick={connectToChat}
                    className="w-full gap-2"
                    size="sm"
                  >
                    <Wifi className="w-4 h-4" />
                    Connect to AI Assistant
                  </Button>
                </div>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {message.type !== 'user' && (
                        <div className="flex-shrink-0">
                          {message.type === 'function' ? (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                              <Shield className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                              <Bot className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[80%] ${message.type === 'user' ? 'order-1' : ''}`}>
                        <div className={`rounded-lg px-3 py-2 ${
                          message.type === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : message.type === 'function'
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-muted'
                        }`}>
                          <div className="text-sm">
                            {formatMessageContent(message)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                      {message.type === 'user' && (
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Current transcript */}
                  {currentTranscript && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
                      </div>
                      <div className="max-w-[80%]">
                        <div className="rounded-lg px-3 py-2 bg-muted">
                          <div className="text-sm">{currentTranscript}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              {isConnected && (
                <>
                  <Separator />
                  <div className="p-4">
                    <div className="flex gap-2">
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message or ask about security events..."
                        className="flex-1"
                        disabled={!isConnected}
                      />
                      <Button
                        onClick={sendTextMessage}
                        size="sm"
                        disabled={!inputText.trim() || !isConnected}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>
                        {isListening ? "🎤 Listening..." : isSpeaking ? "🔊 AI Speaking..." : "💬 Voice & text ready"}
                      </span>
                      <div className="flex items-center gap-2">
                        {isConnected && (
                          <Badge variant="outline" className="text-xs">
                            <Wifi className="w-3 h-3 mr-1" />
                            Live AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}