import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  X,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ListTodo,
  ChevronRight,
  Loader2,
  ArrowRight,
  Edit3,
} from 'lucide-react';
import { SpeechHandler } from '../services/speechRecognition';
import { AudioRecorder } from '../services/audioRecorder';
import { parseSpokenTask, ParsedTaskResult } from '../services/dateParser';
import { TaskItem, TaskMilestone } from '../types';
import { SchedulingResult } from '../services/scheduler';

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  freeHoursSummary: string;
  onComputeSlot: (
    deadlineIso: string
  ) => SchedulingResult;
}

export const VoiceModal: React.FC<VoiceModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  freeHoursSummary,
  onComputeSlot,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed Result State
  const [analyzedData, setAnalyzedData] = useState<ParsedTaskResult | null>(null);
  const [computedSlot, setComputedSlot] = useState<SchedulingResult | null>(null);

  const speechHandlerRef = useRef<SpeechHandler | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    speechHandlerRef.current = new SpeechHandler();
    audioRecorderRef.current = new AudioRecorder();

    return () => {
      speechHandlerRef.current?.stop();
      audioRecorderRef.current?.cleanup();
    };
  }, []);

  // Reset and auto-focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setSpokenText('');
      setAnalyzedData(null);
      setComputedSlot(null);
      setErrorMsg(null);
      setIsListening(false);

      // Auto-start listening on open
      setTimeout(() => {
        handleToggleListening(true);
      }, 200);
    } else {
      handleStopListening();
    }
  }, [isOpen]);

  const handleToggleListening = (forceStart?: boolean) => {
    setErrorMsg(null);

    if (isListening && !forceStart) {
      handleStopListening();
      return;
    }

    if (!speechHandlerRef.current) {
      speechHandlerRef.current = new SpeechHandler();
    }

    const started = speechHandlerRef.current.start(
      (transcript, _isFinal) => {
        setSpokenText(transcript);
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      },
      (error) => {
        // Fallback gracefully without blocking manual typing
        setErrorMsg(error);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (started) {
      setIsListening(true);
    }
  };

  const handleStopListening = () => {
    speechHandlerRef.current?.stop();
    setIsListening(false);
  };

  const handleAnalyzeAndSchedule = async (customInput?: string) => {
    handleStopListening();
    const input = (customInput || spokenText).trim();

    if (!input) {
      setErrorMsg('Please speak or type your task first (e.g. "I have to submit my thesis paper on December 29th").');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. Try server Gemini analysis with our accurate client text
      let parsedResult: ParsedTaskResult | null = null;

      try {
        const res = await fetch('/api/gemini/analyze-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spokenText: input,
            userFreeHoursSummary: freeHoursSummary,
            currentDate: new Date().toISOString(),
          }),
        });

        if (res.ok) {
          const body = await res.json();
          if (body.data && body.data.title) {
            // Check if server deadline preserved user date; if not, enrich with dateParser
            const clientParsed = parseSpokenTask(input, freeHoursSummary);
            parsedResult = {
              title: body.data.title || clientParsed.title,
              description: body.data.description || clientParsed.description,
              deadline: clientParsed.deadline, // Ensure exact user date (e.g. Dec 29)
              deadlineFormatted: clientParsed.deadlineFormatted,
              isMajorTask: body.data.isMajorTask ?? clientParsed.isMajorTask,
              suggestedUrgency: body.data.suggestedUrgency || clientParsed.suggestedUrgency,
              milestones: (body.data.milestones && body.data.milestones.length > 0)
                ? body.data.milestones.map((m: any) => ({ title: typeof m === 'string' ? m : m.title }))
                : clientParsed.milestones,
              rationale: clientParsed.rationale,
            };
          }
        }
      } catch (e) {
        // Server unreachable or key issue, fallback to robust client dateParser
      }

      // 2. Direct client date & milestone parser
      if (!parsedResult) {
        parsedResult = parseSpokenTask(input, freeHoursSummary);
      }

      setAnalyzedData(parsedResult);

      // Compute first available non-overlapping free slot without time limit
      const slot = onComputeSlot(parsedResult.deadline);
      setComputedSlot(slot);
    } catch (err: any) {
      console.error('Error analyzing task:', err);
      // Failsafe guarantee
      const fallback = parseSpokenTask(input, freeHoursSummary);
      setAnalyzedData(fallback);
      const slot = onComputeSlot(fallback.deadline);
      setComputedSlot(slot);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTask = () => {
    if (!analyzedData || !computedSlot) return;

    const milestones: TaskMilestone[] = (analyzedData.milestones || []).map(
      (m, idx) => ({
        id: `ms-${Date.now()}-${idx}`,
        title: m.title,
        completed: false,
      })
    );

    onTaskCreated({
      title: analyzedData.title,
      description: analyzedData.description,
      deadline: analyzedData.deadline,
      actualDurationSeconds: 0,
      scheduledDate: computedSlot.scheduledDate,
      queueOrder: computedSlot.queueOrder || 1,
      scheduledStartTime: computedSlot.scheduledStartTime,
      scheduledEndTime: computedSlot.scheduledEndTime,
      status: 'pending',
      urgency: analyzedData.suggestedUrgency || 'medium',
      isMajorTask: analyzedData.isMajorTask,
      milestones,
    });

    onClose();
  };

  const samplePrompts = [
    'I have to submit my thesis paper on December 29th',
    'Finish client pitch deck by Thursday evening, about 2 hours',
    'Prepare tax spreadsheet by tomorrow night, takes 45 minutes',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 font-display">
              Voice Task Input & Scheduling
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {!analyzedData ? (
            <>
              {/* LIVE SPEECH-TO-TEXT TEXT FIELD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    Spoken Task (Live Transcription)
                  </label>
                  {isListening && (
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      LISTENING NOW...
                    </span>
                  )}
                </div>

                <div className="relative rounded-2xl border-2 transition-all overflow-hidden bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
                  <textarea
                    ref={textareaRef}
                    rows={4}
                    value={spokenText}
                    onChange={(e) => setSpokenText(e.target.value)}
                    placeholder="Speak or type your task, e.g.:&#10;“I have to submit my thesis paper on December 29th”&#10;“Build pitch deck by Thursday 9pm, will take 2 hours”"
                    className="w-full text-sm p-4 pr-16 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed"
                  />

                  {/* Embedded Floating Mic Button */}
                  <div className="absolute right-3 bottom-3">
                    <button
                      type="button"
                      onClick={() => handleToggleListening()}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-md ${
                        isListening
                          ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105 animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-indigo-600/20'
                      }`}
                      title={isListening ? 'Tap to pause microphone' : 'Tap to speak'}
                    >
                      {isListening ? (
                        <Mic className="w-5 h-5 animate-bounce" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Speak naturally with deadlines and durations.</span>
                  {spokenText && (
                    <button
                      onClick={() => setSpokenText('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Clear text
                    </button>
                  )}
                </div>
              </div>

              {/* Free-time schedule notice */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Your Free Hours: <strong>{freeHoursSummary}</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Zero Overlap Guaranteed
                </span>
              </div>

              {/* Quick sample prompts */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Try one-tap test phrases:
                </p>
                <div className="space-y-1.5">
                  {samplePrompts.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSpokenText(sample);
                        handleAnalyzeAndSchedule(sample);
                      }}
                      className="w-full text-left text-xs p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-between group"
                    >
                      <span className="truncate pr-2 font-medium">"{sample}"</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            /* ANALYZED TASK & MILESTONE BREAKDOWN VIEW */
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Task Title & Urgency */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                    {analyzedData.isMajorTask ? 'Major Project' : 'Standard Task'} ·{' '}
                    {analyzedData.suggestedUrgency} Priority
                  </span>
                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    No Time Limit
                  </span>
                </div>
                <input
                  type="text"
                  value={analyzedData.title}
                  onChange={(e) =>
                    setAnalyzedData({ ...analyzedData, title: e.target.value })
                  }
                  className="mt-1 w-full text-base font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {analyzedData.description}
                </p>
              </div>

              {/* Exact Deadline & Free-Time Slot Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    Target Deadline Recognized
                  </span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {analyzedData.deadlineFormatted}
                  </span>
                </div>

                {computedSlot && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] text-slate-400">Assigned Focus Window:</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                        {computedSlot.scheduledDate} · {computedSlot.scheduledStartTime} – {computedSlot.scheduledEndTime}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md">
                      Conflict-Free
                    </span>
                  </div>
                )}
              </div>

              {/* Milestones Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                    Divided Subtasks & Milestones ({analyzedData.milestones.length})
                  </h3>
                  <button
                    onClick={() => {
                      setAnalyzedData({
                        ...analyzedData,
                        milestones: [
                          ...analyzedData.milestones,
                          { title: 'New Subtask Milestone' },
                        ],
                      });
                    }}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Subtask
                  </button>
                </div>

                <div className="space-y-2">
                  {analyzedData.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const updated = [...analyzedData.milestones];
                          updated[idx].title = e.target.value;
                          setAnalyzedData({ ...analyzedData, milestones: updated });
                        }}
                        className="text-xs font-medium text-slate-900 dark:text-slate-100 flex-1 bg-transparent border-none focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const updated = analyzedData.milestones.filter(
                            (_, i) => i !== idx
                          );
                          setAnalyzedData({ ...analyzedData, milestones: updated });
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rationale */}
              {analyzedData.rationale && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  💡 {analyzedData.rationale}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
          {!analyzedData ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAnalyzeAndSchedule()}
                disabled={isProcessing || !spokenText.trim()}
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Task...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Schedule Task</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setAnalyzedData(null)}
                className="h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Edit Speech
              </button>
              <button
                type="button"
                onClick={handleConfirmTask}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Add to Schedule</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
