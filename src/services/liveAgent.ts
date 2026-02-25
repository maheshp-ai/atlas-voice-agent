import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { AudioHandler } from "./audioHandler";

const displayCodeFunctionDeclaration: FunctionDeclaration = {
  name: "displayCode",
  parameters: {
    type: Type.OBJECT,
    description: "Display a code snippet in a dedicated code box for the user.",
    properties: {
      code: {
        type: Type.STRING,
        description: "The code snippet to display.",
      },
      language: {
        type: Type.STRING,
        description: "The programming language of the code (e.g., 'javascript', 'html').",
      },
      title: {
        type: Type.STRING,
        description: "A brief title for the code snippet.",
      },
    },
    required: ["code"],
  },
};

const SYSTEM_INSTRUCTION = `You are Atlas, a human-like, helpful voice AI agent for Netcore Smartech developer documentation. 
Your goal is to assist developers with integrating the Smartech Javascript SDK.

Tone: Professional, friendly, and human-like. Avoid sounding robotic. Use natural conversational fillers if appropriate but stay concise.
Your name is Atlas. Always identify as Atlas if asked.

Functions:
1. Greet the user warmly when they start the session.
2. Ask the user what they are looking forward to execute today.
3. Answer questions about web integration using the provided documentation URLs.
4. If the user is a first-time visitor or doing integration from scratch, brief them on these steps:
   - Make sure your website asset is created on the Smartech dashboard under Settings -> Website.
   - Pick the Smartech base JS from the asset and place it in the <head> section of your website so it's available on all pages.
   - Once the JS is added and the website is loaded, check the devtools console for the "smartech initiate" message.

Code Snippets:
When explaining technical steps or when asked for code syntax, you MUST use the 'displayCode' tool to show the relevant code snippets in a dedicated box. 
Do NOT just speak the code; use the tool so the user can see and copy it.
Include generic code syntax for common scenarios and specific structures mentioned in the integration documents.
Ensure the code is accurate and follows the Smartech SDK standards.
` + `
Documentation Context:
The following URLs contain the necessary integration details:
- https://developer.netcorecloud.com/docs/web-sdk-integration
- https://developer.netcorecloud.com/docs/web-customer-engagement-user
- https://developer.netcorecloud.com/docs/fcm-configuration
- https://developer.netcorecloud.com/docs/apns-configuration
- https://developer.netcorecloud.com/docs/coexistence-in-js
- https://developer.netcorecloud.com/docs/subscriber-migration
- https://developer.netcorecloud.com/docs/fcm-configuration-v-870
- https://developer.netcorecloud.com/docs/web-user-and-event-tracking
- https://developer.netcorecloud.com/docs/web-user-tracking
- https://developer.netcorecloud.com/docs/web-event-tracking
- https://developer.netcorecloud.com/docs/web-sdk-product-experience
- https://developer.netcorecloud.com/docs/web-defining-actions
- https://developer.netcorecloud.com/docs/web-ab-testing-and-feature-management
- https://developer.netcorecloud.com/docs/direct-js-integration
- https://developer.netcorecloud.com/docs/js-integration-via-gtm

Always refer to these sources for technical details.`;

export class LiveAgent {
  private ai: GoogleGenAI;
  private session: any = null;
  private audioHandler: AudioHandler;
  private onTranscription: (text: string, isModel: boolean) => void;
  private onCodeDisplay: (code: string, title?: string) => void;

  constructor(
    onTranscription: (text: string, isModel: boolean) => void,
    onCodeDisplay: (code: string, title?: string) => void,
    customKnowledge: string = ""
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    this.audioHandler = new AudioHandler();
    this.onTranscription = onTranscription;
    this.onCodeDisplay = onCodeDisplay;

    // Append custom knowledge to system instruction
    if (customKnowledge) {
      const updatedInstruction = SYSTEM_INSTRUCTION + `\n\nADDITIONAL CUSTOM KNOWLEDGE BASE:\n${customKnowledge}`;
      (this as any).systemInstruction = updatedInstruction;
    } else {
      (this as any).systemInstruction = SYSTEM_INSTRUCTION;
    }
  }

  async connect() {
    const sessionPromise = this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: (this as any).systemInstruction,
        tools: [{ functionDeclarations: [displayCodeFunctionDeclaration] }],
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          this.audioHandler.start((base64) => {
            sessionPromise.then(s => s.sendRealtimeInput({
              media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
            }));
          });
        },
        onmessage: async (message) => {
          if (message.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData) {
                this.audioHandler.play(part.inlineData.data);
              }
              if (part.text) {
                this.onTranscription(part.text, true);
              }
            }
          }

          if (message.toolCall) {
            for (const call of message.toolCall.functionCalls) {
              if (call.name === "displayCode") {
                const { code, title } = call.args as any;
                this.onCodeDisplay(code, title);
                
                // Send response back to model
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: [{
                    name: "displayCode",
                    response: { success: true },
                    id: call.id
                  }]
                }));
              }
            }
          }

          if (message.serverContent?.interrupted) {
            this.audioHandler.clearQueue();
          }
        },
        onerror: (e) => console.error("Live API Error:", e),
        onclose: () => this.audioHandler.stop(),
      },
    });

    this.session = await sessionPromise;
  }

  disconnect() {
    this.session?.close();
    this.audioHandler.stop();
  }
}
