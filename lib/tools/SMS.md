# Twilio Communications Tools

Full-featured Twilio integration for SMS, MMS, voice calls, and WhatsApp messaging.

## Overview

The Twilio tools enable the AI agent to communicate with users through multiple channels:

- **SMS**: Send text messages (up to 1600 characters)
- **MMS**: Send rich media - images, videos, audio, PDFs, vCards
- **Voice**: Make phone calls with text-to-speech or play audio files
- **WhatsApp**: Send WhatsApp messages with optional media

## Setup

### 1. Create a Twilio Account

1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Complete phone verification
3. Note: Trial accounts can only send to verified numbers

### 2. Get Your Credentials

From the [Twilio Console](https://console.twilio.com):

1. **Account SID**: Found on the main dashboard
2. **Auth Token**: Click to reveal on the dashboard
3. **Phone Number**:
   - Go to Phone Numbers > Manage > Buy a number
   - Choose a number with SMS, MMS, and Voice capabilities
   - Must be in E.164 format: `+15551234567`

### 3. Configure Environment Variables

Add to your `.env.local`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Optional: For WhatsApp (requires WhatsApp Business API setup)
TWILIO_WHATSAPP_NUMBER=whatsapp:+15551234567
```

## Available Tools

### SMS Tools

#### `sendSms`

Send a text message to a phone number.

```
User: "Text me a reminder at +15551234567"
AI: *calls sendSms*
→ "SMS sent successfully! Message ID: SMxxxxxxxx"
```

**Parameters:**

- `to`: Recipient phone in E.164 format (e.g., `+15551234567`)
- `message`: Text content (max 1600 characters)

---

### MMS Tools (Rich Media)

#### `sendMms`

Send media with optional text caption.

**Supported Media Types:**
| Type | Formats | Max Size |
|------|---------|----------|
| Images | JPEG, PNG, GIF, HEIC | 5 MB |
| Video | MP4, MPEG, QuickTime | 5 MB |
| Audio | MP3, OGG, AMR | 5 MB |
| Documents | PDF, vCard | 5 MB |

```
User: "Send this image to my phone: https://example.com/photo.jpg"
AI: *calls sendMms*
→ "MMS sent with image!"
```

#### `sendImage`

Convenience method for sending images/photos.

```
User: "Send me this picture at +15551234567"
AI: *calls sendImage with imageUrl and optional caption*
```

---

### Voice Call Tools

#### `makeCall`

Make a phone call with text-to-speech.

```
User: "Call me at +15551234567 and tell me the weather"
AI: *calls makeCall*
→ "Calling +15551234567... The message will be spoken when they answer."
```

**Parameters:**

- `to`: Phone number to call
- `message`: Text to speak (max 5000 characters)
- `voice`: Voice selection (optional)
  - Basic: `alice`, `man`, `woman`
  - Amazon Polly: `Polly.Joanna`, `Polly.Matthew`, `Polly.Amy`, `Polly.Brian`
- `language`: Language code (optional)
  - `en-US`, `en-GB`, `es-ES`, `fr-FR`, `de-DE`, `ja-JP`, `zh-CN`, etc.

#### `playAudioCall`

Make a call and play an audio file.

```
User: "Call and play this MP3: https://example.com/message.mp3"
AI: *calls playAudioCall*
```

**Parameters:**

- `to`: Phone number to call
- `audioUrl`: URL of MP3 or WAV file
- `introMessage`: Optional TTS intro before audio

---

### WhatsApp Tools

#### `sendWhatsApp`

Send a WhatsApp message (requires WhatsApp Business API setup).

```
User: "Send a WhatsApp to +15551234567"
AI: *calls sendWhatsApp*
```

**Note:** Recipients must opt-in by messaging your WhatsApp number first.

---

### Status & History Tools

#### `checkMessageStatus`

Check SMS/MMS delivery status.

**Status Values:**
| Status | Description |
|--------|-------------|
| `queued` | Waiting to be sent |
| `sending` | Currently sending |
| `sent` | Sent to carrier |
| `delivered` | Successfully delivered |
| `undelivered` | Could not be delivered |
| `failed` | Failed to send |

#### `checkCallStatus`

Check voice call status.

**Status Values:**
| Status | Description |
|--------|-------------|
| `queued` | Waiting to be placed |
| `ringing` | Phone is ringing |
| `in-progress` | Call connected |
| `completed` | Call finished |
| `busy` | Line was busy |
| `no-answer` | No answer |
| `failed` | Failed to connect |

#### `getMessageHistory`

Get recent sent/received messages.

```
AI: *calls getMessageHistory with limit: 10*
→ Returns last 10 messages with status, content preview, timestamps
```

#### `checkTwilioConfig`

Verify Twilio is properly configured and check available features.

---

## Usage Examples

### Natural Language Triggers

The AI recognizes these requests:

**SMS:**

- "Text me at 555-123-4567"
- "Send an SMS to +1 (555) 123-4567"
- "Message my phone"

**MMS:**

- "Send this photo to my number"
- "MMS me this image"
- "Send me that PDF"

**Voice:**

- "Call me and tell me..."
- "Give me a phone call"
- "Voice call this number"

**WhatsApp:**

- "Send a WhatsApp message to..."
- "WhatsApp me at..."

---

## Trial Account Limitations

Twilio trial accounts have restrictions:

1. **Verified Numbers Only**: Can only send/call verified numbers
2. **Trial Message Prefix**: SMS includes "Sent from your Twilio trial account"
3. **Limited Credits**: Trial balance is limited
4. **No WhatsApp**: WhatsApp requires production account

Upgrade your account to remove restrictions.

---

## Compliance

### A2P 10DLC (US SMS)

For production SMS to US numbers:

- Register your brand and campaign
- Required for application-to-person messaging
- See: [A2P 10DLC Registration](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc)

### Toll-Free Verification

For toll-free numbers to US/Canada:

- Complete toll-free verification
- See: [Toll-Free Verification](https://www.twilio.com/docs/messaging/compliance/toll-free)

### Voice Compliance

- Follow TCPA regulations for automated calls
- Include opt-out mechanisms
- Respect Do Not Call lists

---

## Pricing

| Service    | Approximate Cost     |
| ---------- | -------------------- |
| SMS (US)   | ~$0.0079/message     |
| MMS (US)   | ~$0.02/message       |
| Voice (US) | ~$0.014/minute       |
| WhatsApp   | ~$0.005-0.08/message |

Check current pricing: [Twilio Pricing](https://www.twilio.com/pricing)

---

## Error Handling

Common errors are handled with helpful messages:

| Error              | Description                          |
| ------------------ | ------------------------------------ |
| Invalid phone      | Number format incorrect              |
| Unverified (trial) | Number not verified in trial account |
| Opted out          | Recipient opted out of messages      |
| Invalid media      | Media URL not accessible             |
| Unsupported type   | Media type not supported             |

---

## Enabling the Tool

The Twilio tools are in the `twilio` tool group:

```typescript
enabledToolGroups: ["twilio"];
```

Or use the legacy `sms` group name for backwards compatibility:

```typescript
enabledToolGroups: ["sms"];
```
