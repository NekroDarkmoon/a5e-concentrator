// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
import { moduleName, moduleTag } from './scripts/constants.js';
import { TemplatePlacer } from './scripts/generateTemplate.js';
import { registerSettings } from './scripts/settings.js';

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                     Main Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Hooks.once('init', async function () {
	console.log(`${moduleTag} | Initializing.`);

	// Register Settings
	await registerSettings();
	console.log(`${moduleTag} | Registered Settings`);
});

Hooks.once('setup', async function () {
	console.log(`${moduleTag} | Setup Complete.`);
});

Hooks.once('ready', async function () {
	// Add Temporary Option for placing templates
	new TemplatePlacer();

	// Template Targeting

	console.log(`${moduleTag} | Ready.`);

	libWrapper.register(
		moduleName,
		'CONFIG.Actor.documentClass.prototype.constructItemCard',
		dummyHook,
		'WRAPPER'
	);
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   Dummy Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function dummyHook(wrapped, data) {
	const actor = this.data;
	const item = actor.items.get(data.id);
	const itemData = item.data.data;

	if (data.actionOptions?.includes('savingThrow')) {
		const save = itemData.savingThrow;
		Hooks.call(`${moduleName}.saveItemRolled`, item, save, actor, data);
	}

	return wrapped(data);
}
