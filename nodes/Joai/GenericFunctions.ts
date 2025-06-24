import type {
    IDataObject,
    IExecuteFunctions,
    IHookFunctions,
    IHttpRequestMethods,
    ILoadOptionsFunctions,
    IRequestOptions,
} from 'n8n-workflow';

export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('joaiApi');
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

	const options: IRequestOptions = {
		method,
		url: `${credentials.baseUrl}${normalizedEndpoint}`,
		body,
		qs,
		json: true,
		headers: {
			'Authorization': `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
	};


	this.logger?.info('🔍 JoAi API Request', {
		method,
		url: options.url,
		endpoint,
		baseUrl: credentials.baseUrl,
		hasBody: Object.keys(body).length > 0,
		bodyKeys: Object.keys(body)
	});

	try {
		const response = await this.helpers.request(options);
		this.logger?.info('✅ JoAi API Response received', {
			hasData: !!response,
			responseType: typeof response,
			dataKeys: response && typeof response === 'object' ? Object.keys(response) : []
		});
		return response;
	} catch (error: any) {
		this.logger?.error('❌ JoAi API Error', {
			message: error.message,
			status: error.httpCode || error.statusCode,
			url: options.url,
			method,
			errorType: error.name || 'Unknown'
		});


		const errorMessage = `JoAi API ${method} ${options.url} failed: ${error.message}`;
		throw new Error(errorMessage);
	}
}


export async function getWebhookEvents(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
): Promise<IDataObject> {
	try {
		const response = await apiRequest.call(this, 'GET', '/webhooks/events');
		return response.data?.events || {
			'agent.action': { value: 'agent.action', label: 'Agent Action' },
			'agent.message': { value: 'agent.message', label: 'Agent Message' },
			'user.message': { value: 'user.message', label: 'User Message' },
		};
	} catch (error) {

		return {
			'agent.action': { value: 'agent.action', label: 'Agent Action' },
			'agent.message': { value: 'agent.message', label: 'Agent Message' },
			'user.message': { value: 'user.message', label: 'User Message' },
		};
	}
}


export function getAgentId(
	this: IHookFunctions,
): string {
	const agentId = this.getNodeParameter('agentId') as string;

	if (!agentId) {
		throw new Error('Agent ID is required');
	}

	return agentId;
}


export function getSecretToken(this: IHookFunctions): string {
	const workflowId = this.getWorkflow().id;
	const nodeId = this.getNode().id;
	return `joai_${workflowId}_${nodeId}`;
}


export function getWebhookSecretToken(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions): string {
	const workflowId = this.getWorkflow().id;
	const nodeId = this.getNode().id;
	return `joai_${workflowId}_${nodeId}`;
}
