// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
import { moduleName, moduleTag } from './constants.js';

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export async function registerSettings() {
	// Settings for automatic template placement
	await game.settings.register(moduleName, 'generateTemplate', {
		name: 'Place template on item use.',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});

	// Settings for auto  template targeting
	await game.settings.register(moduleName, 'autoTarget', {
		name: 'Automatically target actors in a template.',
		scope: 'world',
		config: true,
		type: String,
		choices: [
			'none',
			'always',
			'alwaysIgnoreDefeated',
			'wallsBlock',
			'wallsBlockIgnoreDefeated',
		],
		default: 'none',
	});

	// Settings for auto un-targeting
	await game.settings.register(moduleName, 'removeTargets', {
		name: 'Untarget actors at end of turn',
		scope: 'world',
		config: true,
		type: Boolean,
		default: false,
	});
}
