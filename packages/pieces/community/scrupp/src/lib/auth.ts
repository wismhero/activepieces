import { PieceAuth } from '@activepieces/pieces-framework';
import { validateApiKey } from './common';

export const scruppAuth = PieceAuth.SecretText({
	displayName: 'API Key',
	required: true,
	description:
		'Sign in at [app.scrupp.com](https://app.scrupp.com), open **Settings → API Keys**, create a key and paste it here.',
	validate: async ({ auth }) => validateApiKey(auth),
});
