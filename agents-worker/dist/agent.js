import { defineAgent, AutoSubscribe, voice, llm } from "@livekit/agents";
import * as google from "@livekit/agents-plugin-google";
const { Agent: VoiceAgent, AgentSession, AgentSessionEventTypes } = voice;
const AGENT_NAME = "Alex";
const SELF_INTRO_TURNS = 2;
const PAST_EXP_TURNS = 2;
const MIN_WORDS_FOR_COMPLETE_RESPONSE = 20;
const SILENCE_TIMEOUT_MS = {
  selfIntro: 3e3,
  // 3 seconds for self-intro (conversational)
  pastExperience: 5e3,
  // 5 seconds for past experience (more thoughtful responses needed)
  ending: 3e3
  // 3 seconds for ending (not used but defined for type safety)
};
function buildSelfIntroInstructions(profileData) {
  return `You are ${AGENT_NAME}, a friendly mock interviewer helping someone practice for job interviews.

CURRENT STAGE: Self-Introduction

CRITICAL RULES - NEVER BREAK THESE:
- NEVER say filler phrases like: "I'm listening", "Go ahead", "Okay", "I understand", "I see", "Take your time", "Continue", "Please go on"
- NEVER respond to incomplete statements - you will receive COMPLETE thoughts only
- NEVER ask them to repeat or say you didn't understand

Your task:
1. Listen to their introduction and engage naturally - they may speak in shorter bursts
2. Respond with a brief, warm comment or question about what they just shared
3. Keep your responses to 1-2 sentences. Be conversational and encouraging.
4. Ask ONE specific follow-up question to keep the conversation flowing naturally
5. Help them build their introduction organically rather than requiring long monologues

Be conversational - respond to what they say naturally, even if it's just a few sentences.
DO NOT say goodbye or end the interview.
${profileData?.name ? `The candidate's name is ${profileData.name}.` : ""}`;
}
function buildPastExperienceInstructions(profileData, introSummary) {
  return `You are ${AGENT_NAME}, a friendly mock interviewer.

CURRENT STAGE: Past Experience Discussion

Context from their intro: ${introSummary || "They just introduced themselves."}

CRITICAL RULES - NEVER BREAK THESE:
- NEVER say filler phrases like: "I'm listening", "Go ahead", "Okay", "I understand", "I see", "Take your time", "Continue", "Please go on"
- NEVER respond to incomplete statements - you will receive COMPLETE thoughts only
- NEVER ask them to repeat or say you didn't understand

Your task:
1. Ask about specific projects, achievements, or challenges from their work/academic experience
2. Use the STAR method - dig into Situation, Task, Action, and Result
3. Ask 4-5 focused questions total, going deeper into interesting topics
4. Be curious and encouraging. Show genuine interest in their experiences.

Keep questions SHORT (2-3 sentences max) and focused. Let them do most of the talking.
DO NOT end the interview yet - keep asking questions.
${profileData?.experience?.[0] ? `They have experience as ${profileData.experience[0].position} at ${profileData.experience[0].company}.` : ""}`;
}
const AGENT_INTRO = `Hi! I'm ${AGENT_NAME}, and I'll be your interviewer today for this mock interview practice session. I'm here to help you prepare and give you a realistic interview experience. Let's get started!

Please tell me a bit about yourself. You can start with your name, background, education, and what you're looking for in your career. Feel free to speak naturally - I'll ask follow-up questions to help build out your introduction.`;
const TRANSITION_MESSAGE = `Thanks for sharing that with me! You gave a really clear introduction about your background and goals. Now let's dive deeper into your experience. Tell me about a specific project or achievement you're particularly proud of - what was the situation, what did you do, and what was the result?`;
const ENDING_MESSAGE = `Thank you so much for this practice session! You did a great job. I hope this was helpful for your interview preparation. You can now click the disconnect button to end the session. Best of luck with your interviews!`;
var agent_default = defineAgent({
  entry: async (ctx) => {
    let profileData = null;
    try {
      const metadata = ctx.job?.metadata ? JSON.parse(ctx.job.metadata) : {};
      profileData = metadata.profile || null;
      console.log("Profile loaded:", profileData ? "Yes" : "No");
    } catch (err) {
      console.error("Failed to parse metadata:", err);
    }
    await ctx.connect(void 0, AutoSubscribe.AUDIO_ONLY);
    let currentStage = "selfIntro";
    let selfIntroTurns = 0;
    let pastExpTurns = 0;
    let userIntroSummary = "";
    let isShuttingDown = false;
    const selfIntroAgent = new VoiceAgent({
      instructions: buildSelfIntroInstructions(profileData),
      stt: "deepgram",
      llm: "google/gemini-2.0-flash-lite",
      tts: "elevenlabs",
      allowInterruptions: false,
      turnDetection: "manual"
      // We control when to respond
    });
    const session = new AgentSession({
      stt: "deepgram",
      llm: "google/gemini-2.0-flash-lite",
      tts: "elevenlabs",
      turnDetection: "manual"
      // We control when to respond
    });
    async function publishData(type, data) {
      if (isShuttingDown) return;
      try {
        const str = JSON.stringify({ type, ...data });
        const payload = new TextEncoder().encode(str);
        if (ctx.room.localParticipant) {
          await ctx.room.localParticipant.publishData(payload, { reliable: true });
          console.log(`Published data: ${type}`, data);
        } else {
          console.warn("Cannot publish data: localParticipant is undefined");
        }
      } catch (err) {
        console.error("Failed to publish data:", err);
      }
    }
    async function transitionToPastExperience() {
      if (currentStage !== "selfIntro" || isShuttingDown) return;
      console.log("\n========== TRANSITIONING TO PAST EXPERIENCE ==========\n");
      currentStage = "pastExperience";
      pastExpTurns = 0;
      await publishData("stage", { stage: "pastExperience" });
      await session.say(TRANSITION_MESSAGE, { addToChatCtx: true });
      const pastExpAgent = new VoiceAgent({
        instructions: buildPastExperienceInstructions(profileData, userIntroSummary),
        stt: "deepgram",
        llm: "google/gemini-2.0-flash-lite",
        tts: "elevenlabs",
        allowInterruptions: false,
        turnDetection: "manual"
        // We control when to respond
      });
      try {
        await session.updateAgent(pastExpAgent);
        console.log("Switched to past experience agent");
      } catch (err) {
        console.error("Error switching agent:", err);
      }
    }
    async function endInterview() {
      if (currentStage === "ending" || isShuttingDown) return;
      console.log("\n========== ENDING INTERVIEW ==========\n");
      currentStage = "ending";
      await publishData("stage", { stage: "ending" });
      await session.say(ENDING_MESSAGE, { addToChatCtx: true });
      console.log("Generating feedback...");
      try {
        const feedbackLlm = new google.LLM({
          model: "gemini-2.0-flash-lite"
        });
        const feedbackPrompt = `
          You are an expert interview coach. I need you to evaluate a candidate based on their mock interview transcript.
          
          Interview Context:
          - Candidate Name: ${profileData?.name || "Unknown"}
          - Self Introduction Summary: ${userIntroSummary}
          - Total Speech Transcript: ${accumulatedUserSpeech}
          
          Please analyze their performance and provide structured feedback in valid JSON format.
          Do NOT output any markdown blocks (like \`\`\`json), just the raw JSON object.
          
          JSON Schema:
          {
            "score": number, // Overall score 0-100
            "summary": "string", // Brief summary of performance (1-2 sentences)
            "strengths": ["string", "string"], // Top 2-3 strengths
            "improvements": ["string", "string"] // Top 2-3 areas for improvement
          }
          
          Focus on communication clarity, content relevance, and professional tone.
        `;
        const response = await feedbackLlm.chat({
          messages: [
            { role: llm.ChatRole.USER, content: feedbackPrompt }
          ]
        });
        const content = response.chatChatMessage.content || "";
        console.log("Raw feedback:", content);
        let feedbackData;
        try {
          const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
          feedbackData = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Failed to parse feedback JSON:", e);
          feedbackData = {
            score: 85,
            summary: "Good effort! I couldn't parse the detailed feedback, but you spoke clearly.",
            strengths: ["Clear communication", "Good engagement"],
            improvements: ["Expand more on details", "Use more structured answers"]
          };
        }
        await publishData("feedback", feedbackData);
        console.log("Feedback sent to frontend");
      } catch (err) {
        console.error("Error generating feedback:", err);
      }
      console.log("Interview completed - waiting for user to disconnect");
    }
    let isOpeningIntro = true;
    let pendingTransition = false;
    let pendingEnd = false;
    let lastAgentState = "initializing";
    let speechStartedAt = 0;
    let lastUserWords = 0;
    let currentTurnWords = 0;
    let accumulatedUserSpeech = "";
    let silenceTimer = null;
    let agentIsSpeaking = false;
    async function triggerAgentResponse() {
      if (isShuttingDown || agentIsSpeaking || isOpeningIntro) return;
      if (currentTurnWords < 5) {
        console.log(`Only ${currentTurnWords} words - waiting for more...`);
        return;
      }
      if (pendingTransition || pendingEnd) {
        console.log(`[${currentStage}] Not responding - transition/ending in progress`);
        return;
      }
      const timeout = SILENCE_TIMEOUT_MS[currentStage] || 3e3;
      console.log(`[${currentStage}] Triggering response after ${timeout}ms silence (${currentTurnWords} words)`);
      if (currentStage === "selfIntro" && selfIntroTurns >= SELF_INTRO_TURNS - 1) {
        console.log(`[${currentStage}] Smart transition: Skipping generic reply, going straight to next stage`);
        await transitionToPastExperience();
        return;
      }
      if (currentStage === "pastExperience" && pastExpTurns >= PAST_EXP_TURNS - 1) {
        console.log(`[${currentStage}] Smart transition: Skipping generic reply, ending interview`);
        await endInterview();
        return;
      }
      try {
        await session.generateReply();
      } catch (err) {
        console.error("Error generating reply:", err);
      }
    }
    session.on(AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      if (isShuttingDown) return;
      const text = ev.transcript || "";
      const isFinal = ev.isFinal !== false;
      if (!text.trim()) return;
      if (agentIsSpeaking) return;
      console.log(`[${currentStage}] User: "${text}" ${isFinal ? "(final)" : "(partial)"}`);
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (isFinal) {
        const wordCount = text.trim().split(/\s+/).length;
        currentTurnWords += wordCount;
        accumulatedUserSpeech += " " + text;
        if (currentStage === "selfIntro") {
          userIntroSummary += " " + text;
        }
        const timeout = SILENCE_TIMEOUT_MS[currentStage] || 3e3;
        silenceTimer = setTimeout(() => {
          triggerAgentResponse();
        }, timeout);
      }
    });
    session.on(AgentSessionEventTypes.SpeechCreated, () => {
      if (isShuttingDown) return;
      speechStartedAt = Date.now();
      if (isOpeningIntro) {
        console.log(`[${currentStage}] Agent speaking (opening intro)`);
        return;
      }
      console.log(`[${currentStage}] Agent speaking...`);
    });
    session.on(AgentSessionEventTypes.AgentStateChanged, (ev) => {
      if (isShuttingDown) return;
      const oldState = ev?.oldState || lastAgentState;
      const newState = ev?.newState || "unknown";
      lastAgentState = newState;
      console.log(`Agent state: ${oldState} \u2192 ${newState}`);
      if (newState === "speaking") {
        agentIsSpeaking = true;
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }
      }
      if (oldState === "speaking" && newState === "listening") {
        agentIsSpeaking = false;
        lastUserWords = currentTurnWords;
        currentTurnWords = 0;
        accumulatedUserSpeech = "";
      }
      if (isOpeningIntro && newState === "listening" && oldState === "speaking") {
        isOpeningIntro = false;
        console.log("Opening intro completed - ready to listen");
        return;
      }
      if (oldState === "speaking" && newState === "listening") {
        const speechDuration = Date.now() - speechStartedAt;
        if (speechDuration < 3e3) {
          console.log(`Agent speech was short (${speechDuration}ms) - not counting as exchange`);
          return;
        }
        if (lastUserWords < MIN_WORDS_FOR_COMPLETE_RESPONSE) {
          console.log(`User said ${lastUserWords} words (need ${MIN_WORDS_FOR_COMPLETE_RESPONSE}) - not counting as exchange`);
          return;
        }
        console.log(`[${currentStage}] Complete exchange (agent: ${speechDuration}ms, user: ${lastUserWords} words)`);
        if (currentStage === "selfIntro") {
          selfIntroTurns++;
          console.log(`Self-intro exchange ${selfIntroTurns}/${SELF_INTRO_TURNS} completed`);
          if (selfIntroTurns >= SELF_INTRO_TURNS && !pendingTransition) {
            pendingTransition = true;
            console.log("Transitioning to past experience...");
            setTimeout(() => transitionToPastExperience(), 2e3);
          }
        } else if (currentStage === "pastExperience") {
          pastExpTurns++;
          console.log(`Past experience exchange ${pastExpTurns}/${PAST_EXP_TURNS} completed`);
          if (pastExpTurns >= PAST_EXP_TURNS && !pendingEnd) {
            pendingEnd = true;
            console.log("Ending interview...");
            setTimeout(() => endInterview(), 500);
          }
        }
      }
    });
    session.on(AgentSessionEventTypes.Error, (ev) => {
      console.error("Session error:", ev);
    });
    ctx.room.on("participantDisconnected", () => {
      const participants = Array.from(ctx.room.remoteParticipants.values());
      if (participants.length === 0) {
        console.log("All participants disconnected");
        isShuttingDown = true;
      }
    });
    ctx.room.on("disconnected", () => {
      console.log("Room disconnected");
      isShuttingDown = true;
    });
    try {
      await session.start({
        agent: selfIntroAgent,
        room: ctx.room
      });
      console.log("\n========== INTERVIEW STARTED ==========");
      console.log(`Stage 1: Self-Introduction (${SELF_INTRO_TURNS} exchanges)`);
      console.log(`Stage 2: Past Experience (${PAST_EXP_TURNS} exchanges)
`);
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      console.log("Agent introducing itself...");
      await session.say(AGENT_INTRO, { addToChatCtx: true });
    } catch (error) {
      console.error("Failed to start session:", error);
      throw error;
    }
  }
});
export {
  agent_default as default
};
//# sourceMappingURL=agent.js.map
