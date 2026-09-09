import { createPiece, PieceCategory } from '@activepieces/pieces-framework';
import { createCustomApiCallAction } from '@activepieces/pieces-common';
import { scruppAuth } from './lib/auth';
import {
	exportLinkedinSearch,
	exportSalesNavigatorSearch,
	runApolloSearch,
} from './lib/actions/search';
import {
	enrichLinkedinProfiles,
	findDecisionMakers,
	findEmails,
	lookupCompany,
} from './lib/actions/enrich';

export { scruppAuth };

export const scrupp = createPiece({
	displayName: 'Scrupp',
	description:
		'Export LinkedIn, Sales Navigator and Apollo searches, find decision makers, and find and verify work emails',
	auth: scruppAuth,
	minimumSupportedRelease: '0.36.1',
	logoUrl: 'https://cdn.activepieces.com/pieces/scrupp.png',
	categories: [PieceCategory.SALES_AND_CRM],
	authors: ['wismhero'],
	actions: [
		exportSalesNavigatorSearch,
		exportLinkedinSearch,
		runApolloSearch,
		enrichLinkedinProfiles,
		lookupCompany,
		findDecisionMakers,
		findEmails,
		createCustomApiCallAction({
			auth: scruppAuth,
			baseUrl: () => 'https://api.scrupp.com/api/v1',
			authMapping: async (auth) => ({
				Authorization: `Bearer ${(auth as { secret_text: string }).secret_text}`,
			}),
		}),
	],
	triggers: [],
});
