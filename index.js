// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
import { moduleName, moduleTag } from './scripts/constants.js';

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                     Main Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Hooks.once('init', async function () {
	console.log(`${moduleTag} | Initializing.`);

	// Register Settings

	console.log(`${moduleTag} | Registered Settings`);
});

Hooks.once('setup', async function () {
	console.log(`${moduleTag} | Setup.`);
});

Hooks.once('ready', async function () {
	// Enable Hit Check and damage application

	console.log(`${moduleTag} | Ready.`);

	libWrapper.register(
		moduleName,
		'CONFIG.Actor.documentClass.prototype.activate',
		dummyHook,
		'WRAPPER'
	);
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   Chat Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   Dummy Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function dummyHook(wrapped) {
	const item = this;
	const actor = this.actor;
  const itemData = item.data.data;

  console.log(item);
  console.log(actor);
  console.log(itemData);

	if (itemData.savingThrow) {
		const save = itemData.savingThrow;
		Hooks.call('saveItemRolled', item, save, actor, data);
	}

	return wrapped();
}
