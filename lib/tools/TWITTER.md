# Twitter Integration for AgentInc

Complete Twitter/X API integration with OAuth 2.0 authentication for AI agents.

## Features

✅ **OAuth 2.0 Authentication** - Secure user authentication with PKCE flow
✅ **Tweet Management** - Post, delete, read tweets with media support
✅ **Engagement** - Like, retweet, bookmark functionality
✅ **Timeline & Search** - Access home timeline and search tweets
✅ **User Profiles** - Get profile info, follow/unfollow users
✅ **Direct Messages** - Send DMs to users
✅ **Lists** - Create and manage Twitter lists
✅ **Media Upload** - Upload images and videos to tweets

## Setup

### 1. Twitter Developer Account

1. Go to [X Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Enable OAuth 2.0 in app settings
4. Set callback URL: `http://localhost:3000/api/twitter/oauth/callback` (or your production URL)
5. Add required OAuth 2.0 scopes:
   - `tweet.read` - Read tweets
   - `tweet.write` - Post tweets
   - `users.read` - Read user profiles
   - `follows.read` - Read followers/following
   - `follows.write` - Follow/unfollow users
   - `offline.access` - Refresh token support
   - `like.read` - Read likes
   - `like.write` - Like tweets
   - `bookmark.read` - Read bookmarks
   - `bookmark.write` - Bookmark tweets
   - `dm.read` - Read DMs
   - `dm.write` - Send DMs
   - `list.read` - Read lists
   - `list.write` - Manage lists

### 2. Environment Variables

Add the following Twitter OAuth 2.0 credentials to your `.env.local`:

```env
# Twitter/X OAuth 2.0 credentials
# Get these from https://developer.x.com/en/portal/dashboard
# Go to your App > Settings > Keys and tokens > OAuth 2.0 Client ID and Client Secret
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret

# App URL (used for OAuth callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Or your production URL
```

**Important**: These are OAuth 2.0 credentials, not the legacy API Key/Secret. In the X Developer Portal:

- **Client ID** is under "OAuth 2.0 Client ID"
- **Client Secret** is under "OAuth 2.0 Client Secret"

### 3. Database Schema

The database schema has been updated to store Twitter OAuth tokens:

- `twitterAccessToken` - OAuth access token (encrypted)
- `twitterRefreshToken` - OAuth refresh token (encrypted)
- `twitterTokenExpiresAt` - Token expiration timestamp
- `twitterUserId` - Twitter user ID
- `twitterUsername` - Twitter username
- `twitterConnectedAt` - Connection timestamp

## Usage

### For Users

1. **Connect Twitter Account**:
   - Open chat interface
   - Open Tools panel (right sidebar)
   - Find "Twitter/X" tool group
   - Click expand to show functions
   - Click "Connect Twitter" button
   - Authorize the app on Twitter
   - You'll be redirected back with account connected

2. **Use Twitter Features**:
   Once connected, agents can use Twitter features like:
   - "Post a tweet saying Hello World"
   - "Search for tweets about AI"
   - "Get my latest followers"
   - "Like this tweet: [tweet_id]"
   - "Send a DM to @username"

### For Developers

#### API Routes

**OAuth Flow:**

- `GET /api/twitter/oauth/authorize?userId={userId}` - Start OAuth flow
- `GET /api/twitter/oauth/callback` - OAuth callback handler
- `GET /api/twitter/oauth/status` - Check connection status
- `POST /api/twitter/oauth/disconnect` - Disconnect Twitter account

#### Using Twitter Tools in Chat API

The Twitter tools need to be initialized with the user's access token. Example integration in your chat API:

```typescript
import { createTwitterTools } from "@/lib/tools/twitter";
import { prisma } from "@/lib/prisma";

// In your chat API route
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { twitterAccessToken: true },
});

let tools = { ...otherTools };

// Add Twitter tools if user has connected their account
if (user?.twitterAccessToken) {
  const twitterTools = createTwitterTools(user.twitterAccessToken);
  tools = { ...tools, ...twitterTools };
}

// Use tools in streamText
const result = await streamText({
  model: anthropic("claude-3-5-sonnet-20241022"),
  messages,
  tools,
});
```

## Available Twitter Tools

### Tweet Management

- **postTweet** - Post a new tweet with optional media, reply, or quote
- **deleteTweet** - Delete one of your tweets
- **getTweet** - Get details about a specific tweet

### Engagement

- **likeTweet** - Like a tweet
- **unlikeTweet** - Unlike a tweet
- **retweet** - Retweet a tweet
- **unretweet** - Remove a retweet
- **bookmarkTweet** - Bookmark a tweet
- **removeBookmark** - Remove a bookmark

### Timeline & Search

- **getHomeTimeline** - Get tweets from home timeline
- **searchTweets** - Search for tweets with advanced operators

### User Profiles

- **getUserProfile** - Get a user's profile information
- **getMyProfile** - Get authenticated user's profile
- **followUser** - Follow a Twitter user
- **unfollowUser** - Unfollow a Twitter user
- **getFollowers** - Get list of followers
- **getFollowing** - Get list of following

### Media

- **uploadMedia** - Upload images/videos for tweets

### Direct Messages

- **sendDirectMessage** - Send a DM to a user

### Lists

- **createList** - Create a new Twitter list
- **addToList** - Add a user to a list

## Security

- OAuth tokens are stored encrypted in the database
- PKCE flow for enhanced security
- State parameter for CSRF protection
- HTTP-only cookies for OAuth session
- Secure token refresh mechanism

## Error Handling

All Twitter tools return structured responses:

**Success:**

```json
{
  "success": true,
  "data": {...}
}
```

**Error:**

```json
{
  "error": "Error message",
  "details": {...}
}
```

## Troubleshooting

1. **"Twitter not connected" error**
   - User needs to connect their Twitter account first
   - Check OAuth button is visible in Tools panel

2. **OAuth callback fails**
   - Verify callback URL matches in Twitter Developer Portal
   - Check TWITTER_API_KEY and TWITTER_API_SECRET are correct

3. **Rate limits**
   - Twitter has rate limits per endpoint
   - Implement caching and rate limit handling as needed

4. **Token expiration**
   - Implement token refresh logic using `twitterRefreshToken`
   - Check `twitterTokenExpiresAt` before making API calls

## Example Conversations

**User:** "Post a tweet about my new AI project"
**Agent:** _Uses postTweet tool to publish the tweet and returns the URL_

**User:** "Search for tweets about #AI"
**Agent:** _Uses searchTweets to find relevant tweets and summarizes them_

**User:** "Who are my recent followers?"
**Agent:** _Uses getFollowers to retrieve and display recent followers_

## Contributing

When adding new Twitter features:

1. Add the tool in `lib/tools/twitter.ts` using the `createTwitterTools` factory
2. Update the TOOL_GROUPS in `lib/tools/index.ts` to include the new function
3. Test OAuth flow and token management
4. Update this README with the new feature

## License

MIT License - See LICENSE file for details
