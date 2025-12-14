import { defineAgent, AutoSubscribe, voice } from "@livekit/agents";
const { Agent: VoiceAgent, AgentSession, AgentSessionEventTypes } = voice;
const AGENT_NAME = "Alex";
const AGENT_TITLE = "Senior Interviewer";
const MAX_STAGE_DURATION = {
  selfIntro: 24e4,
  // 4 minutes
  pastExperience: 42e4
  // 7 minutes
};
const MAX_TOTAL_INTERVIEW_DURATION = 9e5;
const SILENCE_TIMEOUT = 3e4;
const TRANSITION_DELAY = 15e3;
const SESSION_INIT_DELAY = 2e3;
const MIN_INTRO_LENGTH = 50;
const MIN_INTRO_SENTENCES = 2;
const MIN_PAST_EXPERIENCE_RESPONSES = 2;
const SELF_INTRO_OPENING = `Hi! I'm ${AGENT_NAME}, your ${AGENT_TITLE}. I'm here to help you practice for your upcoming interviews. Please give me a concise self-introduction and tell me what you're looking for next.`;
const PAST_EXPERIENCE_BRIDGE = `Thank you for that introduction. I'm ${AGENT_NAME}, and I appreciate you sharing that with me. Now, let's move on to discussing your past experience. I'd like to hear about a recent project you worked on and your role in it.`;
const INTERVIEW_COMPLETION_MESSAGE = `Thank you for the practice session. This is ${AGENT_NAME} signing off. Best of luck with your interviews!`;
function broadcastStage(room, stage) {
  try {
    if (room?.localParticipant) {
      room.localParticipant.publishData(
        Buffer.from(JSON.stringify({ type: "stage", stage })),
        { reliable: true }
      );
    }
  } catch (err) {
    console.error("Failed to broadcast stage", err);
  }
}
function broadcastTranscript(room, payload) {
  try {
    if (room?.localParticipant) {
      room.localParticipant.publishData(
        Buffer.from(JSON.stringify({ type: "transcript", ...payload })),
        { reliable: false }
      );
    }
  } catch (err) {
    console.error("Failed to broadcast transcript", err);
  }
}
var agent_default = defineAgent({
  entry: async (ctx) => {
    let profileData = null;
    let jobDescription = null;
    try {
      const metadata = ctx.job?.metadata ? JSON.parse(ctx.job.metadata) : {};
      profileData = metadata.profile || null;
      jobDescription = metadata.jobDescription || null;
      console.log("Profile data loaded:", profileData ? "Yes" : "No");
      console.log("Job description loaded:", jobDescription ? "Yes" : "No");
    } catch (err) {
      console.error("Failed to parse metadata:", err);
    }
    const sttModel = "deepgram";
    const llmModel = "google/gemini-2.0-flash-lite";
    const ttsModel = "elevenlabs";
    function buildSelfIntroInstructions() {
      let base = `You are ${AGENT_NAME}, a ${AGENT_TITLE} conducting a professional mock interview. Your role is to help the candidate practice their self-introduction.

Your identity: You are ${AGENT_NAME}, a ${AGENT_TITLE}. Use your name naturally throughout the conversation.

Goals:
- Start with a warm, brief greeting${profileData?.name ? ` (their name is ${profileData.name})` : ""}
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
        base += `

Note: You have access to their profile summary, but let them speak naturally. Only reference it if they ask for help or seem stuck.`;
      }
      return base;
    }
    function buildPastExperienceInstructions() {
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
        base += `

Their recent experience includes:
`;
        recentExp.forEach((exp, idx) => {
          base += `${idx + 1}. ${exp.position} at ${exp.company}${exp.highlights?.length ? ` - Key points: ${exp.highlights.slice(0, 2).join(", ")}` : ""}
`;
        });
        base += `
Reference these naturally in your questions, but let them elaborate. Don't just read back their resume.`;
      }
      if (profileData?.projects && profileData.projects.length > 0) {
        base += `

They have projects: ${profileData.projects.map((p) => p.name).join(", ")}. You can ask about these if relevant.`;
      }
      if (jobDescription) {
        base += `

Job Description Context: ${jobDescription.substring(0, 500)}...

Tailor your questions to assess fit for this role, but keep questions general enough for practice.`;
      }
      return base;
    }
    function buildAgent(id, instructions) {
      return new VoiceAgent({
        id,
        instructions,
        stt: sttModel,
        llm: llmModel,
        tts: ttsModel,
        allowInterruptions: false,
        turnDetection: "stt"
      });
    }
    const SelfIntroAgent = buildAgent("selfIntro", buildSelfIntroInstructions());
    const PastExperienceAgent = buildAgent("pastExperience", buildPastExperienceInstructions());
    class StageOrchestrator {
      // Track if agent is currently speaking
      constructor(session2, ctx2, profileData2) {
        this.lastAISpeechText = "";
        this.userTurnCount = 0;
        this.hasTransitioned = false;
        this.userInputBuffer = "";
        // Track accumulated user input
        this.lastUserInputTime = 0;
        this.followUpAsked = false;
        // Track if we've asked a follow-up question
        this.agentIsSpeaking = false;
        this.session = session2;
        this.ctx = ctx2;
        this.profileData = profileData2;
        const now = Date.now();
        this.state = {
          stage: "selfIntro",
          stageStart: now,
          stageDeadline: now + MAX_STAGE_DURATION.selfIntro,
          lastUserActivity: now,
          nudged: false,
          isTransitioning: false,
          isShuttingDown: false,
          interviewStartTime: now,
          pastExperienceResponseCount: 0
        };
        this.userTurnCount = 0;
        this.hasTransitioned = false;
        this.lastAISpeechText = "";
      }
      async start() {
        try {
          this.attachListeners();
          this.attachRoomListeners();
          await this.session.start({
            agent: SelfIntroAgent,
            room: this.ctx.room
          });
          broadcastStage(this.ctx.room, this.state.stage);
          await new Promise((resolve) => setTimeout(resolve, SESSION_INIT_DELAY));
          if (!this.state.isShuttingDown) {
            console.log("Agent speaking opening prompt...");
            const greeting = this.profileData?.name ? `Hi ${this.profileData.name}! I'm ${AGENT_NAME}, your ${AGENT_TITLE}. I'm here to help you practice for your upcoming interviews. Please give me a concise self-introduction and tell me what you're looking for next.` : SELF_INTRO_OPENING;
            broadcastTranscript(this.ctx.room, {
              role: "ai",
              text: greeting,
              stage: this.state.stage
            });
            this.lastAISpeechText = greeting;
            this.agentIsSpeaking = true;
            await this.session.say(greeting, { addToChatCtx: true });
            setTimeout(() => {
              this.agentIsSpeaking = false;
            }, 3e3);
          }
          this.resetTimers();
          this.startInterviewDurationTimer();
        } catch (error) {
          console.error("Failed to start orchestrator:", error);
          throw error;
        }
      }
      attachRoomListeners() {
        this.roomDisconnectHandler = () => {
          console.log("Room disconnected, cleaning up...");
          this.cleanup();
        };
        this.ctx.room.on("disconnected", this.roomDisconnectHandler);
        this.participantDisconnectHandler = () => {
          const participants = Array.from(this.ctx.room.remoteParticipants.values());
          if (participants.length === 0) {
            console.log("All participants disconnected, shutting down...");
            this.cleanup();
          }
        };
        this.ctx.room.on("participantDisconnected", this.participantDisconnectHandler);
      }
      attachListeners() {
        this.session.on(AgentSessionEventTypes.UserInputTranscribed, (ev) => {
          if (this.state.isShuttingDown) return;
          const text = ev.transcript || ev.text || ev.message || "";
          if (!text || text.trim() === "") {
            return;
          }
          console.log("User input transcribed:", text);
          if (text && text !== "[object Object]") {
            console.log("Full event:", JSON.stringify(ev, null, 2));
          }
          this.state.lastUserActivity = Date.now();
          this.state.nudged = false;
          this.userTurnCount++;
          this.lastUserInputTime = Date.now();
          const isSubstantialPositiveContent = text.length > 20 && text.toLowerCase().match(/\b(background|experience|work|studied|degree|graduate|student|engineer|developer|designer|manager|worked|job|role|position|masters|bachelor|university|college|project|projects|worked on|looking|want|interested|seeking|goal|next|future|opportunity|career|hoping|aspiring|preparing|support|different)\b/i);
          if (isSubstantialPositiveContent && this.userInputBuffer.toLowerCase().match(/\b(don't want|won't|can't|refuse|not telling|no more|move on)\b/i)) {
            console.log("User provided substantial positive content after negative response - resetting buffer focus");
            this.userInputBuffer = text;
          } else {
            if (this.userInputBuffer && !this.userInputBuffer.endsWith(" ")) {
              this.userInputBuffer += " " + text;
            } else {
              this.userInputBuffer = text;
            }
          }
          broadcastTranscript(this.ctx.room, {
            role: "user",
            text,
            stage: this.state.stage
          });
          this.resetSilenceTimer();
          if (this.transitionTimer) {
            clearTimeout(this.transitionTimer);
            this.transitionTimer = void 0;
          }
          const accumulatedText = this.userInputBuffer.trim();
          const hasMinimumLength = accumulatedText.length >= MIN_INTRO_LENGTH;
          const sentenceCount = (accumulatedText.match(/[.!?]+/g) || []).length;
          const hasMultipleSentences = sentenceCount >= MIN_INTRO_SENTENCES;
          const recentText = accumulatedText.length > 200 ? accumulatedText.substring(accumulatedText.length - 200) : accumulatedText;
          const hasBackground = recentText.toLowerCase().match(/\b(background|experience|work|studied|degree|graduate|student|engineer|developer|designer|manager|worked|job|role|position|masters|bachelor|university|college|project|projects|worked on)\b/i);
          const hasGoals = recentText.toLowerCase().match(/\b(looking|want|interested|seeking|goal|next|future|opportunity|career|hoping|aspiring|preparing|support|different)\b/i);
          const isQuestion = accumulatedText.trim().endsWith("?");
          const isFragment = accumulatedText.split(/\s+/).length < 8;
          const isJustGreeting = accumulatedText.toLowerCase().match(/^(hi|hello|hey|okay|ok|i|k\.|that's)/i) && accumulatedText.length < 30;
          const recentIsNegative = recentText.toLowerCase().match(/\b(don't want|won't|can't|refuse|not telling|no more|move on|nothing|nope|nah)\b/i) && !recentText.toLowerCase().match(/\b(but|however|although|except)\b/i) && !hasBackground && !hasGoals;
          const isCompleteIntroduction = hasMinimumLength && hasMultipleSentences && (hasBackground || hasGoals) && !isQuestion && !isFragment && !isJustGreeting && !recentIsNegative && !this.agentIsSpeaking;
          if (this.state.stage === "selfIntro" && !isCompleteIntroduction && accumulatedText.length > 0) {
            const reason = recentIsNegative ? "recent negative response" : !hasMinimumLength ? "too short" : !hasMultipleSentences ? "not enough sentences" : !hasBackground && !hasGoals ? "missing key content" : isQuestion ? "is a question" : isFragment ? "is fragment" : "unknown";
            console.log(`Incomplete introduction detected: "${accumulatedText.substring(0, 50)}..." - reason: ${reason}`);
          }
        });
        this.session.on(AgentSessionEventTypes.SpeechCreated, async (ev) => {
          if (this.state.isShuttingDown) return;
          const speechHandle = ev.speechHandle;
          if (speechHandle) {
            console.log("AI speech created event received");
            this.agentIsSpeaking = true;
            if (speechHandle.doneFut && typeof speechHandle.doneFut.then === "function") {
              speechHandle.doneFut.then(() => {
                console.log("AI speech completed");
                this.agentIsSpeaking = false;
                if (this.state.stage === "selfIntro" && !this.hasTransitioned) {
                  setTimeout(() => {
                    this.checkAndTransitionIfReady();
                  }, 5e3);
                }
              }).catch(() => {
                this.agentIsSpeaking = false;
              });
            } else {
              setTimeout(() => {
                this.agentIsSpeaking = false;
              }, 5e3);
            }
            setTimeout(async () => {
              try {
                const chatCtx = this.session.chatCtx;
                if (chatCtx && Array.isArray(chatCtx.messages)) {
                  const lastMessage = chatCtx.messages[chatCtx.messages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    const text = lastMessage.content || lastMessage.text || "";
                    if (text && text.trim().length > 0 && text !== this.lastAISpeechText) {
                      const isExplicitCall = text.includes(SELF_INTRO_OPENING) || text.includes(PAST_EXPERIENCE_BRIDGE) || text.includes("Still there?");
                      if (!isExplicitCall) {
                        console.log("Captured LLM response:", text.substring(0, 100));
                        this.lastAISpeechText = text;
                        broadcastTranscript(this.ctx.room, {
                          role: "ai",
                          text,
                          stage: this.state.stage
                        });
                      }
                    }
                  }
                }
              } catch (err) {
              }
            }, 1500);
          }
        });
        this.session.on(AgentSessionEventTypes.Error, (ev) => {
          console.error("Session error:", ev);
          if (ev.error && typeof ev.error === "object") {
            const errorMessage = ev.error.message || String(ev.error);
            if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
              console.log("Transient error detected, continuing...");
              return;
            }
          }
          if (!this.state.isShuttingDown) {
            console.error("Fatal session error, shutting down gracefully...");
            this.cleanup();
          }
        });
        this.session.on(AgentSessionEventTypes.AgentStateChanged, (ev) => {
          const state = ev.state || ev.status || ev;
          console.log("Agent state changed:", state);
          console.log("Full state event:", JSON.stringify(ev, null, 2));
        });
      }
      clearTimers() {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = void 0;
        }
        if (this.stageTimer) {
          clearTimeout(this.stageTimer);
          this.stageTimer = void 0;
        }
        if (this.transitionTimer) {
          clearTimeout(this.transitionTimer);
          this.transitionTimer = void 0;
        }
        if (this.interviewDurationTimer) {
          clearTimeout(this.interviewDurationTimer);
          this.interviewDurationTimer = void 0;
        }
      }
      startInterviewDurationTimer() {
        this.interviewDurationTimer = setTimeout(() => {
          if (!this.state.isShuttingDown) {
            console.log("Maximum interview duration reached, ending session...");
            this.endInterview("time-limit");
          }
        }, MAX_TOTAL_INTERVIEW_DURATION);
      }
      checkAndTransitionIfReady() {
        if (this.state.isShuttingDown || this.state.isTransitioning || this.hasTransitioned) {
          return;
        }
        if (this.state.stage !== "selfIntro") {
          return;
        }
        const accumulatedText = this.userInputBuffer.trim();
        if (!accumulatedText || accumulatedText.length === 0) {
          return;
        }
        const hasMinimumLength = accumulatedText.length >= MIN_INTRO_LENGTH;
        const sentenceCount = (accumulatedText.match(/[.!?]+/g) || []).length;
        const hasMultipleSentences = sentenceCount >= MIN_INTRO_SENTENCES;
        const recentText = accumulatedText.length > 200 ? accumulatedText.substring(accumulatedText.length - 200) : accumulatedText;
        const hasBackground = recentText.toLowerCase().match(/\b(background|experience|work|studied|degree|graduate|student|engineer|developer|designer|manager|worked|job|role|position|masters|bachelor|university|college|project|projects|worked on)\b/i);
        const hasGoals = recentText.toLowerCase().match(/\b(looking|want|interested|seeking|goal|next|future|opportunity|career|hoping|aspiring|preparing|support|different)\b/i);
        const isQuestion = accumulatedText.trim().endsWith("?");
        const isFragment = accumulatedText.split(/\s+/).length < 8;
        const isJustGreeting = accumulatedText.toLowerCase().match(/^(hi|hello|hey|okay|ok|i|k\.|that's)/i) && accumulatedText.length < 30;
        const isNegativeResponse = recentText.toLowerCase().match(/\b(don't want|won't|can't|refuse|not telling|no more|move on|nothing|nope|nah)\b/i) && !recentText.toLowerCase().match(/\b(but|however|although|except)\b/i) && !hasBackground && !hasGoals;
        const isCompleteIntroduction = hasMinimumLength && hasMultipleSentences && (hasBackground || hasGoals) && !isQuestion && !isFragment && !isJustGreeting && !isNegativeResponse && !this.agentIsSpeaking;
        if (isCompleteIntroduction) {
          const timeSinceLastInput = Date.now() - this.lastUserInputTime;
          const userStillSpeaking = timeSinceLastInput < 3e3;
          if (!userStillSpeaking && !this.agentIsSpeaking) {
            console.log(`Transitioning after complete introduction and agent finished speaking. Accumulated text: "${accumulatedText.substring(0, 100)}..."`);
            this.transitionTo("pastExperience", "user-turn-complete").catch((err) => {
              console.error("Failed to transition:", err);
            });
          }
        }
      }
      async checkInterviewCompletion() {
        if (this.state.isShuttingDown || this.state.isTransitioning) {
          return;
        }
        if (this.state.stage === "pastExperience" && this.state.pastExperienceResponseCount >= MIN_PAST_EXPERIENCE_RESPONSES) {
          setTimeout(() => {
            if (!this.state.isShuttingDown && this.state.stage === "pastExperience" && Date.now() - this.state.lastUserActivity > 5e3) {
              console.log("Interview completion criteria met, ending session...");
              this.endInterview("completion");
            }
          }, 5e3);
        }
      }
      async endInterview(reason) {
        if (this.state.isShuttingDown) {
          return;
        }
        console.log(`Ending interview: ${reason}`);
        this.state.isShuttingDown = true;
        this.clearTimers();
        try {
          const completionMessage = reason === "completion" ? `Thank you for the practice session, ${this.profileData?.name || "there"}. This is ${AGENT_NAME} signing off. You've covered the key areas we discussed. Best of luck with your interviews!` : `Thank you for the practice session. We've reached our time limit. This is ${AGENT_NAME} signing off. Best of luck with your interviews!`;
          broadcastTranscript(this.ctx.room, {
            role: "ai",
            text: completionMessage,
            stage: this.state.stage
          });
          await this.session.say(completionMessage, { addToChatCtx: true });
          await new Promise((resolve) => setTimeout(resolve, 3e3));
          await this.ctx.room.disconnect();
        } catch (error) {
          console.error("Error ending interview:", error);
          try {
            await this.ctx.room.disconnect();
          } catch (err) {
            console.error("Error disconnecting room:", err);
          }
        }
      }
      resetTimers() {
        this.resetSilenceTimer();
        const now = Date.now();
        const remaining = Math.max(5e3, this.state.stageDeadline - now);
        this.stageTimer = setTimeout(() => {
          this.transitionTo("pastExperience", "stage-timeout");
        }, remaining);
      }
      resetSilenceTimer() {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = void 0;
        }
        if (this.state.isShuttingDown || this.state.isTransitioning || this.hasTransitioned) {
          return;
        }
        this.silenceTimer = setTimeout(async () => {
          if (this.state.isShuttingDown || this.state.isTransitioning || this.hasTransitioned) {
            return;
          }
          if (this.state.nudged) {
            if (this.state.stage === "selfIntro" && !this.hasTransitioned) {
              this.transitionTo("pastExperience", "silence").catch((err) => {
                console.error("Failed to transition on silence:", err);
              });
            }
          } else {
            this.state.nudged = true;
            const nudgeText = `Still there? This is ${AGENT_NAME}. If you're ready, please continue speaking.`;
            broadcastTranscript(this.ctx.room, {
              role: "ai",
              text: nudgeText,
              stage: this.state.stage
            });
            this.lastAISpeechText = nudgeText;
            this.agentIsSpeaking = true;
            try {
              await this.session.say(nudgeText, {
                addToChatCtx: false
              });
              setTimeout(() => {
                this.agentIsSpeaking = false;
              }, 3e3);
            } catch (err) {
              console.error("Failed to send nudge:", err);
              this.agentIsSpeaking = false;
            }
            this.resetSilenceTimer();
          }
        }, SILENCE_TIMEOUT);
      }
      async transitionTo(next, reason) {
        if (this.state.stage === next || this.state.isTransitioning || this.state.isShuttingDown || this.hasTransitioned) {
          console.log(`Skipping transition to ${next}: stage=${this.state.stage}, isTransitioning=${this.state.isTransitioning}, hasTransitioned=${this.hasTransitioned}`);
          return;
        }
        console.log(`Starting transition: ${this.state.stage} -> ${next} (reason: ${reason})`);
        this.state.isTransitioning = true;
        this.hasTransitioned = true;
        this.clearTimers();
        try {
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          if (this.state.stage === "selfIntro" && next === "pastExperience") {
            broadcastTranscript(this.ctx.room, {
              role: "ai",
              text: PAST_EXPERIENCE_BRIDGE,
              stage: next
            });
            this.lastAISpeechText = PAST_EXPERIENCE_BRIDGE;
            this.agentIsSpeaking = true;
            await this.session.say(PAST_EXPERIENCE_BRIDGE, { addToChatCtx: true });
            await new Promise((resolve) => setTimeout(resolve, 4e3));
            this.agentIsSpeaking = false;
          }
          this.state = {
            ...this.state,
            stage: next,
            stageStart: Date.now(),
            stageDeadline: Date.now() + MAX_STAGE_DURATION[next],
            lastUserActivity: Date.now(),
            nudged: false,
            isTransitioning: false,
            pastExperienceResponseCount: next === "pastExperience" ? 0 : this.state.pastExperienceResponseCount
          };
          broadcastStage(this.ctx.room, next);
          await this.session.updateAgent(PastExperienceAgent);
          this.userTurnCount = 0;
          this.userInputBuffer = "";
          this.lastUserInputTime = 0;
          this.followUpAsked = false;
          this.resetTimers();
          console.log(`Stage transition: ${next} (${reason})`);
        } catch (error) {
          console.error("Error during transition:", error);
          this.state.isTransitioning = false;
          this.resetTimers();
          throw error;
        }
      }
      cleanup() {
        if (this.state.isShuttingDown) {
          return;
        }
        this.state.isShuttingDown = true;
        console.log("Cleaning up orchestrator...");
        this.clearTimers();
        if (this.roomDisconnectHandler) {
          this.ctx.room.off("disconnected", this.roomDisconnectHandler);
        }
        if (this.participantDisconnectHandler) {
          this.ctx.room.off("participantDisconnected", this.participantDisconnectHandler);
        }
      }
    }
    await ctx.connect(void 0, AutoSubscribe.AUDIO_ONLY);
    const session = new AgentSession({
      stt: sttModel,
      llm: llmModel,
      tts: ttsModel,
      turnDetection: "stt",
      voiceOptions: {
        allowInterruptions: false,
        maxEndpointingDelay: 1500,
        minInterruptionDuration: 900
      },
      userData: {}
    });
    const orchestrator = new StageOrchestrator(session, ctx, profileData);
    ctx.room.on("disconnected", () => {
      console.log("Room disconnected, cleaning up orchestrator...");
      orchestrator.cleanup();
    });
    try {
      await orchestrator.start();
    } catch (error) {
      console.error("Failed to start orchestrator:", error);
      orchestrator.cleanup();
      throw error;
    }
  }
});
export {
  agent_default as default
};
//# sourceMappingURL=agent.js.map
