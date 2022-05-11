// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const moduleName = 'a5e-concentrator';
const moduleTag = 'A5E Concentrator';

let socket;
const effect = {
	changes: [],
	duration: {},
	flags: {},
	icon: 'icons/svg/aura.svg',
	id: 'concentration',
	label: 'Concentration',
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                     Main Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Hooks.once('init', async function () {
	console.log(`${moduleTag} | Initializing.`);
});

Hooks.once('setup', async function () {
	console.log(`${moduleTag} | Setup Complete.`);

	// Add statusEffect
	CONFIG.statusEffects.push(effect);
});

Hooks.once('socketlib.ready', () => {
	socket = socketlib.registerModule(moduleName);
	socket.register('rollConcentration', Concentrator.rollConcentration);
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

		// if (game.user.isGM) {
		Hooks.on('a5e-damageTaken', this._onDamaged.bind(this));
		Hooks.on('a5e-longRest', this._onLongRest.bind(this));
		// }
	}

	// =================================================================
	//                       Handle Concentration
	async _handleConcentration(_actor, _item) {
		// Check if actor is concentrating
		const preFlags = _actor.getFlag(moduleName, 'concentrationData');
		let isConcentrating = false;

		if (preFlags) isConcentrating = preFlags.isConcentrating;
		else await _actor.setFlag(moduleName, 'concentrationData', {});

		if (isConcentrating) {
			// Drop concentration on old
			const msg = `${_actor.data.name} dropped concentration on ${preFlags.name}.`;
			const msgData = {
				speaker: { alias: 'Concentrator' },
				content: msg,
				type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			};

			setTimeout(async _ => await ChatMessage.create(msgData), 0);

			// Remove template and effects in the future.
			await this._toggle_effect(_actor, false);
		}

		// Create flag data
		const concentrationData = {
			name: `${_item.data.name}`,
			isConcentrating: true,
		};

		// Update Flags, effects and Send Message.
		await _actor.setFlag(moduleName, 'concentrationData', concentrationData);
		// Update effects in the future.
		await this._toggle_effect(_actor, true);
	}

	// =================================================================
	//                       			On damage
	async _onDamaged(actor, damage) {
		// Check if concentrating.
		const preFlags = actor.getFlag(moduleName, 'concentrationData');
		if (!preFlags) return;

		if (!preFlags?.isConcentrating) return;

		// Roll for concentration.
		let roll = null;

		if (actor.data.type == 'character') {
			const user = game.users.filter(u => u.data.character === actor.id)[0];
			const userId = user?.active ? user.data._id : null;

			if (!userId) roll = await Concentrator.rollConcentration(actor);
			else
				roll = await socket.executeAsUser('rollConcentration', userId, actor);
		} else {
			roll = await Concentrator.rollConcentration(actor);
		}

		let msg = '';
		const hp = actor.data.data.attributes.hp.value;
		if (roll.total >= Math.max(10, Math.floor(damage / 2)) && hp > 0)
			msg += `Still maintaining concentration on ${preFlags.name}`;
		else {
			msg += `Concentration on ${preFlags?.name} broken.`;
			await actor.unsetFlag(moduleName, 'concentrationData');
			// Remove effect
			await this._toggle_effect(actor, false);
		}

		const msgData = {
			speaker: { alias: 'Concentrator' },
			content: msg,
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
		};

		setTimeout(async _ => await ChatMessage.create(msgData), 0);
	}

	// =================================================================
	//                       On Long Rest
	async _onLongRest(actor) {
		// Reset data
		await actor.unsetFlag(moduleName, 'concentrationData');
		// Remove effect
		await this._toggle_effect(actor, false);
	}

	// =================================================================
	//                       Roll Concentration
	async _toggle_effect(actor, trigger) {
		let token;

		if (actor.data.type === 'npc') token = actor.parent;
		else
			token = canvas.scene.tokens.filter(
				t => t.data.actorId === actor.data._id
			)[0];

		// Check if already active
		const statusEffects = actor.data.effects;
		let exists = false;

		statusEffects.forEach(e => {
			const id = e?.data?.flags?.core?.statusId;
			if (id === 'concentration') exists = true;
		});

		if (exists === trigger) return;

		await token.toggleActiveEffect(effect);
	}

	// =================================================================
	//                       Roll Concentration
	static async rollConcentration(actor) {
		console.log(actor);
		const dialogTitle = game.i18n.format('A5E.SavingThrowPromptTitle', {
			name: actor.name,
			ability: game.i18n.localize(CONFIG.A5E.abilities['con']),
		});

		const checkData = await game.a5e.utils.getDialogData(
			game.a5e.vue.AbilityDialog,
			{
				title: dialogTitle,
				props: {
					actor,
					ability: 'con',
					isSave: true,
					isConcentrationCheck: true,
				},
			}
		);

		if (checkData === null) return;

		const { formula } = checkData;
		const roll = await new CONFIG.Dice.D20Roll(formula).roll({ async: true });

		const chatData = {
			user: game.user?.id,
			speaker: ChatMessage.getSpeaker({ actor }),
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			sound: CONFIG.sounds.dice,
			roll,
			content: await renderTemplate(
				'systems/a5e/templates/chat/ability-check.hbs',
				{
					title: game.i18n.format('A5E.SavingThrowSpecific', {
						ability: game.i18n.localize(CONFIG.A5E.abilities['con']),
					}),
					img: actor.img,
					formula: roll.formula,
					tooltip: await roll.getTooltip(),
					total: roll.total,
				}
			),
		};

		ChatMessage.create(chatData);
		return roll;
	}
	// TODO: On effect add and remove
}

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
