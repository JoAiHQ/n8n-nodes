import type {
    IDataObject,
    IHookFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    IWebhookFunctions,
    IWebhookResponseData,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType } from 'n8n-workflow';

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
				description: '**This trigger automatically manages webhooks!**\n\n✅ **Activate** this workflow to create webhooks in JoAi\n\n✅ **Deactivate** to automatically remove webhooks\n\n✅ **Environment changes** automatically handled - old webhooks cleaned up when URLs change\n\n✅ **No manual configuration needed** - just provide your Agent ID and select trigger type',
			},
		],
	};



	webhookMethods = {
		default: {
					async checkExists(this: IHookFunctions): Promise<boolean> {
			try {
				const agentId = getAgentId.call(this);
				const webhookUrl = this.getNodeWebhookUrl('default');
				const workflowId = this.getWorkflow().id;
				const nodeId = this.getNode().id;
				const triggerType = this.getNodeParameter('triggerType') as string;

				this.logger?.info('🔍 Checking if webhook exists', {
					agentId,
					webhookUrl,
					workflowId,
					nodeId
				});

				const response = await apiRequest.call(this, 'GET', `/agents/${agentId}/webhooks`);
				const existingWebhooks = response.data || [];

				const exactMatch = existingWebhooks.find((webhook: any) => webhook.url === webhookUrl);

				if (exactMatch) {
					this.logger?.info('✅ Exact webhook URL match found', {
						webhookId: exactMatch.id,
						webhookUrl: exactMatch.url
					});
					return true;
				}

				const n8nWebhooks = existingWebhooks.filter((webhook: any) =>
					webhook.name === 'N8N Webhook' &&
					webhook.trigger === triggerType &&
					webhook.headers &&
					webhook.headers['X-JoAi-Secret-Token'] === `joai_${workflowId}_${nodeId}`
				);

				if (n8nWebhooks.length > 0) {
					this.logger?.info('🔄 Found outdated n8n webhooks with different URLs', {
						count: n8nWebhooks.length,
						currentUrl: webhookUrl,
						outdatedUrls: n8nWebhooks.map((w: any) => w.url)
					});

					for (const webhook of n8nWebhooks) {
						this.logger?.info('🗑️ Removing outdated webhook', {
							webhookId: webhook.id,
							oldUrl: webhook.url
						});
						await apiRequest.call(this, 'DELETE', `/agents/${agentId}/webhooks/${webhook.id}`);
					}

					this.logger?.info('✅ Outdated webhooks cleaned up, will create new one');
					return false;
				}

				this.logger?.info('✅ No matching webhook found', {
					existingCount: existingWebhooks.length,
					targetUrl: webhookUrl
				});

				return false;
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
				throw new NodeApiError(this.getNode(), error);
			}
		},

					async delete(this: IHookFunctions): Promise<boolean> {
			try {
				const agentId = getAgentId.call(this);
				const webhookUrl = this.getNodeWebhookUrl('default');
				const workflowId = this.getWorkflow().id;
				const nodeId = this.getNode().id;
				const triggerType = this.getNodeParameter('triggerType') as string;

				this.logger?.info('🔍 Deleting webhooks', {
					agentId,
					webhookUrl,
					workflowId,
					nodeId
				});

				const response = await apiRequest.call(this, 'GET', `/agents/${agentId}/webhooks`);
				const existingWebhooks = response.data || [];

				let deletedCount = 0;

				for (const webhook of existingWebhooks) {
					const shouldDelete =
						webhook.url === webhookUrl ||
						(webhook.name === 'N8N Webhook' &&
						 webhook.trigger === triggerType &&
						 webhook.headers &&
						 webhook.headers['X-JoAi-Secret-Token'] === `joai_${workflowId}_${nodeId}`);

					if (shouldDelete) {
						this.logger?.info('🗑️ Deleting webhook', {
							webhookId: webhook.id,
							webhookUrl: webhook.url,
							reason: webhook.url === webhookUrl ? 'exact_url_match' : 'workflow_node_match'
						});
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
			if (expectedSecret !== String(receivedSecret)) {
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
