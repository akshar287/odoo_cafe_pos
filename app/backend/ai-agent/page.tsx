'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, Clock, Play, CheckCircle2, XCircle, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { askAgentAction, getScheduledTasksAction, runPendingTasksNowAction } from '@/actions/agent';
import { trackEvent } from '@/lib/matomo';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ScheduledTask {
  _id: string;
  name: string;
  prompt: string;
  taskType: string;
  executeAt: string;
  intervalDays?: number;
  endAt?: string;
  status: 'pending' | 'completed' | 'failed';
  logs?: string;
  createdAt: string;
}

export default function AIAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI Admin Agent. I am powered by LangChain, LangGraph, and have full context of your database schemas (RAG). 

I can automate admin tasks such as:
1. Creating product categories (e.g. "Create a category 'Smoothies' with color blue").
2. Creating new products (e.g. "Create a vegetarian product 'Blueberry Smoothie' in the 'Smoothies' category priced at 180 rupees").
3. Creating coupons (e.g. "Create a coupon 'WINTER10' with 10% discount").
4. Scheduling delayed or recurring tasks (e.g. "Create a coupon 'FLAT100' with 100 rupees discount, active, every 15 days for 3 months").

How can I assist you today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [runningTasks, setRunningTasks] = useState(false);
  const [taskLogs, setTaskLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load scheduled tasks
  const loadTasks = async () => {
    setTasksLoading(true);
    const res = await getScheduledTasksAction();
    if (res.success && res.tasks) {
      setTasks(res.tasks);
    }
    setTasksLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setErrorMsg('');
    const userMsg = input.trim();
    setInput('');
    trackEvent('AI Agent', 'Submit Prompt', userMsg);
    
    const updatedHistory = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(updatedHistory);
    setLoading(true);

    const res = await askAgentAction(updatedHistory);
    setLoading(false);

    if (res.success && res.response) {
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
      // Reload tasks in case the agent scheduled a new task
      loadTasks();
    } else {
      setErrorMsg(res.error || 'Failed to get a response from the agent.');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Error: ${res.error || 'I encountered an issue processing your request. Please ensure GROQ_API_KEY is configured correctly.'}` }
      ]);
    }
  };

  const handleRunTasks = async () => {
    setRunningTasks(true);
    setTaskLogs([]);
    const res = await runPendingTasksNowAction();
    setRunningTasks(false);

    if (res.success && res.logs) {
      setTaskLogs(res.logs);
      loadTasks(); // Refresh tasks list
    } else {
      alert(res.error || 'Failed to run background tasks.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            AI Admin Agent Console
          </h2>
          <p className="text-sm text-muted-foreground">
            Interact with your LangChain & LangGraph-powered automated manager.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Panel: Chat Console (8 columns on lg) */}
        <div className="lg:col-span-7 flex flex-col bg-card border border-border rounded-2xl shadow-sm h-[70vh]">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground block">Admin Copilot</span>
              <span className="text-[10px] text-green-500 font-bold uppercase flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                Online (Groq Model Active)
              </span>
            </div>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div key={idx} className={`flex gap-3 max-w-[85%] ${isAssistant ? '' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 
                    ${isAssistant ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                  >
                    {isAssistant ? <Bot className="h-4 w-4" /> : <span className="font-black text-xs">AD</span>}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-xs
                    ${isAssistant 
                      ? 'bg-muted/40 border border-border text-foreground' 
                      : 'bg-primary text-primary-foreground font-medium'}`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex gap-3 max-w-[85%] items-center text-muted-foreground text-xs font-semibold">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center animate-spin">
                  <Bot className="h-4 w-4 animate-bounce" />
                </div>
                <span>Agent is thinking & executing tools...</span>
              </div>
            )}
            
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-border flex gap-2">
            <input
              type="text"
              placeholder="e.g. Create a 20% discount coupon named SAVE20..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-border bg-background rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-5 rounded-xl text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

        {/* Right Panel: Scheduled Tasks Dashboard (5 columns on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Scheduled Tasks List Card */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col h-[40vh]">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-3 shrink-0">
              <h3 className="font-black text-sm text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Scheduled / Executed Tasks
              </h3>
              <button
                onClick={loadTasks}
                disabled={tasksLoading}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                title="Refresh tasks"
              >
                <RefreshCw className={`h-4 w-4 ${tasksLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
              {tasksLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-6 gap-2">
                  <Clock className="h-8 w-8 opacity-20" />
                  <span>No scheduled tasks yet. Tell the agent to schedule one!</span>
                </div>
              ) : (
                tasks.map(task => {
                  let StatusIcon = Clock;
                  let statusColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';
                  if (task.status === 'completed') {
                    StatusIcon = CheckCircle2;
                    statusColor = 'text-green-500 bg-green-500/10 border-green-500/20';
                  } else if (task.status === 'failed') {
                    StatusIcon = XCircle;
                    statusColor = 'text-red-500 bg-red-500/10 border-red-500/20';
                  }

                  return (
                    <div key={task._id} className="border border-border bg-muted/10 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-foreground block truncate max-w-[70%]">{task.name}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border flex items-center gap-1 ${statusColor}`}>
                          <StatusIcon className="h-3 w-3" />
                          {task.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic font-medium leading-relaxed">&ldquo;{task.prompt}&rdquo;</p>
                      
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1.5 border-t border-border/50">
                        <span className="flex items-center gap-1 font-semibold">
                          <Calendar className="h-3 w-3" />
                          Run: {new Date(task.executeAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {task.intervalDays && (
                          <span className="font-bold text-primary">Every {task.intervalDays}d</span>
                        )}
                      </div>

                      {task.logs && (
                        <div className="mt-2 text-[9px] font-semibold font-mono bg-muted/50 p-2 rounded border border-border/30 text-foreground break-all whitespace-pre-wrap">
                          Log: {task.logs}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cron Simulation Card */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-black text-sm text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Play className="h-4 w-4 text-primary" />
              Cron Job / Simulation Panel
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In production, the background task runner is triggered automatically via Vercel Cron. In development, click the button below to manually run all pending/due tasks.
            </p>
            <button
              onClick={handleRunTasks}
              disabled={runningTasks}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/10 transition-colors disabled:opacity-50"
            >
              {runningTasks ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Running Tasks...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Run Pending Tasks Now</span>
                </>
              )}
            </button>

            {taskLogs.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Execution Logs</span>
                <div className="bg-black text-green-400 p-3 rounded-xl text-[10px] font-mono h-32 overflow-y-auto border border-border space-y-1 shadow-inner">
                  {taskLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
