import { createAction, Property } from '@activepieces/pieces-framework';
import { scruppAuth } from '../auth';
import { idempotencyKey, JobType, runJob, waitProps } from '../common';

/**
 * The three search exports differ only in which platform's URL they take, so
 * they share one builder. Keeping them as three actions rather than one action
 * with a dropdown matches how people think: they have a Sales Navigator URL,
 * not "a search".
 */
function searchAction(config: {
	name: string;
	displayName: string;
	description: string;
	type: JobType;
	urlPlaceholder: string;
	accountRequired: boolean;
	accountDescription: string;
}) {
	return createAction({
		auth: scruppAuth,
		name: config.name,
		displayName: config.displayName,
		description: config.description,
		props: {
			url: Property.ShortText({
				displayName: 'Search URL',
				description: 'Build the filters on the platform, then paste the URL here.',
				required: true,
				defaultValue: config.urlPlaceholder,
			}),
			withEmails: Property.Checkbox({
				displayName: 'Find Emails',
				description: 'Also find work email addresses for the people extracted.',
				required: false,
				defaultValue: true,
			}),
			max: Property.Number({
				displayName: 'Max Records',
				description:
					'Upper bound on records to extract. Drives the upfront credit hold; unused credits are refunded.',
				required: false,
				defaultValue: 100,
			}),
			account: Property.ShortText({
				displayName: 'Account Email',
				description: config.accountDescription,
				required: config.accountRequired,
			}),
			...waitProps,
		},
		async run(context) {
			const { url, withEmails, max, account, waitForResult, timeoutMinutes } = context.propsValue;

			return runJob({
				auth: context.auth,
				type: config.type,
				input: {
					url,
					with_emails: withEmails ?? true,
					max: max ?? 100,
					...(account ? { account } : {}),
				},
				idempotencyKey: idempotencyKey(context.run.id, config.name),
				waitForResult: waitForResult ?? true,
				timeoutMinutes: timeoutMinutes ?? 30,
			});
		},
	});
}

export const exportSalesNavigatorSearch = searchAction({
	name: 'export_sales_navigator_search',
	displayName: 'Export Sales Navigator Search',
	description: 'Extract the people from a Sales Navigator search URL',
	type: 'sales_navigator.search',
	urlPlaceholder: '',
	accountRequired: false,
	accountDescription:
		'Connected Sales Navigator account to run with. Needed only for searches that use personal filters such as saved lists or relationships.',
});

export const exportLinkedinSearch = searchAction({
	name: 'export_linkedin_search',
	displayName: 'Export LinkedIn Search',
	description: 'Extract the people from a LinkedIn people-search URL',
	type: 'linkedin.search',
	urlPlaceholder: '',
	accountRequired: false,
	accountDescription: 'Connected LinkedIn account to run with. Optional.',
});

export const runApolloSearch = createAction({
	auth: scruppAuth,
	name: 'run_apollo_search',
	displayName: 'Run Apollo Search',
	description: 'Extract the people from an Apollo search URL',
	props: {
		url: Property.ShortText({
			displayName: 'Search URL',
			description: 'Build the filters in Apollo, then paste the URL here.',
			required: true,
		}),
		withEmails: Property.Checkbox({
			displayName: 'Find Emails',
			required: false,
			defaultValue: true,
		}),
		max: Property.Number({
			displayName: 'Max Records',
			description: 'Upper bound on records. Unused credits are refunded.',
			required: false,
			defaultValue: 100,
		}),
		account: Property.ShortText({
			displayName: 'Account Email',
			description: 'Connected Apollo account to run with. Apollo searches always need one.',
			required: true,
		}),
		...waitProps,
	},
	async run(context) {
		const { url, withEmails, max, account, waitForResult, timeoutMinutes } = context.propsValue;

		return runJob({
			auth: context.auth,
			type: 'apollo.search',
			input: { url, with_emails: withEmails ?? true, max: max ?? 100, account },
			idempotencyKey: idempotencyKey(context.run.id, 'run_apollo_search'),
			waitForResult: waitForResult ?? true,
			timeoutMinutes: timeoutMinutes ?? 30,
		});
	},
});
