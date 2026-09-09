import { createAction, Property } from '@activepieces/pieces-framework';
import { scruppAuth } from '../auth';
import { commaSeparated, idempotencyKey, JobType, runJob, waitProps } from '../common';

export const enrichLinkedinProfiles = createAction({
	auth: scruppAuth,
	name: 'enrich_linkedin_profiles',
	displayName: 'Enrich LinkedIn Profiles',
	description: 'Full profile data for a list of LinkedIn profile URLs',
	props: {
		items: Property.LongText({
			displayName: 'Profile URLs',
			description: 'One per line, or comma separated.',
			required: true,
		}),
		...waitProps,
	},
	async run(context) {
		const { items, waitForResult, timeoutMinutes } = context.propsValue;

		return runJob({
			auth: context.auth,
			type: 'linkedin.profile',
			input: { items: commaSeparated(items.replace(/\n/g, ',')) },
			idempotencyKey: idempotencyKey(context.run.id, 'enrich_linkedin_profiles'),
			waitForResult: waitForResult ?? true,
			timeoutMinutes: timeoutMinutes ?? 30,
		});
	},
});

export const lookupCompany = createAction({
	auth: scruppAuth,
	name: 'lookup_company',
	displayName: 'Look Up Company',
	description: 'Company data by domain, LinkedIn URL or name',
	props: {
		lookupBy: Property.StaticDropdown({
			displayName: 'Look Up By',
			required: true,
			defaultValue: 'company.domain',
			options: {
				options: [
					{ label: 'Domain', value: 'company.domain' },
					{ label: 'LinkedIn URL', value: 'company.linkedin' },
					{ label: 'Name', value: 'company.name' },
				],
			},
		}),
		items: Property.LongText({
			displayName: 'Companies',
			description: 'One per line, or comma separated. For example: openai.com, anthropic.com',
			required: true,
		}),
		...waitProps,
	},
	async run(context) {
		const { lookupBy, items, waitForResult, timeoutMinutes } = context.propsValue;

		return runJob({
			auth: context.auth,
			type: lookupBy as JobType,
			input: { items: commaSeparated(items.replace(/\n/g, ',')) },
			idempotencyKey: idempotencyKey(context.run.id, 'lookup_company'),
			waitForResult: waitForResult ?? true,
			timeoutMinutes: timeoutMinutes ?? 30,
		});
	},
});

export const findDecisionMakers = createAction({
	auth: scruppAuth,
	name: 'find_decision_makers',
	displayName: 'Find Decision Makers',
	description: 'The people worth writing to at a company you only know the domain of',
	props: {
		findBy: Property.StaticDropdown({
			displayName: 'Find By',
			required: true,
			defaultValue: 'contact.decision_maker.domain',
			options: {
				options: [
					{ label: 'Domain', value: 'contact.decision_maker.domain' },
					{ label: 'Company LinkedIn URL', value: 'contact.decision_maker.linkedin' },
					{ label: 'Company Name', value: 'contact.decision_maker.name' },
				],
			},
		}),
		items: Property.LongText({
			displayName: 'Companies',
			description: 'One per line, or comma separated.',
			required: true,
		}),
		max: Property.Number({
			displayName: 'Decision Makers per Company',
			required: false,
			defaultValue: 10,
		}),
		...waitProps,
	},
	async run(context) {
		const { findBy, items, max, waitForResult, timeoutMinutes } = context.propsValue;

		return runJob({
			auth: context.auth,
			type: findBy as JobType,
			input: { items: commaSeparated(items.replace(/\n/g, ',')), max: max ?? 10 },
			idempotencyKey: idempotencyKey(context.run.id, 'find_decision_makers'),
			waitForResult: waitForResult ?? true,
			timeoutMinutes: timeoutMinutes ?? 30,
		});
	},
});

export const findEmails = createAction({
	auth: scruppAuth,
	name: 'find_emails',
	displayName: 'Find Emails',
	description: 'Work email addresses from first name, last name and company domain',
	props: {
		people: Property.Array({
			displayName: 'People',
			required: true,
			properties: {
				first_name: Property.ShortText({ displayName: 'First Name', required: true }),
				last_name: Property.ShortText({ displayName: 'Last Name', required: true }),
				domain: Property.ShortText({ displayName: 'Domain', required: true }),
			},
		}),
		...waitProps,
	},
	async run(context) {
		const { people, waitForResult, timeoutMinutes } = context.propsValue;

		if (!Array.isArray(people) || people.length === 0) {
			throw new Error('Add at least one person to look up.');
		}

		return runJob({
			auth: context.auth,
			type: 'email.initials',
			input: { items: people },
			idempotencyKey: idempotencyKey(context.run.id, 'find_emails'),
			waitForResult: waitForResult ?? true,
			timeoutMinutes: timeoutMinutes ?? 30,
		});
	},
});
