
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { MessageCircle, X, Send, Sparkles, Loader2, BookOpen, Clock } from 'lucide-react';
import { mockSearchBooks, mockGetEvents } from '../services/api';

interface Message {
    role: 'user' | 'model';
    text: string;
    isError?: boolean;
}

const LibraryAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hi! I am the Thomian Library Assistant. I can help you find books or check library hours. What do you need?' }
    ]);
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // --- Tool Definitions ---

    const searchCatalogTool: FunctionDeclaration = {
        name: 'search_catalog',
        description: 'Search the library catalog for books by title, author, or keyword. Returns a list of books with their availability and location.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: {
                    type: Type.STRING,
                    description: 'The search term (e.g., "Great Gatsby", "Physics", "History").'
                }
            },
            required: ['query']
        }
    };

    const checkScheduleTool: FunctionDeclaration = {
        name: 'check_schedule',
        description: 'Check library opening hours, holidays, or upcoming events.',
        parameters: {
            type: Type.OBJECT,
            properties: {},
        }
    };

    // --- Logic ---

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsThinking(true);

        try {
            // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // Initial generation using gemini-3-flash-preview for text chat tasks
            let response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    { role: 'user', parts: [{ text: userMsg }] } // Simplified context for demo
                ],
                config: {
                    systemInstruction: "You are a helpful and friendly library assistant for St. Thomas Secondary School. You have access to the library catalog and schedule via tools. When a user asks about books, ALWAYS use the `search_catalog` tool to find real data. If a book is AVAILABLE, tell them the Shelf Location. If it is LOANED, tell them it is currently out. Be concise.",
                    tools: [{ functionDeclarations: [searchCatalogTool, checkScheduleTool] }]
                }
            });

            // Handle Function Calls
            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];
                let toolResult = {};

                if (call.name === 'search_catalog') {
                    const query = (call.args as any).query;
                    const books = await mockSearchBooks(query);
                    toolResult = {
                        found_count: books.length,
                        books: books.map(b => ({
                            title: b.title,
                            author: b.author,
                            shelf: b.shelf_location,
                            status: b.status,
                            call_number: b.ddc_code
                        }))
                    };
                } else if (call.name === 'check_schedule') {
                    const events = await mockGetEvents();
                    toolResult = { events: events };
                }

                // Send tool result back to model using gemini-3-flash-preview
                response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [
                        { role: 'user', parts: [{ text: userMsg }] },
                        { role: 'model', parts: response.candidates?.[0]?.content?.parts || [] }, // Previous model turn with function call
                        {
                            role: 'user', parts: [{
                                functionResponse: {
                                    name: call.name,
                                    response: { result: toolResult }
                                }
                            }]
                        }
                    ],
                });
            }

            // Final Text Response - Using .text property (not method) as per guidelines
            const aiText = response.text || "I'm sorry, I couldn't process that request.";
            setMessages(prev => [...prev, { role: 'model', text: aiText }]);

        } catch (err) {
            console.error("AI Error:", err);
            setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to the network right now. Please try searching manually.", isError: true }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <>
            {/* FAB Trigger */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 animate-bounce-subtle"
                >
                    <Sparkles className="h-6 w-6" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[90vw] md:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-fade-in-up">

                    {/* Header */}
                    <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-full">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Library Assistant</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] text-slate-300 font-medium">Online</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-none'
                                    } ${msg.isError ? 'bg-rose-50 border-rose-200 text-rose-700' : ''}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                                    <span className="text-xs text-slate-400 font-medium">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex items-center gap-2 bg-slate-100 rounded-full px-2 py-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about books..."
                                className="flex-1 bg-transparent px-3 py-1 outline-none text-sm text-slate-800 placeholder-slate-400"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isThinking}
                                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default LibraryAssistant;
