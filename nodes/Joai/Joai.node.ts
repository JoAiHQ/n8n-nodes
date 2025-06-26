import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeConnectionType
} from 'n8n-workflow';
import { apiRequest } from './GenericFunctions';

export class Joai implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JoAi',
		name: 'joai',
		icon: 'file:joai.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send messages as a JoAi agent',
		defaults: {
			name: 'JoAi',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'joaiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: false,
				options: [
					{
						name: 'Send Message as User',
						value: 'sendMessageAsUser',
						description: 'Send a message as a user to an agent',
						action: 'Send a message as a user to an agent',
					},
					{
						name: 'Send Message as Agent',
						value: 'sendMessageAsAgent',
						description: 'Send a message as an agent to a room',
						action: 'Send a message as an agent to a room',
					},
				],
				default: 'sendMessageAsUser',
			},

			// Agent ID parameter (shared by both operations)
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. 07f3169e-e7f0-4394-8e7b-5446e8e1fcb6',
				description: 'Agent UUID to send the message to/as',
				displayOptions: {
					show: {
						operation: ['sendMessageAsUser', 'sendMessageAsAgent'],
					},
				},
			},

			// Message parameter (shared by both operations)
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				default: '',
				placeholder: 'Hello! How can I help you today?',
				description: 'The message content to send',
				displayOptions: {
					show: {
						operation: ['sendMessageAsUser', 'sendMessageAsAgent'],
					},
				},
			},

			// Room parameter (shared by both operations)
			{
				displayName: 'Room',
				name: 'room',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'room_id',
				description: 'Room ID to send the message to',
				displayOptions: {
					show: {
						operation: ['sendMessageAsUser', 'sendMessageAsAgent'],
					},
				},
			},


		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'sendMessageAsUser') {
					const result = await handleSendMessageAsUser.call(this, i);
					returnData.push({ json: result });
				} else if (operation === 'sendMessageAsAgent') {
					const result = await handleSendMessageAsAgent.call(this, i);
					returnData.push({ json: result });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error instanceof Error ? error.message : 'Unknown error' } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}

async function handleSendMessageAsUser(this: IExecuteFunctions, itemIndex: number) {
	const agentId = this.getNodeParameter('agentId', itemIndex) as string;
	const message = this.getNodeParameter('message', itemIndex) as string;
	const room = this.getNodeParameter('room', itemIndex) as string;

	const body = {
		message: message,
		room: room,
	};

	const response = await apiRequest.call(this, 'POST', `/agents/${agentId}/execute`, body);
	return response.data || response;
}

async function handleSendMessageAsAgent(this: IExecuteFunctions, itemIndex: number) {
	const agentId = this.getNodeParameter('agentId', itemIndex) as string;
	const message = this.getNodeParameter('message', itemIndex) as string;
	const room = this.getNodeParameter('room', itemIndex, '') as string;

	const body = {
		message: message,
		room: room,
	};

	const response = await apiRequest.call(this, 'POST', `/agents/${agentId}/execute/as-agent`, body);
	return response.data || response;
}
