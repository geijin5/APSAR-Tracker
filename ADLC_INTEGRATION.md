# ADLC Emergency App Integration

This document describes how to integrate the ADLC Emergency app with the APSAR Tracker to receive messages from dispatch, fire, EMS, and police.

## Overview

The integration allows external emergency services (dispatch, fire, EMS, police) to send messages through the ADLC Emergency app, which will appear in the APSAR Tracker chat system. Messages are automatically routed to the configured SAR group (default: callout group).

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file or deployment configuration:

```env
# ADLC Integration Configuration
ADLC_WEBHOOK_SECRET=your-secure-secret-key-here
ADLC_TARGET_GROUP=callout
ADLC_USE_SIGNATURE=false
```

- `ADLC_WEBHOOK_SECRET`: A secure secret key for authenticating webhook requests from ADLC
- `ADLC_TARGET_GROUP`: Which SAR group to send messages to (options: `main`, `parade`, `training`, `callout`)
- `ADLC_USE_SIGNATURE`: Set to `true` if ADLC provides HMAC signature authentication

### 2. Webhook Endpoint

The webhook endpoint is available at:
```
POST /api/adlc/webhook
```

### 3. ADLC Configuration

In the ADLC Emergency app, configure the webhook URL to point to your APSAR Tracker instance:
```
https://your-domain.com/api/adlc/webhook
```

Set the authentication method:
- **API Key**: Include `X-API-Key` header with the value from `ADLC_WEBHOOK_SECRET`
- **Bearer Token**: Include `Authorization: Bearer <ADLC_WEBHOOK_SECRET>` header
- **Signature** (if enabled): ADLC should send `X-ADLC-Signature` header with HMAC-SHA256 signature

## Message Format

ADLC should send POST requests with the following JSON structure:

```json
{
  "message": "Search and rescue needed at location X",
  "sender": "Dispatch",
  "senderName": "Anaconda Dispatch",
  "senderId": "dispatch-001",
  "source": "dispatch",
  "department": "Dispatch",
  "timestamp": "2024-01-15T10:30:00Z",
  "attachments": [
    {
      "name": "location_map.jpg",
      "url": "https://example.com/maps/location.jpg",
      "type": "image/jpeg"
    }
  ],
  "metadata": {
    "incidentId": "INC-12345",
    "priority": "high"
  }
}
```

### Field Descriptions

- `message` / `content` / `text`: The message content (required)
- `sender` / `senderName`: Name of the sender (e.g., "Anaconda Dispatch")
- `senderId`: Unique identifier for the sender
- `source`: Source type - `dispatch`, `fire`, `ems`, `police`, or `adlc`
- `department`: Department name
- `timestamp`: ISO 8601 timestamp of when message was sent
- `attachments`: Array of attachment objects (optional)
- `metadata`: Additional metadata (optional)

## Testing

### Test Endpoint

You can test the integration using the test endpoint:

```bash
POST /api/adlc/test
Content-Type: application/json

{
  "message": "Test message from ADLC",
  "source": "dispatch",
  "senderName": "Test Dispatch"
}
```

### Status Endpoint

Check integration status:

```bash
GET /api/adlc/status
```

Returns:
- Integration enabled status
- Target group configuration
- Recent external messages
- Webhook URL

## Message Display

External messages appear in the configured SAR group chat with:
- **Badge**: Color-coded badge showing the source (dispatch=blue, fire=red, EMS=green, police=indigo)
- **Indicator**: "📡 External Message" header
- **Styling**: Orange border to distinguish from internal messages
- **Sender Name**: Shows the external sender name (e.g., "Anaconda Dispatch")

## Security

1. **Webhook Secret**: Always use a strong, unique secret key
2. **HTTPS**: Always use HTTPS for webhook endpoints
3. **IP Whitelisting**: Consider adding IP whitelisting for ADLC servers
4. **Rate Limiting**: Webhook endpoint should have rate limiting enabled

## Troubleshooting

### Messages Not Appearing

1. Check webhook authentication - verify `ADLC_WEBHOOK_SECRET` matches
2. Check target group exists - ensure the group type exists in the database
3. Check server logs for errors
4. Use `/api/adlc/status` to see recent messages

### Authentication Issues

- Verify the API key/secret matches in both systems
- Check request headers are being sent correctly
- If using signature, ensure ADLC is calculating HMAC-SHA256 correctly

### Message Format Issues

- Ensure required fields (`message` or `content`) are present
- Check JSON format is valid
- Verify timestamp format if provided

## Support

For issues or questions about the ADLC integration, check:
1. Server logs for detailed error messages
2. `/api/adlc/status` endpoint for integration health
3. Database for message records (check `isExternal: true` in messages collection)

