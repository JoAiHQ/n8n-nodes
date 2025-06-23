import {
    IDataObject,
    IHookFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
    NodeConnectionType,
} from 'n8n-workflow';

export class JoaiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JoAI Trigger',
		name: 'joaiTrigger',
		icon: 'file:joai.svg',
		group: ['trigger'],
		version: 1,
		description: 'Trigger workflows based on JoAI events via webhooks',
		defaults: {
			name: 'JoAI Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'joaiApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				placeholder: 'e.g., 123e4567-e89b-12d3-a456-426614174000',
				description: 'Agent ID to monitor for events',
				default: '',
			},
			{
				displayName: 'Trigger Events',
				name: 'triggerEvents',
				type: 'multiOptions',
				options: [
					{
						name: 'Agent Action',
						value: 'agent.action',
						description: 'Triggered when an agent performs an action',
					},
					{
						name: 'Agent Message',
						value: 'agent.message',
						description: 'Triggered when an agent sends a message',
					},
					{
						name: 'User Message',
						value: 'user.message',
						description: 'Triggered when a user sends a message',
					},
				],
				default: ['agent.action'],
				description: 'Select which JoAI events should trigger this workflow',
			},
			{
				displayName: 'Webhook Name',
				name: 'webhookName',
				type: 'string',
				default: 'n8n Workflow Webhook',
				placeholder: 'My n8n Webhook',
				description: 'Descriptive name for the webhook',
			},
			{
				displayName: 'Additional Filters',
				name: 'additionalFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Room Filter',
						name: 'room',
						type: 'string',
						default: '',
						placeholder: 'e.g., general, support',
						description: 'Only trigger for messages in specific room',
					},
					{
						displayName: 'Message Contains',
						name: 'messageContains',
						type: 'string',
						default: '',
						placeholder: 'keyword or phrase',
						description: 'Only trigger if message contains this text',
					},
					{
						displayName: 'User Email Filter',
						name: 'userEmail',
						type: 'string',
						default: '',
						placeholder: 'user@example.com',
						description: 'Filter by specific user email',
					},
				],
			},
		],
	};

	// Register webhook with JoAI server when workflow is activated
	async webhookStart(this: IHookFunctions): Promise<boolean> {
		const webhookUrl = this.getNodeWebhookUrl('default');
		const agentId = this.getNodeParameter('agentId') as string;
		const triggerEvents = this.getNodeParameter('triggerEvents') as string[];
		const webhookName = this.getNodeParameter('webhookName') as string;

		try {
			// Register webhook with JoAI server using the correct API
			const options = {
				method: 'POST',
				uri: `/agents/${agentId}/webhooks`,
				body: {
					name: webhookName,
					url: webhookUrl,
					triggers: triggerEvents,
					headers: {
						'Content-Type': 'application/json',
					},
					description: 'n8n workflow webhook for JoAI events',
					active: true,
					verifySsl: true,
					timeout: 30,
					maxRetries: 3
				},
				json: true,
			} as any;

			const response = await this.helpers.requestWithAuthentication.call(this, 'joaiApi', options);

			// Store webhook info for cleanup - using workflow instance data
			if (response.data?.id) {
				const workflowData = this.getWorkflowStaticData('node');
				workflowData.webhookId = response.data.id;
				workflowData.agentId = agentId;

				console.log(`✅ JoAI webhook registered: ${response.data.id} for agent ${agentId}`);
				console.log(`📋 Monitoring events: ${triggerEvents.join(', ')}`);
				return true;
			} else {
				console.error('❌ No webhook ID returned from JoAI API');
				return false;
			}

		} catch (error) {
			console.error('❌ Failed to register JoAI webhook:', error);
			return false;
		}
	}

	// Unregister webhook when workflow is deactivated
	async webhookDelete(this: IHookFunctions): Promise<boolean> {
		try {
			const workflowData = this.getWorkflowStaticData('node');
			const webhookId = workflowData.webhookId as string;
			const agentId = workflowData.agentId as string;

			if (webhookId && agentId) {
				const options = {
					method: 'DELETE',
					uri: `/agents/${agentId}/webhooks/${webhookId}`,
					json: true,
				} as any;

				await this.helpers.requestWithAuthentication.call(this, 'joaiApi', options);
				console.log(`✅ JoAI webhook unregistered: ${webhookId}`);

				// Clean up stored data
				delete workflowData.webhookId;
				delete workflowData.agentId;
			}

			return true;
		} catch (error) {
			console.error('❌ Failed to unregister JoAI webhook:', error);
			return false;
		}
	}

	// Handle incoming webhook from JoAI server
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const triggerEvents = this.getNodeParameter('triggerEvents') as string[];
		const additionalFilters = this.getNodeParameter('additionalFilters') as any;

		// Verify this is a valid JoAI webhook payload
		if (!bodyData.event || !bodyData.webhookable || !bodyData.data) {
			console.log('❌ Invalid webhook payload received');
			return {
				noWebhookResponse: true,
			};
		}

		const eventType = bodyData.event as string;
		const webhookableData = bodyData.webhookable as IDataObject;
		const eventData = bodyData.data as IDataObject;

		// Check if this event type should trigger the workflow
		if (!triggerEvents.includes(eventType)) {
			return {
				noWebhookResponse: true,
			};
		}

		// Apply additional filters
		let shouldTrigger = true;

		// Filter by room if specified
		if (additionalFilters.room && eventData.room) {
			shouldTrigger = shouldTrigger && eventData.room === additionalFilters.room;
		}

		// Filter by message content if specified
		if (additionalFilters.messageContains) {
			const messageContent = (eventData.content || eventData.message || '').toString().toLowerCase();
			const filterText = additionalFilters.messageContains.toLowerCase();
			shouldTrigger = shouldTrigger && messageContent.includes(filterText);
		}

		// Filter by user email if specified
		if (additionalFilters.userEmail && eventData.user) {
			const userData = eventData.user as IDataObject;
			shouldTrigger = shouldTrigger && userData.email === additionalFilters.userEmail;
		}

		if (!shouldTrigger) {
			return {
				noWebhookResponse: true,
			};
		}

		// Return structured webhook data to the workflow
		const returnData: INodeExecutionData[] = [
			{
				json: {
					// Main event info
					event: eventType,
					timestamp: bodyData.timestamp,

					// Agent/webhookable info
					agent: {
						type: webhookableData.type,
						uuid: webhookableData.uuid,
						name: webhookableData.name,
						description: webhookableData.description,
					},

					// Webhook info
					webhook: bodyData.webhook,

					// Event-specific data
					data: eventData,

					// Convenience fields for easy access
					...(eventData.messageId && { messageId: eventData.messageId }),
					...(eventData.content && { content: eventData.content }),
					...(eventData.message && { message: eventData.message }),
					...(eventData.sender && { sender: eventData.sender }),
					...(eventData.room && { room: eventData.room }),
					...(eventData.user && { user: eventData.user }),
				},
			},
		];

		return {
			workflowData: [returnData],
		};
	}
}
