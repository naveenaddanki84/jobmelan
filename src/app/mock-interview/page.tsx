'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useConnectionState,
  useRoomContext,
  ControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { RoomEvent, ConnectionState } from 'livekit-client';
import { Button } from '@/components/Button';
import { Navbar } from '@/components/Navbar';
import { Mic, MicOff, Phone, X } from 'lucide-react';
import { getJobApplications } from '@/actions/job-actions';
import { JobApplication } from '@/types';

type SessionResponse = {
  sessionId: string;
  roomName: string;
  stage: string;
  token: string;
  url: string;
  identity: string;
};

type TranscriptLine = {
  id: string;
  role: 'user' | 'ai' | 'system';
  text: string;
  stage?: string;
};

function RoomSetup({ onDataReceived }: { onDataReceived: (payload: Uint8Array) => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  React.useEffect(() => {
    if (!room) return;

    console.log('Room setup - room name:', room.name);

    // Set up data handler
    const handleData = (payload: Uint8Array) => {
      onDataReceived(payload);
    };

    room.on(RoomEvent.DataReceived, handleData);

    // Enable microphone by default
    const enableMic = async () => {
      try {
        if (localParticipant) {
          await localParticipant.setMicrophoneEnabled(true);
          console.log('Microphone enabled');
        }
      } catch (error) {
        console.error('Failed to enable microphone:', error);
      }
    };

    enableMic();

    // Handle connection errors
    const handleDisconnected = (reason?: string) => {
      console.log('Room disconnected:', reason);
    };

    const handleReconnecting = () => {
      console.log('Reconnecting to room...');
    };

    const handleReconnected = () => {
      console.log('Reconnected to room');
    };

    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
    };
  }, [room, localParticipant, onDataReceived]);

  return null;
}

function InterviewControls({ onEndInterview }: { onEndInterview: () => void }) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const connectionState = useConnectionState();
  const room = useRoomContext();

  const toggleMic = () => {
    localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  const handleEndInterview = async () => {
    if (room) {
      await room.disconnect();
    }
    onEndInterview();
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg animate-pulse">
        <Mic className="w-12 h-12 text-white" />
      </div>
      
      <div className="text-center">
        <p className="text-lg font-semibold text-stone-800">
          {connectionState === ConnectionState.Connected
            ? 'Interview in progress'
            : connectionState === ConnectionState.Connecting
            ? 'Connecting...'
            : 'Disconnected'}
        </p>
        <p className="text-sm text-stone-500 mt-1">
          {isMicrophoneEnabled ? 'Your microphone is on' : 'Your microphone is muted'}
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={toggleMic}
          className={`p-4 rounded-full transition-colors ${
            isMicrophoneEnabled
              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              : 'bg-red-100 hover:bg-red-200 text-red-600'
          }`}
          title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicrophoneEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button
          onClick={handleEndInterview}
          className="p-4 rounded-full bg-red-100 hover:bg-red-200 text-red-600 transition-colors"
          title="End interview"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

export default function MockInterviewPage() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [stage, setStage] = useState<string>('selfIntro');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const transcriptEndRef = React.useRef<HTMLDivElement>(null);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [pastedJobDescription, setPastedJobDescription] = useState<string>('');
  const [loadingJobs, setLoadingJobs] = useState(true);

  const persistEvents = useCallback(
    async (events: Omit<TranscriptLine, 'id'>[]) => {
      if (!session?.sessionId || events.length === 0) return;
      try {
        await fetch('/api/mock-interview/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            events: events.map((e) => ({
              stage: e.stage ?? stage,
              role: e.role,
              text: e.text,
              isFinal: true,
            })),
          }),
        });
      } catch {
        // best effort only
      }
    },
    [session?.sessionId, stage],
  );

  const handleData = useCallback(
    (payload: Uint8Array) => {
      try {
        const text = new TextDecoder().decode(payload);
        const parsed = JSON.parse(text);

        if (parsed?.type === 'stage') {
          const nextStage = parsed.stage ?? stage;
          setStage(nextStage);
          persistEvents([
            {
              role: 'system',
              text: `stage:${stage}->${nextStage}`,
              stage: nextStage,
            },
          ]);
        }

        if (parsed?.type === 'transcript' && parsed.text) {
          const entry: TranscriptLine = {
            id: crypto.randomUUID(),
            role: parsed.role === 'ai' || parsed.role === 'user' ? parsed.role : 'system',
            text: parsed.text,
            stage: parsed.stage,
          };
          setTranscript((prev) => [
            ...prev,
            entry,
          ]);
          persistEvents([entry]);
        }
      } catch {
        // Ignore malformed data packets
      }
    },
    [persistEvents, stage],
  );

  // Load job applications on mount
  React.useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      try {
        const jobs = await getJobApplications();
        setJobApplications(jobs);
      } catch (err) {
        console.error('Failed to load job applications:', err);
      } finally {
        setLoadingJobs(false);
      }
    };
    loadJobs();
  }, []);

  const startSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mock-interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobApplicationId: selectedJobId || undefined,
          jobDescription: pastedJobDescription.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to start session');
      }

      setSession(data);
      setStage(data.stage || 'selfIntro');
    } catch (err: any) {
      setError(err?.message || 'Unable to start mock interview');
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  const onConnected = useCallback(() => {
    setConnected(true);
    console.log('Connected to room');
  }, []);

  const onDisconnected = useCallback(() => {
    setConnected(false);
    setSession(null);
    setTranscript([]);
    setStage('selfIntro');
  }, []);

  const handleEndInterview = useCallback(() => {
    setSession(null);
    setConnected(false);
    setTranscript([]);
    setStage('selfIntro');
  }, []);

  // Auto-scroll transcript to bottom when new messages arrive
  React.useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const stageLabel = useMemo(() => {
    if (stage === 'pastExperience') return 'Past Experience';
    return 'Self Introduction';
  }, [stage]);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-semibold tracking-wide text-brand-600">
              AI Mock Interview
            </p>
            <h1 className="text-2xl font-bold text-stone-900 mt-1">
              Live voice/video mock interview
            </h1>
            <p className="text-sm text-stone-500">
              Two-stage flow: self-introduction, then past experience. Stage switching is automatic
              with time-based fallbacks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl border border-stone-200 bg-white shadow-sm text-xs font-semibold text-stone-600">
              Stage: <span className="text-brand-700">{stageLabel}</span>
            </div>
            {!session && (
              <Button onClick={startSession} disabled={loading}>
                {loading ? 'Preparing...' : 'Start Mock Interview'}
              </Button>
            )}
            {session && (
              <>
                <div className="text-xs px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                  {connected ? 'Connected' : 'Connecting...'}
                </div>
                <Button
                  onClick={handleEndInterview}
                  variant="danger"
                >
                  End Interview
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {session ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl shadow-sm p-4 space-y-4">
              <LiveKitRoom
                token={session.token}
                serverUrl={session.url}
                connect
                audio
                video={false}
                options={{
                  adaptiveStream: true,
                  dynacast: true,
                  publishDefaults: {
                    videoSimulcastLayers: [],
                    audioPreset: {
                      maxBitrate: 16000,
                    },
                  },
                }}
                onConnected={onConnected}
                onDisconnected={onDisconnected}
                className="space-y-4"
              >
                <RoomSetup onDataReceived={handleData} />
                <InterviewControls onEndInterview={handleEndInterview} />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-4 flex flex-col h-[600px]">
              <h3 className="text-sm font-semibold text-stone-800 mb-3">Transcript</h3>
              <div className="flex-1 overflow-y-auto space-y-3 text-sm custom-scrollbar pr-2">
                {transcript.length === 0 && (
                  <p className="text-stone-400">Live transcript will appear here.</p>
                )}
                {transcript.map((line) => (
                  <div key={line.id} className="p-2 rounded-lg bg-stone-50 border border-stone-100">
                    <div className="text-[11px] uppercase tracking-wide font-semibold text-stone-400 mb-1">
                      {line.role} {line.stage ? `· ${line.stage}` : ''}
                    </div>
                    <p className="text-stone-700 leading-snug">{line.text}</p>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
              <div className="text-center text-stone-500 mb-4">
                <p className="text-sm font-medium">Personalize your interview (optional)</p>
                <p className="text-xs mt-1 text-stone-400">Paste a job description or select from saved jobs</p>
              </div>
              
              <div className="space-y-4">
                {/* Paste JD Option */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-stone-700">
                    Paste Job Description:
                  </label>
                  <textarea
                    value={pastedJobDescription}
                    onChange={(e) => {
                      setPastedJobDescription(e.target.value);
                      if (e.target.value.trim()) {
                        setSelectedJobId(''); // Clear selected job if pasting JD
                      }
                    }}
                    placeholder="Paste the job description here to personalize the interview questions..."
                    className="w-full px-4 py-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white resize-none"
                    rows={6}
                  />
                  {pastedJobDescription.trim() && (
                    <div className="flex items-center justify-between p-2 bg-brand-50 border border-brand-200 rounded">
                      <p className="text-xs text-brand-700">
                        ✓ Job description ready ({pastedJobDescription.trim().length} characters)
                      </p>
                      <button
                        onClick={() => setPastedJobDescription('')}
                        className="text-xs text-brand-600 hover:text-brand-700 underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-stone-200"></div>
                  <span className="text-xs text-stone-400">OR</span>
                  <div className="flex-1 border-t border-stone-200"></div>
                </div>

                {/* Select from Saved Jobs */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-stone-700">
                    Select from saved jobs:
                  </label>
                  
                  {loadingJobs ? (
                    <div className="px-4 py-3 border border-stone-300 rounded-lg text-sm text-stone-500 bg-stone-50">
                      Loading saved jobs...
                    </div>
                  ) : jobApplications.length > 0 ? (
                    <>
                      <select
                        value={selectedJobId}
                        onChange={(e) => {
                          setSelectedJobId(e.target.value);
                          if (e.target.value) {
                            setPastedJobDescription(''); // Clear pasted JD if selecting job
                          }
                        }}
                        className="w-full px-4 py-3 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                      >
                        <option value="">No specific job (general practice interview)</option>
                        {jobApplications.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.position} at {job.company}
                            {job.jobDescription ? ' (has JD)' : ''}
                          </option>
                        ))}
                      </select>
                      
                      {selectedJobId && (
                        <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-brand-700 mb-1">Selected Job:</p>
                              <p className="text-sm font-medium text-brand-900">
                                {jobApplications.find(j => j.id === selectedJobId)?.position} at{' '}
                                {jobApplications.find(j => j.id === selectedJobId)?.company}
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedJobId('')}
                              className="text-xs text-brand-600 hover:text-brand-700 underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-3 border border-stone-200 rounded-lg text-sm text-stone-500 bg-stone-50">
                      <p className="mb-1">No saved jobs found</p>
                      <p className="text-xs text-stone-400">
                        Add jobs in the <a href="/tracker" className="text-brand-600 hover:underline">Tracker</a> to use this option
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-dashed border-stone-200 rounded-2xl p-10 text-center text-stone-500">
              <p className="text-sm mb-2">Ready to start?</p>
              <p className="text-xs text-stone-400">Click "Start Mock Interview" above to begin</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

