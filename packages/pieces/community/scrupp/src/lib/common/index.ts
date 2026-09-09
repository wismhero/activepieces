import {
	AuthenticationType,
	httpClient,
	HttpError,
	HttpMethod,
} from '@activepieces/pieces-common';
import { AppConnectionValueForAuthProperty, Property } from '@activepieces/pieces-framework';
import { scruppAuth } from '../auth';

export const BASE_URL = 'https://api.scrupp.com/api/v1';

export type ScruppAuth = AppConnectionValueForAuthProperty<typeof scruppAuth>;

export type JobType =
	| 'sales_navigator.search'
	| 'linkedin.search'
	| 'apollo.search'
	| 'linkedin.profile'
	| 'company.linkedin'
	| 'company.domain'
	| 'company.name'
	| 'contact.decision_maker.linkedin'
	| 'contact.decision_maker.name'
	| 'contact.decision_maker.domain'
	| 'email.initials'
	| 'email.linkedin';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function call<T>(
	apiKey: string,
	method: HttpMethod,
	path: string,
	body?: unknown,
	headers?: Record<string, string>,
): Promise<T> {
	const response = await httpClient.sendRequest<T>({
		method,
		url: `${BASE_URL}${path}`,
		authentication: { type: AuthenticationType.BEARER_TOKEN, token: apiKey },
		headers,
		body,
	});

	return response.body;
}

/**
 * Shared by every action: create the job, wait for it, hand back the records.
 *
 * The wait honours the `retry_after` the API returns rather than a fixed
 * interval — a 2,500-record search and a three-address email lookup have very
 * different rhythms, and guessing costs either minutes or rate limit.
 */
export async function runJob(params: {
	auth: ScruppAuth;
	type: JobType;
	input: Record<string, unknown>;
	/** Stable across retries so a re-run returns the original job instead of paying twice. */
	idempotencyKey: string;
	waitForResult: boolean;
	timeoutMinutes: number;
}): Promise<unknown[]> {
	const apiKey = params.auth.secret_text;

	const created = await call<{ job_id: number }>(
		apiKey,
		HttpMethod.POST,
		'/jobs',
		{ type: params.type, input: params.input },
		{ 'Idempotency-Key': params.idempotencyKey },
	);

	if (!params.waitForResult) {
		return [created];
	}

	const deadline = Date.now() + params.timeoutMinutes * 60_000;
	let status = 'queued';

	while (Date.now() < deadline) {
		const state = await call<{ status: string; retry_after?: number; error?: string }>(
			apiKey,
			HttpMethod.GET,
			`/jobs/${created.job_id}`,
		);
		status = state.status;

		if (status === 'failed') {
			throw new Error(`Scrupp job ${created.job_id} failed: ${state.error ?? 'unknown error'}`);
		}
		if (status === 'succeeded') {
			break;
		}

		await delay(Math.max(1, state.retry_after ?? 5) * 1000);
	}

	if (status !== 'succeeded') {
		throw new Error(
			`Scrupp job ${created.job_id} did not finish within ${params.timeoutMinutes} minutes. ` +
				'It is still running — fetch it later with its job ID.',
		);
	}

	const result = await call<{ data?: { items?: unknown[] } }>(
		apiKey,
		HttpMethod.GET,
		`/jobs/${created.job_id}/result`,
	);

	return result.data?.items ?? [];
}

export async function validateApiKey(apiKey: string) {
	try {
		// /ping is free and instant, so connecting never costs a credit.
		await call(apiKey, HttpMethod.GET, '/ping');
		return { valid: true as const };
	} catch (error) {
		const status = error instanceof HttpError ? error.response.status : undefined;
		return {
			valid: false as const,
			error:
				status === 403
					? 'That key was rejected. Check it in Scrupp under Settings → API Keys, and that your plan includes API access.'
					: 'Could not reach the Scrupp API. Try again in a moment.',
		};
	}
}

/** Every action carries these two, and they mean the same thing everywhere. */
export const waitProps = {
	waitForResult: Property.Checkbox({
		displayName: 'Wait for Results',
		description:
			'Wait for the job to finish and return the records. Turn off to get the job ID back immediately.',
		required: false,
		defaultValue: true,
	}),
	timeoutMinutes: Property.Number({
		displayName: 'Timeout (Minutes)',
		description:
			'Give up waiting after this long. The job keeps running on Scrupp and can still be fetched by its ID.',
		required: false,
		defaultValue: 30,
	}),
};

export function commaSeparated(raw: string): string[] {
	const items = raw
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value !== '');

	if (items.length === 0) {
		throw new Error('Provide at least one value to look up.');
	}

	return items;
}

/**
 * Activepieces gives every run an id; combining it with the action name keeps
 * the key stable across a retry of the same step and distinct between steps.
 */
export function idempotencyKey(runId: string, action: string): string {
	return `activepieces-${runId}-${action}`;
}
