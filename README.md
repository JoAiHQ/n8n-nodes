# @joai/n8n-nodes-joai

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

This is an n8n community node that provides integration with JoAi (AI Agent Platform). It allows you to send messages as AI agents and receive real-time webhooks for agent events.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Install using npm:
```bash
npm install @joai/n8n-nodes-joai
```

Or via n8n's community nodes interface:
1. Go to Settings > Community Nodes
2. Install package: `@joai/n8n-nodes-joai`

## Operations

### JoAi Node
- **Send Message**: Send a message as a JoAi agent to a specific room

### JoAi Trigger
- **Webhook Events**: Receive real-time events from JoAi agents
  - Agent Actions
  - Agent Messages
  - User Messages

## Credentials

This node requires JoAi API credentials. You need:

1. **API Key**: Your JoAi API authentication key
2. **Base URL**: The base URL for your JoAi API instance (e.g., `https://api.joai.ai`)

### Setting up credentials

1. In n8n, go to **Settings > Credentials**.
2. Select **Create New**.
3. Search for **JoAi API** and select it.
4. Enter your **API Key** and **Base URL**.
5. Click **Save**.

## Compatibility

- Minimum n8n version: 0.198.0
- Tested with n8n version: 1.99.1

## Usage

### Basic Message Sending

1. Add a **JoAi** node to your workflow
2. Select **Send Message** operation
3. Choose your JoAi credentials
4. Configure the message parameters:
   - **Agent ID**: The UUID of the agent that will send the message
   - **Message**: The content to send
   - **Room** (optional): Room ID to send to
   - **Additional Fields** (optional): Message type and metadata
5. Execute the workflow

### Setting up Webhooks (Automatic)

1. Add a **JoAi Trigger** node to your workflow
2. Configure your **JoAi API credentials** (API Key and Base URL)
3. Enter the **Agent ID** you want to receive webhooks from
4. Select the **event types** you want to trigger on (Agent Action, Agent Message, User Message)
5. **Activate the workflow** - webhooks are automatically created in JoAi!
6. **Test** by triggering an event in JoAi

The trigger will automatically:
- ✅ Create webhooks in JoAi when you activate the workflow
- ✅ Delete webhooks when you deactivate the workflow
- ✅ Pass all webhook data to the next node in your workflow

No manual webhook configuration needed!

### Example Workflow

Here's a simple workflow that logs webhook data:

1. **JoAi Trigger** - Receives webhook from JoAi
2. **Code Node** - Processes the webhook data:
   ```javascript
   // All webhook data is available in $input.item.json
   const webhookData = $input.item.json;

   return {
     json: {
       event: webhookData.event,
       data: webhookData.data,
       receivedAt: new Date().toISOString()
     }
   };
   ```
3. **Add other nodes** as needed for your specific use case

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [JoAi API Documentation](https://docs.joai.ai)
- [GitHub Repository](https://github.com/JoAiHQ/n8n-nodes)

## Version history

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/JoAiHQ/n8n-nodes/issues)
2. Create a new issue if your problem isn't already reported
3. Provide as much detail as possible including n8n version, node version, and error messages

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
