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
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send a message as an agent',
						action: 'Send a message as an agent',
					},
				],
				default: 'sendMessage',
			},

			// Agent message parameters
			{
				displayName: 'Agent ID',
				name: 'agentId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'e.g. 07f3169e-e7f0-4394-8e7b-5446e8e1fcb6',
				description: 'Agent UUID to send the message as',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
			},
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
						operation: ['sendMessage'],
					},
				},
			},
			{
				displayName: 'Room',
				name: 'room',
				type: 'string',
				default: '',
				placeholder: 'room_id or conversation_id',
				description: 'Optional room or conversation ID. If not provided, agent will use default room.',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				options: [
					{
						displayName: 'Message Type',
						name: 'messageType',
						type: 'options',
						options: [
							{
								name: 'Text',
								value: 'text',
							},
							{
								name: 'System',
								value: 'system',
							},
							{
								name: 'Error',
								value: 'error',
							},
						],
						default: 'text',
						description: 'Type of message to send',
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'property',
								displayName: 'Property',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the property',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value to set',
									},
								],
							},
						],
						description: 'Additional metadata to include with the message',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'sendMessage') {
					const result = await handleAgentSendMessage.call(this, i);
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

async function handleAgentSendMessage(this: IExecuteFunctions, itemIndex: number) {
	const agentId = this.getNodeParameter('agentId', itemIndex) as string;
	const message = this.getNodeParameter('message', itemIndex) as string;
	const room = this.getNodeParameter('room', itemIndex, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', itemIndex, {}) as any;

	const body: any = {
		message: message,
		type: additionalFields.messageType || 'text',
	};

	if (room) {
		body.room = room;
	}

	if (additionalFields.metadata?.property?.length > 0) {
		body.metadata = {};
		additionalFields.metadata.property.forEach((prop: any) => {
			if (prop.name && prop.value) {
				body.metadata[prop.name] = prop.value;
			}
		});
	}

	const response = await apiRequest.call(this, 'POST', `/agents/${agentId}/execute`, body);
	return response.data || response;
}
