// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const moduleName = 'a5e-concentrator';
const moduleTag = 'A5E Concentrator';

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                     Main Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Hooks.once('init', async function () {
	console.log(`${moduleTag} | Initializing.`);
});

Hooks.once('setup', async function () {
	console.log(`${moduleTag} | Setup Complete.`);
});

Hooks.once('ready', async function () {
	libWrapper.register(
		moduleName,
		'CONFIG.Actor.documentClass.prototype.constructItemCard',
		itemRolledHook,
		'WRAPPER'
	);

	libWrapper.register(
		moduleName,
		'CONFIG.Actor.documentClass.prototype.applyDamage',
		applyDamageHook,
		'WRAPPER'
	);

	libWrapper.register(
		moduleName,
		'CONFIG.Actor.documentClass.prototype.restoreSpellResources',
		triggerRestHook,
		'WRAPPER'
	);

	new Concentrator();

	console.log(`${moduleTag} | Ready.`);
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   	Concentrator
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
class Concentrator {
	constructor() {
		Hooks.on('a5e-concentrationRolled', this._handleConcentration.bind(this));
		Hooks.on('a5e-damageTaken', this._onDamaged.bind(this));
		Hooks.on('a5e-longRest', this._onLongRest.bind(this));
	}

	async _handleConcentration(_actor, _item) {
		console.log(_actor);
		console.log(_item);

		// Check if actor is concentrating
		const preFlags = _actor.getFlag(moduleName, 'concentrationData');
		let isConcentrating = false;

		if (preFlags) isConcentrating = preFlags.isConcentrating;
		else await _actor.setFlag(moduleName, 'concentrationData', {});

		if (isConcentrating) {
			// Drop concentration on old
			const msg = `${_actor.data.name} dropped concentration on ${preFlags.name} `;
			const msgData = {
				speaker: { alias: 'Concentrator' },
				content: msg,
				type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			};

			setTimeout(async _ => await ChatMessage.create(msgData), 0);

			// TODO: Remove template and effects in the future.
		}

		// Create flag data
		const concentrationData = {
			name: `${_item.data.name}`,
			isConcentrating: true,
			// duration: data.data.duration?,
		};

		// Update Flags, effects and Send Message.
		await _actor.setFlag(moduleName, 'concentrationData', concentrationData);
		// TODO: Update effects in the future.
	}

	async _onDamaged(actor, damage) {
		// Check if concentrating.
		const preFlags = actor.getFlag(moduleName, 'concentrationData');
		if (!preFlags) return;

		if (!preFlags?.isConcentrating) return;

		// Roll for concentration.
		const checkData = await actor.rollSavingThrow('con');
		console.log(checkData);

		if (!checkData) return;
	}

	async _onLongRest(actor) {
		// Reset data
		await actor.unsetFlag(moduleName, 'concentrationData');
	}
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   	Concentrator
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   	Concentrator
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   	Concentrator
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   	 Dummy Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
function itemRolledHook(wrapped, data) {
	// Create hook for activateItem
	const actor = this;
	const item = actor.items.get(data.id);

	if (item.data.data.concentration)
		Hooks.callAll('a5e-concentrationRolled', actor, item);

	return wrapped(data);
}

function applyDamageHook(wrapped, damage) {
	const actor = this;
	Hooks.callAll('a5e-damageTaken', actor, damage);
	return wrapped(damage);
}

function triggerRestHook(wrapped, restType) {
	const actor = this;
	Hooks.callAll('a5e-longRest', actor);
	return wrapped(restType);
}
