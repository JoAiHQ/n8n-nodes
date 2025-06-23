# n8n-nodes-joai

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

This is an n8n community node that provides integration with JoAI (AI Agent Platform). It allows you to automate AI agent interactions and receive real-time webhooks for agent events.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Node Installation

1. Go to **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-joai` in **Enter npm package name**.
4. Agree to the [risks](https://docs.n8n.io/integrations/community-nodes/risks/) of using community nodes: select **I understand the risks of installing unverified code from a public source**.
5. Select **Install**.

After installing the node, you can use it like any other node in n8n.

## Operations

### JoAI Node
- **Send Message**: Send a message to a JoAI agent
- **Get Agent Info**: Retrieve information about a specific agent
- **List Agents**: Get a list of all available agents

### JoAI Trigger
- **Webhook Events**: Receive real-time events from JoAI agents
  - Agent Actions
  - Agent Messages
  - User Messages

## Credentials

This node requires JoAI API credentials. You need:

1. **API Key**: Your JoAI API authentication key
2. **Base URL**: The base URL for your JoAI API instance (e.g., `https://api.joai.com`)

### Setting up credentials

1. In n8n, go to **Settings > Credentials**.
2. Select **Create New**.
3. Search for **JoAI API** and select it.
4. Enter your **API Key** and **Base URL**.
5. Click **Save**.

## Compatibility

- Minimum n8n version: 0.198.0
- Tested with n8n version: 1.99.1

## Usage

### Basic Message Sending

1. Add a **JoAI** node to your workflow
2. Select **Send Message** operation
3. Choose your JoAI credentials
4. Enter the Agent ID and your message
5. Execute the workflow

### Setting up Webhooks

1. Add a **JoAI Trigger** node to your workflow
2. Configure your JoAI credentials
3. Enter the Agent ID you want to monitor
4. Select the event types you want to trigger on:
   - `agent.action` - When the agent performs an action
   - `agent.message` - When the agent sends a message
   - `user.message` - When a user sends a message
5. Optionally add filters for room, message content, or user email
6. Activate the workflow

The trigger will automatically register a webhook with your JoAI instance and start receiving real-time events.

### Example Workflow

Here's a simple workflow that responds to user messages:

```json
{
  "nodes": [
    {
      "name": "JoAI Trigger",
      "type": "n8n-nodes-joai.joaiTrigger",
      "parameters": {
        "agentId": "your-agent-uuid",
        "triggerEvents": ["user.message"]
      }
    },
    {
      "name": "Process Message",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "return [{ json: { response: `Hello! You said: ${$json.content}` } }];"
      }
    },
    {
      "name": "Send Response",
      "type": "n8n-nodes-joai.joai",
      "parameters": {
        "operation": "sendMessage",
        "agentId": "your-agent-uuid",
        "message": "={{$json.response}}"
      }
    }
  ]
}
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [JoAI API Documentation](https://docs.joai.com)
- [GitHub Repository](https://github.com/JoAiHQ/n8n-nodes-joai)

## Version history

### 0.1.0
- Initial release
- Basic JoAI integration with message sending
- Webhook trigger support for real-time events
- Support for agent actions, agent messages, and user messages
- Filtering capabilities for room, message content, and user email

## Support

If you encounter any issues or have questions:

1. Check the [GitHub Issues](https://github.com/JoAiHQ/n8n-nodes-joai/issues)
2. Create a new issue if your problem isn't already reported
3. Provide as much detail as possible including n8n version, node version, and error messages

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
