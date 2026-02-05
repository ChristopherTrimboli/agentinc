/**
 * Twilio Communications Tools
 *
 * Full-featured Twilio integration for messaging and voice:
 * - SMS: Send text messages
 * - MMS: Send images, videos, audio, documents, vCards
 * - Voice: Make phone calls with text-to-speech
 * - WhatsApp: Send WhatsApp messages (requires WhatsApp Business setup)
 * - Status: Check delivery status, call status
 *
 * Setup:
 * 1. Create a Twilio account at https://www.twilio.com
 * 2. Get your Account SID and Auth Token from the Twilio Console
 * 3. Buy a phone number with SMS/MMS/Voice capabilities
 * 4. Set environment variables:
 *    - TWILIO_ACCOUNT_SID
 *    - TWILIO_AUTH_TOKEN
 *    - TWILIO_PHONE_NUMBER (E.164 format, e.g., +15551234567)
 *    - TWILIO_WHATSAPP_NUMBER (optional, for WhatsApp)
 *
 * Media Limits:
 * - MMS: 5 MB max per message
 * - WhatsApp: 16 MB max per message
 * - Supported formats: JPEG, PNG, GIF, MP4, PDF, vCard, and more
 */

import { tool } from "ai";
import { z } from "zod";
import twilio from "twilio";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get Twilio client with credentials from environment
 */
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken);
}

/**
 * Get the Twilio phone number from environment
 */
function getTwilioPhoneNumber(): string | null {
  return process.env.TWILIO_PHONE_NUMBER || null;
}

/**
 * Get the Twilio WhatsApp number from environment
 */
function getTwilioWhatsAppNumber(): string | null {
  return process.env.TWILIO_WHATSAPP_NUMBER || null;
}

/**
 * Validate E.164 phone number format
 * E.164: +[country code][number], e.g., +15551234567
 */
function isValidE164(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

// Note: SUPPORTED_MEDIA_TYPES was removed as dead code.
// If MMS media type validation is needed in the future, add it back
// and actually use it in the send functions.

// ============================================================================
// Schema Definitions
// ============================================================================

const sendSmsSchema = z.object({
  to: z
    .string()
    .describe(
      "The recipient phone number in E.164 format (e.g., +15551234567). Must include country code with + prefix.",
    ),
  message: z
    .string()
    .max(1600)
    .describe(
      "The SMS message content. Max 1600 characters (will be split into multiple segments if over 160).",
    ),
});

const sendMmsSchema = z.object({
  to: z
    .string()
    .describe(
      "The recipient phone number in E.164 format (e.g., +15551234567).",
    ),
  message: z
    .string()
    .max(1600)
    .optional()
    .describe("Optional text message to accompany the media."),
  mediaUrl: z
    .string()
    .url()
    .describe(
      "URL of the media to send. Must be publicly accessible. Supported: images (JPEG, PNG, GIF), videos (MP4), audio (MP3), PDFs.",
    ),
  mediaType: z
    .enum([
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "audio/mpeg",
      "application/pdf",
    ])
    .optional()
    .describe("MIME type of the media (auto-detected if not provided)."),
});

const makeCallSchema = z.object({
  to: z
    .string()
    .describe("The phone number to call in E.164 format (e.g., +15551234567)."),
  message: z
    .string()
    .max(5000)
    .describe(
      "The message to speak using text-to-speech when the call is answered. Max 5000 characters.",
    ),
  voice: z
    .enum([
      "alice",
      "man",
      "woman",
      "Polly.Joanna",
      "Polly.Matthew",
      "Polly.Amy",
      "Polly.Brian",
    ])
    .optional()
    .default("Polly.Joanna")
    .describe(
      "Voice to use for text-to-speech. Options: alice, man, woman, or Amazon Polly voices like Polly.Joanna, Polly.Matthew.",
    ),
  language: z
    .enum([
      "en-US",
      "en-GB",
      "en-AU",
      "es-ES",
      "es-MX",
      "fr-FR",
      "de-DE",
      "it-IT",
      "pt-BR",
      "ja-JP",
      "zh-CN",
    ])
    .optional()
    .default("en-US")
    .describe("Language for the text-to-speech voice."),
});

const playAudioCallSchema = z.object({
  to: z
    .string()
    .describe("The phone number to call in E.164 format (e.g., +15551234567)."),
  audioUrl: z
    .string()
    .url()
    .describe(
      "URL of the audio file to play (MP3 or WAV). Must be publicly accessible.",
    ),
  introMessage: z
    .string()
    .optional()
    .describe("Optional text-to-speech message to play before the audio."),
});

const sendWhatsAppSchema = z.object({
  to: z
    .string()
    .describe(
      "The recipient phone number in E.164 format (e.g., +15551234567). Do NOT include 'whatsapp:' prefix.",
    ),
  message: z
    .string()
    .max(4096)
    .describe("The WhatsApp message content. Max 4096 characters."),
  mediaUrl: z
    .string()
    .url()
    .optional()
    .describe(
      "Optional URL of media to include (images, videos, documents up to 16MB).",
    ),
});

const checkMessageStatusSchema = z.object({
  messageSid: z
    .string()
    .describe(
      "The Twilio Message SID returned from sendSms/sendMms (starts with 'SM' or 'MM').",
    ),
});

const checkCallStatusSchema = z.object({
  callSid: z
    .string()
    .describe("The Twilio Call SID returned from makeCall (starts with 'CA')."),
});

const getMessageHistorySchema = z.object({
  to: z
    .string()
    .optional()
    .describe("Filter by recipient phone number in E.164 format."),
  limit: z
    .number()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("Number of messages to retrieve (max 50)."),
  dateSentAfter: z
    .string()
    .optional()
    .describe("Only show messages sent after this date (ISO 8601 format)."),
});

// ============================================================================
// SMS Tools
// ============================================================================

/**
 * Send an SMS message via Twilio
 */
export const sendSms = tool({
  description: `Send an SMS text message to a phone number. Use this when a user asks you to text them, send them an SMS, or send a message to their phone. The phone number must be in E.164 format with country code (e.g., +15551234567 for US numbers). The message can be up to 1600 characters.`,
  inputSchema: sendSmsSchema,
  execute: async (input: z.infer<typeof sendSmsSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return {
          success: false,
          error: "SMS not configured",
          details:
            "Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.",
        };
      }

      const fromNumber = getTwilioPhoneNumber();
      if (!fromNumber) {
        return {
          success: false,
          error: "SMS not configured",
          details:
            "Twilio phone number not configured. Please set TWILIO_PHONE_NUMBER environment variable.",
        };
      }

      if (!isValidE164(input.to)) {
        return {
          success: false,
          error: "Invalid phone number format",
          details: `Phone number must be in E.164 format (e.g., +15551234567). Received: ${input.to}`,
        };
      }

      const message = await client.messages.create({
        body: input.message,
        from: fromNumber,
        to: input.to,
      });

      const hasUnicode = /[^\x00-\x7F]/.test(input.message);
      const charsPerSegment = hasUnicode ? 70 : 160;
      const segments = Math.ceil(input.message.length / charsPerSegment);

      return {
        success: true,
        messageSid: message.sid,
        to: message.to,
        status: message.status,
        segments,
        message: `SMS sent successfully to ${message.to}. Message ID: ${message.sid}`,
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number; moreInfo?: string };

      if (err.code === 21211) {
        return {
          success: false,
          error: "Invalid phone number",
          details: `The phone number '${input.to}' is not valid. Make sure it's in E.164 format with country code.`,
        };
      }
      if (err.code === 21608) {
        return {
          success: false,
          error: "Unverified number (trial account)",
          details:
            "This phone number hasn't been verified. Trial Twilio accounts can only send to verified numbers. Verify the number in Twilio Console or upgrade your account.",
        };
      }
      if (err.code === 21610) {
        return {
          success: false,
          error: "Number opted out",
          details:
            "This number has opted out of receiving messages. The recipient must text START to opt back in.",
        };
      }

      return {
        success: false,
        error: "Failed to send SMS",
        details: err.message,
        moreInfo: err.moreInfo,
      };
    }
  },
});

// ============================================================================
// MMS Tools (Rich Media)
// ============================================================================

/**
 * Send an MMS message with media (images, videos, audio, documents)
 */
export const sendMms = tool({
  description: `Send an MMS message with rich media content. Use this to send images, photos, videos, audio files, PDFs, or vCards. The media URL must be publicly accessible. Max file size is 5MB. Supports: JPEG, PNG, GIF images; MP4 videos; MP3 audio; PDF documents.`,
  inputSchema: sendMmsSchema,
  execute: async (input: z.infer<typeof sendMmsSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return {
          success: false,
          error: "MMS not configured",
          details: "Twilio credentials are not configured.",
        };
      }

      const fromNumber = getTwilioPhoneNumber();
      if (!fromNumber) {
        return {
          success: false,
          error: "MMS not configured",
          details: "Twilio phone number not configured.",
        };
      }

      if (!isValidE164(input.to)) {
        return {
          success: false,
          error: "Invalid phone number format",
          details: `Phone number must be in E.164 format. Received: ${input.to}`,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageParams: any = {
        from: fromNumber,
        to: input.to,
        mediaUrl: [input.mediaUrl],
      };

      if (input.message) {
        messageParams.body = input.message;
      }

      const message = await client.messages.create(messageParams);

      return {
        success: true,
        messageSid: message.sid,
        to: message.to,
        status: message.status,
        mediaUrl: input.mediaUrl,
        message: `MMS sent successfully to ${message.to} with media. Message ID: ${message.sid}`,
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number; moreInfo?: string };

      if (err.code === 12300) {
        return {
          success: false,
          error: "Invalid media URL",
          details:
            "The media URL is not accessible or returns an invalid content type. Make sure the URL is publicly accessible and returns valid media.",
        };
      }
      if (err.code === 12400) {
        return {
          success: false,
          error: "Unsupported media type",
          details:
            "The media type is not supported. Supported types: JPEG, PNG, GIF, MP4, MP3, PDF.",
        };
      }

      return {
        success: false,
        error: "Failed to send MMS",
        details: err.message,
        moreInfo: err.moreInfo,
      };
    }
  },
});

/**
 * Send an image via MMS (convenience method)
 */
export const sendImage = tool({
  description: `Send an image via MMS. Use this to send a photo, picture, or image to someone's phone. Provide the image URL and recipient phone number. Supports JPEG, PNG, GIF formats up to 5MB.`,
  inputSchema: z.object({
    to: z.string().describe("Recipient phone number in E.164 format."),
    imageUrl: z.string().url().describe("URL of the image to send."),
    caption: z.string().optional().describe("Optional caption for the image."),
  }),
  execute: async (input) => {
    const client = getTwilioClient();
    if (!client) {
      return { success: false, error: "Twilio not configured" };
    }

    const fromNumber = getTwilioPhoneNumber();
    if (!fromNumber) {
      return { success: false, error: "Phone number not configured" };
    }

    if (!isValidE164(input.to)) {
      return { success: false, error: "Invalid phone number format" };
    }

    try {
      const message = await client.messages.create({
        from: fromNumber,
        to: input.to,
        mediaUrl: [input.imageUrl],
        body: input.caption || undefined,
      });

      return {
        success: true,
        messageSid: message.sid,
        to: message.to,
        message: `Image sent to ${message.to}!`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: "Failed to send image",
        details: (error as Error).message,
      };
    }
  },
});

// ============================================================================
// Voice Call Tools
// ============================================================================

/**
 * Make a phone call with text-to-speech
 */
export const makeCall = tool({
  description: `Make a phone call and speak a message using text-to-speech. Use this when a user asks you to call them or deliver a voice message. The recipient will receive a phone call and hear your message spoken aloud. You can choose different voices and languages.`,
  inputSchema: makeCallSchema,
  execute: async (input: z.infer<typeof makeCallSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return {
          success: false,
          error: "Voice not configured",
          details: "Twilio credentials are not configured.",
        };
      }

      const fromNumber = getTwilioPhoneNumber();
      if (!fromNumber) {
        return {
          success: false,
          error: "Voice not configured",
          details: "Twilio phone number not configured.",
        };
      }

      if (!isValidE164(input.to)) {
        return {
          success: false,
          error: "Invalid phone number format",
          details: `Phone number must be in E.164 format. Received: ${input.to}`,
        };
      }

      // Build TwiML for text-to-speech
      const twiml = `<Response><Say voice="${input.voice}" language="${input.language}">${escapeXml(input.message)}</Say></Response>`;

      const call = await client.calls.create({
        from: fromNumber,
        to: input.to,
        twiml: twiml,
      });

      return {
        success: true,
        callSid: call.sid,
        to: call.to,
        status: call.status,
        voice: input.voice,
        language: input.language,
        message: `Calling ${call.to}... The message will be spoken when they answer. Call ID: ${call.sid}`,
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number; moreInfo?: string };

      if (err.code === 21214) {
        return {
          success: false,
          error: "Cannot call this number",
          details:
            "This phone number cannot receive calls (may be invalid, a landline without voicemail, or blocked).",
        };
      }

      return {
        success: false,
        error: "Failed to make call",
        details: err.message,
        moreInfo: err.moreInfo,
      };
    }
  },
});

/**
 * Make a phone call and play an audio file
 */
export const playAudioCall = tool({
  description: `Make a phone call and play an audio file (MP3 or WAV). Use this to play pre-recorded audio, music, or announcements. You can optionally include a text-to-speech intro before the audio plays.`,
  inputSchema: playAudioCallSchema,
  execute: async (input: z.infer<typeof playAudioCallSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return { success: false, error: "Twilio not configured" };
      }

      const fromNumber = getTwilioPhoneNumber();
      if (!fromNumber) {
        return { success: false, error: "Phone number not configured" };
      }

      if (!isValidE164(input.to)) {
        return { success: false, error: "Invalid phone number format" };
      }

      // Build TwiML
      let twiml = "<Response>";
      if (input.introMessage) {
        twiml += `<Say voice="Polly.Joanna">${escapeXml(input.introMessage)}</Say>`;
      }
      twiml += `<Play>${escapeXml(input.audioUrl)}</Play>`;
      twiml += "</Response>";

      const call = await client.calls.create({
        from: fromNumber,
        to: input.to,
        twiml: twiml,
      });

      return {
        success: true,
        callSid: call.sid,
        to: call.to,
        status: call.status,
        message: `Calling ${call.to}... The audio will play when they answer.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: "Failed to make call",
        details: (error as Error).message,
      };
    }
  },
});

// ============================================================================
// WhatsApp Tools
// ============================================================================

/**
 * Send a WhatsApp message
 */
export const sendWhatsApp = tool({
  description: `Send a WhatsApp message. Requires WhatsApp Business API setup in Twilio. Use this when a user specifically asks to send via WhatsApp. Can include text and media (images, videos, documents up to 16MB).`,
  inputSchema: sendWhatsAppSchema,
  execute: async (input: z.infer<typeof sendWhatsAppSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return { success: false, error: "Twilio not configured" };
      }

      const whatsappNumber = getTwilioWhatsAppNumber();
      if (!whatsappNumber) {
        return {
          success: false,
          error: "WhatsApp not configured",
          details:
            "WhatsApp number not configured. Set TWILIO_WHATSAPP_NUMBER environment variable. Format: whatsapp:+15551234567",
        };
      }

      if (!isValidE164(input.to)) {
        return { success: false, error: "Invalid phone number format" };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageParams: any = {
        from: whatsappNumber.startsWith("whatsapp:")
          ? whatsappNumber
          : `whatsapp:${whatsappNumber}`,
        to: `whatsapp:${input.to}`,
        body: input.message,
      };

      if (input.mediaUrl) {
        messageParams.mediaUrl = [input.mediaUrl];
      }

      const message = await client.messages.create(messageParams);

      return {
        success: true,
        messageSid: message.sid,
        to: input.to,
        status: message.status,
        message: `WhatsApp message sent to ${input.to}!`,
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number };

      if (err.code === 63016) {
        return {
          success: false,
          error: "WhatsApp not opted in",
          details:
            "The recipient hasn't opted in to receive WhatsApp messages from this number. They need to message your WhatsApp number first.",
        };
      }

      return {
        success: false,
        error: "Failed to send WhatsApp message",
        details: (error as Error).message,
      };
    }
  },
});

// ============================================================================
// Status & History Tools
// ============================================================================

/**
 * Check message delivery status
 */
export const checkMessageStatus = tool({
  description:
    "Check the delivery status of a sent SMS or MMS message using its Message SID.",
  inputSchema: checkMessageStatusSchema,
  execute: async (input: z.infer<typeof checkMessageStatusSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return { success: false, error: "Twilio not configured" };
      }

      const message = await client.messages(input.messageSid).fetch();

      const statusDescriptions: Record<string, string> = {
        queued: "Message is queued and waiting to be sent",
        sending: "Message is currently being sent",
        sent: "Message has been sent to the carrier",
        delivered: "Message was successfully delivered to the recipient",
        undelivered: "Message could not be delivered",
        failed: "Message failed to send",
        received: "Incoming message was received",
        accepted: "Message was accepted for delivery",
        scheduled: "Message is scheduled for future delivery",
        read: "Message was read (WhatsApp only)",
        canceled: "Message was canceled",
      };

      return {
        success: true,
        messageSid: message.sid,
        to: message.to,
        from: message.from,
        status: message.status,
        statusDescription:
          statusDescriptions[message.status] || `Status: ${message.status}`,
        dateSent: message.dateSent?.toISOString(),
        numMedia: message.numMedia,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number };

      if (err.code === 20404) {
        return {
          success: false,
          error: "Message not found",
          details: `No message found with SID: ${input.messageSid}`,
        };
      }

      return {
        success: false,
        error: "Failed to check status",
        details: (error as Error).message,
      };
    }
  },
});

/**
 * Check call status
 */
export const checkCallStatus = tool({
  description: "Check the status of a phone call using its Call SID.",
  inputSchema: checkCallStatusSchema,
  execute: async (input: z.infer<typeof checkCallStatusSchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return { success: false, error: "Twilio not configured" };
      }

      const call = await client.calls(input.callSid).fetch();

      const statusDescriptions: Record<string, string> = {
        queued: "Call is queued and waiting to be placed",
        ringing: "Call is ringing",
        "in-progress": "Call is currently in progress",
        completed: "Call completed successfully",
        busy: "Recipient's line was busy",
        failed: "Call failed to connect",
        "no-answer": "No answer",
        canceled: "Call was canceled",
      };

      return {
        success: true,
        callSid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        statusDescription:
          statusDescriptions[call.status] || `Status: ${call.status}`,
        duration: call.duration ? `${call.duration} seconds` : "N/A",
        startTime: call.startTime?.toISOString(),
        endTime: call.endTime?.toISOString(),
        direction: call.direction,
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: number };

      if (err.code === 20404) {
        return {
          success: false,
          error: "Call not found",
          details: `No call found with SID: ${input.callSid}`,
        };
      }

      return {
        success: false,
        error: "Failed to check status",
        details: (error as Error).message,
      };
    }
  },
});

/**
 * Get recent message history
 */
export const getMessageHistory = tool({
  description:
    "Get recent sent and received messages. Can filter by recipient phone number.",
  inputSchema: getMessageHistorySchema,
  execute: async (input: z.infer<typeof getMessageHistorySchema>) => {
    try {
      const client = getTwilioClient();
      if (!client) {
        return { success: false, error: "Twilio not configured" };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        limit: input.limit || 10,
      };

      if (input.to) {
        params.to = input.to;
      }

      if (input.dateSentAfter) {
        params.dateSentAfter = new Date(input.dateSentAfter);
      }

      const messages = await client.messages.list(params);

      return {
        success: true,
        count: messages.length,
        messages: messages.map((m) => ({
          sid: m.sid,
          to: m.to,
          from: m.from,
          body:
            m.body?.substring(0, 100) +
            (m.body && m.body.length > 100 ? "..." : ""),
          status: m.status,
          direction: m.direction,
          dateSent: m.dateSent?.toISOString(),
          numMedia: m.numMedia,
        })),
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: "Failed to get message history",
        details: (error as Error).message,
      };
    }
  },
});

/**
 * Check Twilio configuration status
 */
export const checkTwilioConfig = tool({
  description:
    "Check if Twilio is properly configured and what features are available (SMS, MMS, Voice, WhatsApp).",
  inputSchema: z.object({}),
  execute: async () => {
    const client = getTwilioClient();
    const phoneNumber = getTwilioPhoneNumber();
    const whatsappNumber = getTwilioWhatsAppNumber();

    if (!client) {
      return {
        configured: false,
        error: "Twilio credentials not configured",
        details:
          "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.",
      };
    }

    if (!phoneNumber) {
      return {
        configured: false,
        error: "Twilio phone number not configured",
        details: "Set TWILIO_PHONE_NUMBER environment variable.",
      };
    }

    try {
      const account = await client.api
        .accounts(process.env.TWILIO_ACCOUNT_SID!)
        .fetch();

      return {
        configured: true,
        accountStatus: account.status,
        accountType: account.type,
        features: {
          sms: true,
          mms: true,
          voice: true,
          whatsapp: !!whatsappNumber,
        },
        phoneNumber: phoneNumber,
        whatsappNumber: whatsappNumber || "Not configured",
        message: `Twilio is configured. SMS/MMS/Voice available from ${phoneNumber}.${whatsappNumber ? ` WhatsApp available from ${whatsappNumber}.` : ""}`,
      };
    } catch (error: unknown) {
      return {
        configured: false,
        error: "Invalid Twilio credentials",
        details: (error as Error).message,
      };
    }
  },
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape XML special characters for TwiML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ============================================================================
// Exports
// ============================================================================

/**
 * All Twilio tools bundled together
 */
export const twilioTools = {
  // SMS
  sendSms,
  // MMS / Rich Media
  sendMms,
  sendImage,
  // Voice Calls
  makeCall,
  playAudioCall,
  // WhatsApp
  sendWhatsApp,
  // Status & History
  checkMessageStatus,
  checkCallStatus,
  getMessageHistory,
  // Configuration
  checkTwilioConfig,
};

// Also export individual categories for flexibility
export const smsTools = { sendSms, checkMessageStatus, checkTwilioConfig };
export const mmsTools = { sendMms, sendImage };
export const voiceTools = { makeCall, playAudioCall, checkCallStatus };
export const whatsAppTools = { sendWhatsApp };

export default twilioTools;
