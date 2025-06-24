import crypto from 'crypto';
import type {
    IDataObject,
    IHookFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import { apiRequest, getAgentId, getSecretToken } from './GenericFunctions';

export class JoaiTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JoAi Trigger',
		name: 'joaiTrigger',
		icon: 'file:joai.svg',
		group: ['trigger'],
		version: 1,
		description: 'Receive webhooks from JoAi agents automatically',
		defaults: {
			name: 'JoAi Trigger',
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
				default: '',
				placeholder: 'e.g. 07f3169e-e7f0-4394-8e7b-5446e8e1fcb6',
				description: 'Agent UUID to receive webhooks from',
			},
			{
				displayName: 'Trigger On',
				name: 'triggerType',
				type: 'options',
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
				required: true,
				default: 'agent.message',
				description: 'Select the type of JoAi event to receive',
			},

			{
				displayName: '🎉 Automatic Webhook Management',
				name: 'info',
				type: 'notice',
				default: '',
				typeOptions: {
					theme: 'success',
				},
				description: '**This trigger automatically manages webhooks!**\n\n✅ **Activate** this workflow to create webhooks in JoAi\n\n✅ **Deactivate** to automatically remove webhooks\n\n✅ **No manual configuration needed** - just provide your Agent ID and select trigger type',
			},
		],
	};



	webhookMethods = {
		default: {
					async checkExists(this: IHookFunctions): Promise<boolean> {
			try {
				const agentId = getAgentId.call(this);
				const webhookUrl = this.getNodeWebhookUrl('default');

				this.logger?.info('🔍 Checking if webhook exists', {
					agentId,
					webhookUrl
				});

				const response = await apiRequest.call(this, 'GET', `/agents/${agentId}/webhooks`);
				const existingWebhooks = response.data || [];

				const exists = existingWebhooks.some((webhook: any) => webhook.url === webhookUrl);

				this.logger?.info('✅ Webhook check result', {
					exists,
					existingCount: existingWebhooks.length,
					targetUrl: webhookUrl
				});

				return exists;
			} catch (error: any) {
				this.logger?.error('❌ Webhook check failed', {
					error: error.message,
					agentId: this.getNodeParameter('agentId')
				});
				return false;
			}
		},

					async create(this: IHookFunctions): Promise<boolean> {
			try {
				const agentId = getAgentId.call(this);
				const webhookUrl = this.getNodeWebhookUrl('default');
				const triggerType = this.getNodeParameter('triggerType') as string;
				const secretToken = getSecretToken.call(this);

				this.logger?.info('🔍 Creating webhook', {
					agentId,
					webhookUrl,
					triggerType,
					hasSecretToken: !!secretToken
				});

				const body: IDataObject = {
					name: 'N8N Webhook',
					url: webhookUrl,
					trigger: triggerType,
					active: true,
					headers: {
						'X-JoAi-Secret-Token': secretToken,
					},
					description: 'Webhook for n8n workflow automation',
					verifySsl: true,
					timeout: 30,
					maxRetries: 3,
				};

				const response = await apiRequest.call(this, 'POST', `/agents/${agentId}/webhooks`, body);

				this.logger?.info('✅ Webhook created successfully', {
					agentId,
					responseReceived: !!response
				});

				return true;
			} catch (error: any) {
				this.logger?.error('❌ Webhook creation failed', {
					error: error.message,
					agentId: this.getNodeParameter('agentId'),
					triggerType: this.getNodeParameter('triggerType')
				});
				throw new Error(`Failed to create webhook: ${error.message}`);
			}
		},

					async delete(this: IHookFunctions): Promise<boolean> {
			try {
				const agentId = getAgentId.call(this);
				const webhookUrl = this.getNodeWebhookUrl('default');

				this.logger?.info('🔍 Deleting webhook', {
					agentId,
					webhookUrl
				});


				const response = await apiRequest.call(this, 'GET', `/agents/${agentId}/webhooks`);
				const existingWebhooks = response.data || [];


				let deletedCount = 0;
				for (const webhook of existingWebhooks) {
					if (webhook.url === webhookUrl) {
						await apiRequest.call(this, 'DELETE', `/agents/${agentId}/webhooks/${webhook.id}`);
						deletedCount++;
					}
				}

				this.logger?.info('✅ Webhook deletion completed', {
					agentId,
					deletedCount,
					totalWebhooks: existingWebhooks.length
				});

				return true;
			} catch (error: any) {
				this.logger?.warn('⚠️ Failed to delete webhook', {
					error: error.message,
					agentId: this.getNodeParameter('agentId')
				});
				return false;
			}
		},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData() as IDataObject;
		const headerData = this.getHeaderData();


		const workflowId = this.getWorkflow().id;
		const nodeId = this.getNode().id;
		const expectedSecret = `joai_${workflowId}_${nodeId}`;
		const receivedSecret = headerData['x-joai-secret-token'];

		if (expectedSecret && receivedSecret) {
			const expectedBuffer = Buffer.from(expectedSecret);
			const receivedBuffer = Buffer.from(String(receivedSecret));

			if (
				expectedBuffer.byteLength !== receivedBuffer.byteLength ||
				!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
			) {
				const res = this.getResponseObject();
				res.status(403).json({ message: 'Invalid webhook secret' });
				return {
					noWebhookResponse: true,
				};
			}
		}

		const returnData: INodeExecutionData[] = [
			{
				json: bodyData,
			},
		];

		return {
			workflowData: [returnData],
		};
	}
}
