import { defineAgent, AutoSubscribe, JobContext, voice } from '@livekit/agents';
import { TrackSource } from '@livekit/protocol';

const { Agent: VoiceAgent, AgentSession, AgentSessionEventTypes } = voice;

type Stage = 'selfIntro' | 'pastExperience';

type OrchestratorState = {
  stage: Stage;
  stageStart: number;
  stageDeadline: number;
  lastUserActivity: number;
  nudged: boolean;
  isTransitioning: boolean;
  isShuttingDown: boolean;
  interviewStartTime: number;
  pastExperienceResponseCount: number;
};

// Agent identity
const AGENT_NAME = 'Alex';
const AGENT_TITLE = 'Senior Interviewer';

const MAX_STAGE_DURATION: Record<Stage, number> = {
  selfIntro: 240_000, // 4 minutes
  pastExperience: 420_000, // 7 minutes
};

const MAX_TOTAL_INTERVIEW_DURATION = 900_000; // 15 minutes total
const SILENCE_TIMEOUT = 30_000; // 30s idle before nudge/transition (increased to allow user to complete statements)
const TRANSITION_DELAY = 15_000; // Wait 15s after user input before transitioning (allows for pauses and completion)
const SESSION_INIT_DELAY = 2000; // Wait 2s for session to fully initialize
const MIN_INTRO_LENGTH = 50; // Minimum characters for a complete introduction
const MIN_INTRO_SENTENCES = 2; // Minimum number of sentences for a complete intro
const MIN_PAST_EXPERIENCE_RESPONSES = 2; // Minimum number of responses in past experience stage before ending

const SELF_INTRO_OPENING = `Hi! I'm ${AGENT_NAME}, your ${AGENT_TITLE}. I'm here to help you practice for your upcoming interviews. Please give me a concise self-introduction and tell me what you're looking for next.`;
const PAST_EXPERIENCE_BRIDGE = `Thank you for that introduction. I'm ${AGENT_NAME}, and I appreciate you sharing that with me. Now, let's move on to discussing your past experience. I'd like to hear about a recent project you worked on and your role in it.`;
const INTERVIEW_COMPLETION_MESSAGE = `Thank you for the practice session. This is ${AGENT_NAME} signing off. Best of luck with your interviews!`;

function broadcastStage(room: any, stage: Stage) {
  try {
    if (room?.localParticipant) {
      room.localParticipant.publishData(
        Buffer.from(JSON.stringify({ type: 'stage', stage })),
        { reliable: true },
      );
    }
  } catch (err) {
    console.error('Failed to broadcast stage', err);
  }
}

function broadcastTranscript(room: any, payload: object) {
  try {
    if (room?.localParticipant) {
      room.localParticipant.publishData(
        Buffer.from(JSON.stringify({ type: 'transcript', ...payload })),
        { reliable: false },
      );
    }
  } catch (err) {
    console.error('Failed to broadcast transcript', err);
  }
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    // Extract metadata from job context
    let profileData: any = null;
    let jobDescription: string | null = null;
    
    try {
      const metadata = ctx.job?.metadata ? JSON.parse(ctx.job.metadata) : {};
      profileData = metadata.profile || null;
      jobDescription = metadata.jobDescription || null;
      console.log('Profile data loaded:', profileData ? 'Yes' : 'No');
      console.log('Job description loaded:', jobDescription ? 'Yes' : 'No');
    } catch (err) {
      console.error('Failed to parse metadata:', err);
    }

    // Use model strings directly - LiveKit handles the inference
    const sttModel = 'deepgram';
    const llmModel = 'google/gemini-2.0-flash-lite';
    const ttsModel = 'elevenlabs';

    // Build personalized instructions based on profile data
    function buildSelfIntroInstructions(): string {
      let base = `You are ${AGENT_NAME}, a ${AGENT_TITLE} conducting a professional mock interview. Your role is to help the candidate practice their self-introduction.

Your identity: You are ${AGENT_NAME}, a ${AGENT_TITLE}. Use your name naturally throughout the conversation.

Goals:
- Start with a warm, brief greeting${profileData?.name ? ` (their name is ${profileData.name})` : ''}
- Introduce yourself as ${AGENT_NAME}
- Ask them to give a concise self-introduction covering: who they are, their background, and what they're looking for next

IMPORTANT - Introduction Guidelines:
- WAIT for the user to COMPLETE their statement before responding - don't rush or interrupt
- Be patient and let them finish speaking, even if there are pauses
- A good introduction should include: their name/identity, their background/experience, and what they're looking for next
- If their response is very brief (less than 30 characters or just greetings), ask ONE simple follow-up question like "Could you tell me a bit more about your background?"
- After asking ONE follow-up, be patient and wait - don't keep asking more questions
- If they refuse or say "I don't want to tell", acknowledge it briefly and encourage them once, then wait patiently
- Only transition to the next stage when you have received a COMPLETE introduction (at least 50+ characters with multiple sentences covering background and goals)
- When you have enough information, give a brief positive acknowledgement like "Thank you for that introduction" or "Great, thanks for sharing that" before transitioning
- Keep responses conversational, encouraging, and BRIEF - don't over-explain
- Do NOT transition if the introduction is incomplete or just fragments
- MOST IMPORTANTLY: Wait for the user to finish speaking before responding - be patient`;

      if (profileData?.summary) {
        base += `\n\nNote: You have access to their profile summary, but let them speak naturally. Only reference it if they ask for help or seem stuck.`;
      }

      return base;
    }

    function buildPastExperienceInstructions(): string {
      let base = `You are ${AGENT_NAME}, a ${AGENT_TITLE} asking about past work experience and projects. Your goal is to help them practice answering behavioral and technical questions.

Your identity: You are ${AGENT_NAME}, a ${AGENT_TITLE}. Use your name naturally throughout the conversation.

Guidelines:
- Ask 2-4 specific questions about their past roles, projects, or achievements
- Use the STAR method (Situation, Task, Action, Result) framework when appropriate
- Keep each question concise and focused
- Ask follow-up questions if their answers are too brief
- Be encouraging and professional
- Do NOT return to self-introduction topics
- After 2-3 good responses, naturally conclude the interview by thanking them and signing off as ${AGENT_NAME}`;

      if (profileData?.experience && profileData.experience.length > 0) {
        const recentExp = profileData.experience.slice(0, 2);
        base += `\n\nTheir recent experience includes:\n`;
        recentExp.forEach((exp: any, idx: number) => {
          base += `${idx + 1}. ${exp.position} at ${exp.company}${exp.highlights?.length ? ` - Key points: ${exp.highlights.slice(0, 2).join(', ')}` : ''}\n`;
        });
        base += `\nReference these naturally in your questions, but let them elaborate. Don't just read back their resume.`;
      }

      if (profileData?.projects && profileData.projects.length > 0) {
        base += `\n\nThey have projects: ${profileData.projects.map((p: any) => p.name).join(', ')}. You can ask about these if relevant.`;
      }

      if (jobDescription) {
        base += `\n\nJob Description Context: ${jobDescription.substring(0, 500)}...\n\nTailor your questions to assess fit for this role, but keep questions general enough for practice.`;
      }

      return base;
    }

    function buildAgent(id: string, instructions: string) {
      return new VoiceAgent({
        id,
        instructions,
        stt: sttModel,
        llm: llmModel,
        tts: ttsModel,
        allowInterruptions: false,
        turnDetection: 'stt',
      });
    }

    const SelfIntroAgent = buildAgent('selfIntro', buildSelfIntroInstructions());
    const PastExperienceAgent = buildAgent('pastExperience', buildPastExperienceInstructions());

    class StageOrchestrator {
      private session: typeof AgentSession.prototype;
      private ctx: JobContext;
      private state: OrchestratorState;
      private silenceTimer?: NodeJS.Timeout;
      private stageTimer?: NodeJS.Timeout;
      private transitionTimer?: NodeJS.Timeout;
      private roomDisconnectHandler?: () => void;
      private participantDisconnectHandler?: () => void;
      private lastAISpeechText: string = '';
      private userTurnCount: number = 0;
      private hasTransitioned: boolean = false;
      private profileData: any;
      private userInputBuffer: string = ''; // Track accumulated user input
      private lastUserInputTime: number = 0;
      private interviewDurationTimer?: NodeJS.Timeout;
      private followUpAsked: boolean = false; // Track if we've asked a follow-up question
      private agentIsSpeaking: boolean = false; // Track if agent is currently speaking

      constructor(session: typeof AgentSession.prototype, ctx: JobContext, profileData: any) {
        this.session = session;
        this.ctx = ctx;
        this.profileData = profileData;
        const now = Date.now();
        this.state = {
          stage: 'selfIntro',
          stageStart: now,
          stageDeadline: now + MAX_STAGE_DURATION.selfIntro,
          lastUserActivity: now,
          nudged: false,
          isTransitioning: false,
          isShuttingDown: false,
          interviewStartTime: now,
          pastExperienceResponseCount: 0,
        };
        this.userTurnCount = 0;
        this.hasTransitioned = false;
        this.lastAISpeechText = '';
      }

      async start() {
        try {
          // Attach listeners before starting session
          this.attachListeners();
          this.attachRoomListeners();

          await this.session.start({
            agent: SelfIntroAgent,
            room: this.ctx.room,
          });

          broadcastStage(this.ctx.room, this.state.stage);
          
          // Wait for session to fully initialize before speaking
          await new Promise(resolve => setTimeout(resolve, SESSION_INIT_DELAY));
          
          if (!this.state.isShuttingDown) {
            console.log('Agent speaking opening prompt...');
            // Use personalized greeting if we have name
            const greeting = this.profileData?.name 
              ? `Hi ${this.profileData.name}! I'm ${AGENT_NAME}, your ${AGENT_TITLE}. I'm here to help you practice for your upcoming interviews. Please give me a concise self-introduction and tell me what you're looking for next.`
              : SELF_INTRO_OPENING;
            
            // Broadcast the opening message before speaking
            broadcastTranscript(this.ctx.room, {
              role: 'ai',
              text: greeting,
              stage: this.state.stage,
            });
            this.lastAISpeechText = greeting;
            this.agentIsSpeaking = true;
            await this.session.say(greeting, { addToChatCtx: true });
            // Wait a bit for speech to complete
            setTimeout(() => {
              this.agentIsSpeaking = false;
            }, 3000);
          }
          
          this.resetTimers();
          this.startInterviewDurationTimer();
        } catch (error) {
          console.error('Failed to start orchestrator:', error);
          throw error;
        }
      }

      private attachRoomListeners() {
        // Handle room disconnect - use room's disconnect event
        this.roomDisconnectHandler = () => {
          console.log('Room disconnected, cleaning up...');
          this.cleanup();
        };
        this.ctx.room.on('disconnected', this.roomDisconnectHandler);

        // Handle participant disconnect (user left)
        this.participantDisconnectHandler = () => {
          const participants = Array.from(this.ctx.room.remoteParticipants.values());
          if (participants.length === 0) {
            console.log('All participants disconnected, shutting down...');
            this.cleanup();
          }
        };
        this.ctx.room.on('participantDisconnected', this.participantDisconnectHandler);
      }

      private attachListeners() {
        this.session.on(AgentSessionEventTypes.UserInputTranscribed, (ev: any) => {
          if (this.state.isShuttingDown) return;
          
          // Handle different event structures - based on logs, it's ev.transcript
          const text = ev.transcript || ev.text || ev.message || '';
          
          // Skip empty transcripts
          if (!text || text.trim() === '') {
            return; // Don't log empty transcripts, just skip them
          }
          
          console.log('User input transcribed:', text);
          
          // Only log full event for debugging non-empty transcripts
          if (text && text !== '[object Object]') {
            console.log('Full event:', JSON.stringify(ev, null, 2));
          }
          
          this.state.lastUserActivity = Date.now();
          this.state.nudged = false; // Reset nudge flag on user activity
          this.userTurnCount++;
          this.lastUserInputTime = Date.now();
          
          // Check if this is substantial positive content (after potential negative responses)
          const isSubstantialPositiveContent = text.length > 20 && 
            text.toLowerCase().match(/\b(background|experience|work|studied|degree|graduate|student|engineer|developer|designer|manager|worked|job|role|position|masters|bachelor|university|college|project|projects|worked on|looking|want|interested|seeking|goal|next|future|opportunity|career|hoping|aspiring|preparing|support|different)\b/i);
          
          // If user provides substantial positive content, reset buffer to focus on recent positive input
          // This prevents old negative responses from blocking transition
          if (isSubstantialPositiveContent && this.userInputBuffer.toLowerCase().match(/\b(don't want|won't|can't|refuse|not telling|no more|move on)\b/i)) {
            console.log('User provided substantial positive content after negative response - resetting buffer focus');
            // Keep recent positive content, clear old negative responses
            this.userInputBuffer = text;
          } else {
            // Accumulate user input to detect complete responses
            // Add space if buffer exists, otherwise start fresh
            if (this.userInputBuffer && !this.userInputBuffer.endsWith(' ')) {
              this.userInputBuffer += ' ' + text;
            } else {
              this.userInputBuffer = text;
            }
          }
          
          broadcastTranscript(this.ctx.room, {
            role: 'user',
            text: text,
            stage: this.state.stage,
          });
          
          this.resetSilenceTimer();
          
          // Clear any existing transition timer - user is still speaking
          if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = undefined;
          }
          
          // Improved transition logic: Only transition after meaningful, complete user response
          // Wait for user to finish speaking (no input for a while) and ensure substantial content
          const accumulatedText = this.userInputBuffer.trim();
          
          // Check if introduction is complete
          const hasMinimumLength = accumulatedText.length >= MIN_INTRO_LENGTH;
          const sentenceCount = (accumulatedText.match(/[.!?]+/g) || []).length;
          const hasMultipleSentences = sentenceCount >= MIN_INTRO_SENTENCES;
          
          // Check for key introduction elements - look at RECENT content (last 200 chars) to avoid old negative responses
          const recentText = accumulatedText.length > 200 ? accumulatedText.substring(accumulatedText.length - 200) : accumulatedText;
          const hasBackground = recentText.toLowerCase().match(/\b(background|experience|work|studied|degree|graduate|student|engineer|developer|designer|manager|worked|job|role|position|masters|bachelor|university|college|project|projects|worked on)\b/i);
          const hasGoals = recentText.toLowerCase().match(/\b(looking|want|interested|seeking|goal|next|future|opportunity|career|hoping|aspiring|preparing|support|different)\b/i);
          
          // Filter out questions, fragments, and negative responses
          const isQuestion = accumulatedText.trim().endsWith('?');
          const isFragment = accumulatedText.split(/\s+/).length < 8; // Less than 8 words
          const isJustGreeting = accumulatedText.toLowerCase().match(/^(hi|hello|hey|okay|ok|i|k\.|that's)/i) && accumulatedText.length < 30;
          
          // Check for negative responses in RECENT content only (not old ones)
          const recentIsNegative = recentText.toLowerCase().match(/\b(don't want|won't|can't|refuse|not telling|no more|move on|nothing|nope|nah)\b/i) && 
            !recentText.toLowerCase().match(/\b(but|however|although|except)\b/i) &&
            !hasBackground && !hasGoals; // Only negative if no positive content
          
          // Introduction is complete if:
          // - Has minimum length AND multiple sentences
          // - Contains background/experience information OR goals/interests
          // - Not just a question or fragment
          // - Not a recent negative/refusal response (without positive content)
          // - Agent is not currently speaking (wait for agent to finish)
          const isCompleteIntroduction = hasMinimumLength && 
            hasMultipleSentences && 
            (hasBackground || hasGoals) &&
            !isQuestion &&
            !isFragment &&
            !isJustGreeting &&
            !recentIsNegative &&
            !this.agentIsSpeaking; // Don't transition while agent is speaking
          
          // Don't schedule transition while agent is speaking - wait for agent to finish
          // The transition will be checked after agent finishes speaking (in SpeechCreated handler)
          
          if (this.state.stage === 'selfIntro' && !isCompleteIntroduction && accumulatedText.length > 0) {
            // Introduction is incomplete - log for debugging
            const reason = recentIsNegative ? 'recent negative response' : 
                          !hasMinimumLength ? 'too short' :
                          !hasMultipleSentences ? 'not enough sentences' :
                          !hasBackground && !hasGoals ? 'missing key content' :
                          isQuestion ? 'is a question' :
                          isFragment ? 'is fragment' : 'unknown';
            console.log(`Incomplete introduction detected: "${accumulatedText.substring(0, 50)}..." - reason: ${reason}`);
          }
        });

        // Track LLM-generated responses by monitoring chat context
        // We'll capture responses that aren't from our explicit say() calls
        this.session.on(AgentSessionEventTypes.SpeechCreated, async (ev: any) => {
          if (this.state.isShuttingDown) return;
          
          const speechHandle = ev.speechHandle;
          if (speechHandle) {
            console.log('AI speech created event received');
            this.agentIsSpeaking = true; // Mark that agent is speaking
            
            // Track when AI finishes speaking to prevent premature transitions
            // Wait for speech to complete before allowing transitions
            if (speechHandle.doneFut && typeof speechHandle.doneFut.then === 'function') {
              speechHandle.doneFut.then(() => {
                // AI finished speaking - now safe to transition if needed
                console.log('AI speech completed');
                this.agentIsSpeaking = false;
                
                // After agent finishes speaking, check if we should transition
                // But only if we're in selfIntro and have a complete introduction
                // Wait longer to ensure user has finished speaking
                if (this.state.stage === 'selfIntro' && !this.hasTransitioned) {
                  setTimeout(() => {
                    this.checkAndTransitionIfReady();
                  }, 5000); // Wait 5 seconds after agent finishes speaking to allow user to complete
                }
              }).catch(() => {
                this.agentIsSpeaking = false;
              });
            } else {
              // Fallback: assume speech completes after a delay
              setTimeout(() => {
                this.agentIsSpeaking = false;
              }, 5000);
            }
            
            // Try to extract text from speech handle after a delay
            // This captures LLM-generated responses that aren't from our say() calls
            setTimeout(async () => {
              try {
                // Access the chat context to get the last assistant message
                const chatCtx = (this.session as any).chatCtx;
                if (chatCtx && Array.isArray(chatCtx.messages)) {
                  const lastMessage = chatCtx.messages[chatCtx.messages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    const text = lastMessage.content || lastMessage.text || '';
                    if (text && text.trim().length > 0 && text !== this.lastAISpeechText) {
                      // Check if this is a new LLM response (not our explicit say() calls)
                      const isExplicitCall = text.includes(SELF_INTRO_OPENING) || 
                                           text.includes(PAST_EXPERIENCE_BRIDGE) ||
                                           text.includes('Still there?');
                      
                      if (!isExplicitCall) {
                        console.log('Captured LLM response:', text.substring(0, 100));
                        this.lastAISpeechText = text;
                        broadcastTranscript(this.ctx.room, {
                          role: 'ai',
                          text: text,
                          stage: this.state.stage,
                        });
                      }
                    }
                  }
                }
              } catch (err) {
                // Ignore errors - this is best effort
              }
            }, 1500);
          }
        });

        this.session.on(AgentSessionEventTypes.Error, (ev: any) => {
          console.error('Session error:', ev);
          
          // Attempt to recover from non-fatal errors
          if (ev.error && typeof ev.error === 'object') {
            const errorMessage = ev.error.message || String(ev.error);
            
            // Don't shutdown for transient errors
            if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
              console.log('Transient error detected, continuing...');
              return;
            }
          }
          
          // For fatal errors, cleanup gracefully
          if (!this.state.isShuttingDown) {
            console.error('Fatal session error, shutting down gracefully...');
            this.cleanup();
          }
        });

        // Handle agent state changes
        this.session.on(AgentSessionEventTypes.AgentStateChanged, (ev: any) => {
          const state = ev.state || ev.status || ev;
          console.log('Agent state changed:', state);
          console.log('Full state event:', JSON.stringify(ev, null, 2));
        });
      }

      private clearTimers() {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = undefined;
        }
        if (this.stageTimer) {
          clearTimeout(this.stageTimer);
          this.stageTimer = undefined;
        }
        if (this.transitionTimer) {
          clearTimeout(this.transitionTimer);
          this.transitionTimer = undefined;
        }
        if (this.interviewDurationTimer) {
          clearTimeout(this.interviewDurationTimer);
          this.interviewDurationTimer = undefined;
        }
      }

      private startInterviewDurationTimer() {
        // Set timer for maximum interview duration
        this.interviewDurationTimer = setTimeout(() => {
          if (!this.state.isShuttingDown) {
            console.log('Maximum interview duration reached, ending session...');
            this.endInterview('time-limit');
          }
        }, MAX_TOTAL_INTERVIEW_DURATION);
      }

      private checkAndTransitionIfReady() {
        if (this.state.isShuttingDown || this.state.isTransitioning || this.hasTransitioned) {
          return;
        }

        if (this.state.stage !== 'selfIntro') {
          return;
        }

        const accumulatedText = this.userInputBuffer.trim();
        if (!accumulatedText || accumulatedText.length === 0) {
          return;
        }

        // Re-check if introduction is complete (same logic as before)
        const hasMinimumLength = accumulatedText.length >= MIN_INTRO_LENGTH;
        const sentenceCount = (accumulatedText.match(/[.!?]+/g) || []).length;
        const hasMultipleSentences = sentenceCount >= MIN_INTRO_SENTENCES;
        
        // Check RECENT content (last 200 chars) to avoid old negative responses
        const recentText = accumulatedText.length > 200 ? accumulatedText.substring(accumulatedText.length - 200) : accumulatedText;
        const hasBackground = recentText.toLowerCase().match(/\b(background|experience|work|studied|degree|graduate|student|engineer|developer|designer|manager|worked|job|role|position|masters|bachelor|university|college|project|projects|worked on)\b/i);
        const hasGoals = recentText.toLowerCase().match(/\b(looking|want|interested|seeking|goal|next|future|opportunity|career|hoping|aspiring|preparing|support|different)\b/i);
        const isQuestion = accumulatedText.trim().endsWith('?');
        const isFragment = accumulatedText.split(/\s+/).length < 8;
        const isJustGreeting = accumulatedText.toLowerCase().match(/^(hi|hello|hey|okay|ok|i|k\.|that's)/i) && accumulatedText.length < 30;
        const isNegativeResponse = recentText.toLowerCase().match(/\b(don't want|won't|can't|refuse|not telling|no more|move on|nothing|nope|nah)\b/i) && 
          !recentText.toLowerCase().match(/\b(but|however|although|except)\b/i) &&
          !hasBackground && !hasGoals; // Only negative if no positive content

        const isCompleteIntroduction = hasMinimumLength && 
          hasMultipleSentences && 
          (hasBackground || hasGoals) &&
          !isQuestion &&
          !isFragment &&
          !isJustGreeting &&
          !isNegativeResponse &&
          !this.agentIsSpeaking;

        if (isCompleteIntroduction) {
          const timeSinceLastInput = Date.now() - this.lastUserInputTime;
          const userStillSpeaking = timeSinceLastInput < 3000;

          if (!userStillSpeaking && !this.agentIsSpeaking) {
            console.log(`Transitioning after complete introduction and agent finished speaking. Accumulated text: "${accumulatedText.substring(0, 100)}..."`);
            this.transitionTo('pastExperience', 'user-turn-complete').catch(err => {
              console.error('Failed to transition:', err);
            });
          }
        }
      }

      private async checkInterviewCompletion() {
        if (this.state.isShuttingDown || this.state.isTransitioning) {
          return;
        }

        // Check if we're in past experience stage and have enough responses
        if (
          this.state.stage === 'pastExperience' &&
          this.state.pastExperienceResponseCount >= MIN_PAST_EXPERIENCE_RESPONSES
        ) {
          // Wait a bit to see if user wants to continue
          setTimeout(() => {
            if (
              !this.state.isShuttingDown &&
              this.state.stage === 'pastExperience' &&
              Date.now() - this.state.lastUserActivity > 5000 // 5 seconds of silence
            ) {
              console.log('Interview completion criteria met, ending session...');
              this.endInterview('completion');
            }
          }, 5000);
        }
      }

      private async endInterview(reason: 'completion' | 'time-limit') {
        if (this.state.isShuttingDown) {
          return;
        }

        console.log(`Ending interview: ${reason}`);
        this.state.isShuttingDown = true;
        this.clearTimers();

        try {
          // Send completion message
          const completionMessage = reason === 'completion'
            ? `Thank you for the practice session, ${this.profileData?.name || 'there'}. This is ${AGENT_NAME} signing off. You've covered the key areas we discussed. Best of luck with your interviews!`
            : `Thank you for the practice session. We've reached our time limit. This is ${AGENT_NAME} signing off. Best of luck with your interviews!`;

          broadcastTranscript(this.ctx.room, {
            role: 'ai',
            text: completionMessage,
            stage: this.state.stage,
          });

          await this.session.say(completionMessage, { addToChatCtx: true });

          // Wait for message to be spoken
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Disconnect from room
          await this.ctx.room.disconnect();
        } catch (error) {
          console.error('Error ending interview:', error);
          // Force disconnect even if there's an error
          try {
            await this.ctx.room.disconnect();
          } catch (err) {
            console.error('Error disconnecting room:', err);
          }
        }
      }

      private resetTimers() {
        this.resetSilenceTimer();
        const now = Date.now();
        const remaining = Math.max(5_000, this.state.stageDeadline - now);
        this.stageTimer = setTimeout(() => {
          this.transitionTo('pastExperience', 'stage-timeout');
        }, remaining);
      }

      private resetSilenceTimer() {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = undefined;
        }
        
        if (this.state.isShuttingDown || this.state.isTransitioning || this.hasTransitioned) {
          return;
        }
        
        this.silenceTimer = setTimeout(async () => {
          if (this.state.isShuttingDown || this.state.isTransitioning || this.hasTransitioned) {
            return;
          }
          
          if (this.state.nudged) {
            // Already nudged once, transition to next stage (only if in selfIntro)
            if (this.state.stage === 'selfIntro' && !this.hasTransitioned) {
              this.transitionTo('pastExperience', 'silence').catch(err => {
                console.error('Failed to transition on silence:', err);
              });
            }
          } else {
            // First silence, send a nudge (only if not transitioning)
            this.state.nudged = true;
            const nudgeText = `Still there? This is ${AGENT_NAME}. If you're ready, please continue speaking.`;
            // Broadcast nudge before speaking
            broadcastTranscript(this.ctx.room, {
              role: 'ai',
              text: nudgeText,
              stage: this.state.stage,
            });
            this.lastAISpeechText = nudgeText;
            this.agentIsSpeaking = true;
            try {
              await this.session.say(nudgeText, {
                addToChatCtx: false,
              });
              setTimeout(() => {
                this.agentIsSpeaking = false;
              }, 3000);
            } catch (err: any) {
              console.error('Failed to send nudge:', err);
              this.agentIsSpeaking = false;
            }
            this.resetSilenceTimer();
          }
        }, SILENCE_TIMEOUT);
      }

      private async transitionTo(next: Stage, reason: string) {
        // Prevent duplicate transitions
        if (this.state.stage === next || this.state.isTransitioning || this.state.isShuttingDown || this.hasTransitioned) {
          console.log(`Skipping transition to ${next}: stage=${this.state.stage}, isTransitioning=${this.state.isTransitioning}, hasTransitioned=${this.hasTransitioned}`);
          return;
        }

        console.log(`Starting transition: ${this.state.stage} -> ${next} (reason: ${reason})`);
        this.state.isTransitioning = true;
        this.hasTransitioned = true; // Prevent multiple transitions
        this.clearTimers(); // Clear all timers including transition timer

        try {
          // Wait a moment to ensure any ongoing speech completes and avoid interruptions
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Only bridge if transitioning from selfIntro to pastExperience
          if (this.state.stage === 'selfIntro' && next === 'pastExperience') {
            // Broadcast the bridge message before speaking
            broadcastTranscript(this.ctx.room, {
              role: 'ai',
              text: PAST_EXPERIENCE_BRIDGE,
              stage: next,
            });
            this.lastAISpeechText = PAST_EXPERIENCE_BRIDGE;
            this.agentIsSpeaking = true;
            await this.session.say(PAST_EXPERIENCE_BRIDGE, { addToChatCtx: true });
            
            // Wait for bridge message to complete before switching agent
            // This ensures smooth transition without overlapping speech
            await new Promise(resolve => setTimeout(resolve, 4000));
            this.agentIsSpeaking = false;
          }

          // Update state before agent switch
          this.state = {
            ...this.state,
            stage: next,
            stageStart: Date.now(),
            stageDeadline: Date.now() + MAX_STAGE_DURATION[next],
            lastUserActivity: Date.now(),
            nudged: false,
            isTransitioning: false,
            pastExperienceResponseCount: next === 'pastExperience' ? 0 : this.state.pastExperienceResponseCount,
          };

          broadcastStage(this.ctx.room, next);
          
          // Update agent - wait for it to complete
          await this.session.updateAgent(PastExperienceAgent);
          
          // Reset user turn count and input buffer for new stage
          this.userTurnCount = 0;
          this.userInputBuffer = '';
          this.lastUserInputTime = 0;
          this.followUpAsked = false;
          this.resetTimers();
          console.log(`Stage transition: ${next} (${reason})`);
        } catch (error) {
          console.error('Error during transition:', error);
          this.state.isTransitioning = false;
          // Reset timers even on error to prevent deadlock
          this.resetTimers();
          throw error;
        }
      }

      cleanup() {
        if (this.state.isShuttingDown) {
          return;
        }
        
        this.state.isShuttingDown = true;
        console.log('Cleaning up orchestrator...');
        
        this.clearTimers();
        
        // Remove room event listeners
        if (this.roomDisconnectHandler) {
          this.ctx.room.off('disconnected', this.roomDisconnectHandler);
        }
        if (this.participantDisconnectHandler) {
          this.ctx.room.off('participantDisconnected', this.participantDisconnectHandler);
        }
        
        // Stop session gracefully - session doesn't have stop(), it's managed by the framework
        // Just ensure cleanup is done
      }
    }

    // Connect to room first
    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);

    // Create session with proper configuration
    const session = new AgentSession({
      stt: sttModel,
      llm: llmModel,
      tts: ttsModel,
      turnDetection: 'stt',
      voiceOptions: {
        allowInterruptions: false,
        maxEndpointingDelay: 1500,
        minInterruptionDuration: 900,
      },
      userData: {},
    });

    const orchestrator = new StageOrchestrator(session, ctx, profileData);
    
    // Handle job cleanup on disconnect
    ctx.room.on('disconnected', () => {
      console.log('Room disconnected, cleaning up orchestrator...');
      orchestrator.cleanup();
    });

    // Start the orchestrator
    try {
      await orchestrator.start();
    } catch (error) {
      console.error('Failed to start orchestrator:', error);
      orchestrator.cleanup();
      throw error;
    }
  },
});
