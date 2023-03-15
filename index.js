// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
const moduleName = 'a5e-concentrator';
const moduleTag = 'A5E Concentrator';

let socket;
let effect;

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                     Main Hooks
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
Hooks.once('init', async function () {
	console.log(`${moduleTag} | Initializing.`);
});

Hooks.once('setup', async function () {
	console.log(`${moduleTag} | Setup Complete.`);
});

// Add Socket Information
Hooks.once('socketlib.ready', () => {
	socket = socketlib.registerModule(moduleName);
	socket.register('rollConcentration', Concentrator.rollConcentration);
});

Hooks.once('ready', async function () {
	new Concentrator();
	console.log(`${moduleTag} | Ready.`);
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                   	Concentrator
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
class Concentrator {
	constructor() {
		Hooks.on('a5e.itemActivate', this.#onItemActivate.bind(this));
		Hooks.on('a5e.actorDamaged', this._onDamaged.bind(this));
		Hooks.on('a5e.triggerRest', this._onLongRest.bind(this));
		Hooks.on('createActiveEffect', this._onApplyManualEffect.bind(this));
		Hooks.on('deleteActiveEffect', this._onRemoveManualEffect.bind(this));
	}

  #onItemActivate(item, data) {
    if (!item.system.concentration) return;
    this.#handleConcentration(item.parent, item);
  } 

	// =================================================================
	//                       Handle Concentration
	async #handleConcentration(actor, item) {
    // Check if already concentrating
    const isConcentrating = actor.getFlag(moduleName, 'isConcentrating');

    // Drop Concentration if already concentrating.
    if (isConcentrating) {
      const chatData = {
        speaker: { alias: 'Concentrator' },
        content: game.i18n.format('concentrator.droppedMessage', {
          name: actor.name, item: actor.getFlag(moduleName, 'itemName')
        }),
        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      };

      setTimeout(async _ => await ChatMessage.create(chatData), 0);
    }
    
    // Add data for new concentration item
    await actor.setFlag(moduleName, 'isConcentrating', true);
    await actor.setFlag(moduleName, 'itemName', item.name);

    await this.#toggleEffect(actor, true);
  }

	// =================================================================
	//                       			On damage
	async _onDamaged(actor, damageData) {
		// Variables
		const damage = damageData.damage;

		// Check if concentrating.
		const preFlags = actor.getFlag(moduleName, 'concentrationData');
		if (!preFlags) return;

		if (!preFlags?.isConcentrating) return;

		// Roll for concentration.
		let roll = null;
		const hp = actor.system.attributes.hp.value;
		const unconscious = damage > hp;

		if (unconscious) roll = { total: 0 };
		else if (actor.type == 'character') {
			const user = game.users.filter(u => u.character === actor.id)[0];
			const userId = user?.active ? user._id : null;

			if (!userId) roll = await Concentrator.rollConcentration(actor);
			else
				roll = await socket.executeAsUser(
					'rollConcentration',
					userId,
					null,
					actor.id
				);
		} else {
			roll = await Concentrator.rollConcentration(actor);
		}

		let msg = '';
		if (roll.total >= Math.max(10, Math.floor(damage / 2)))
			msg = game.i18n.format('concentrator.maintainedMessage', {
				name: actor.name,
				item: preFlags.name,
			});
		else {
			msg = game.i18n.format('concentrator.droppedMessage', {
				name: actor.name,
				item: preFlags.name,
			});
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
	//               On Add Active Effect - Manual
	async _onApplyManualEffect(activeEffect, options, id) {
		// Check if effect is concentration
		if (activeEffect.flags?.core?.statusId !== 'concentration') return;
		const actor = activeEffect.parent;

		// Check if concentrating
		const preFlags = actor.getFlag(moduleName, 'concentrationData');
		if (!preFlags) await actor.setFlag(moduleName, 'concentrationData', {});

		// Return if already concentrating.
		if (preFlags?.isConcentrating) return;

		// Create flag data
		const concentrationData = {
			name: game.i18n.localize('concentrator.manualEffectLabel'),
			isConcentrating: true,
		};

		// Update Flags, effects and Send Message.
		if (!preFlags)
			await actor.setFlag(moduleName, 'concentrationData', concentrationData);
		return;
	}

	// =================================================================
	//               On Remove Active Effect - Manual
	async _onRemoveManualEffect(activeEffect, options, id) {
		// Check if effect is concentration
		if (activeEffect.flags?.core?.statusId !== 'concentration') return;
		const actor = activeEffect.parent;

		// Check if concentrating.
		const preFlags = actor.getFlag(moduleName, 'concentrationData');
		const isConcentrating = preFlags?.isConcentrating
			? preFlags.isConcentrating
			: false;

		// Remove Flag
		if (isConcentrating) await actor.unsetFlag(moduleName, 'concentrationData');
		return;
	}

	// =================================================================
	//                       On Long Rest
	async _onLongRest(actor, restData) {
		if (restData.restType !== 'long') return;

		// Reset data
		await actor.unsetFlag(moduleName, 'concentrationData');
		// Remove effect
		await this._toggle_effect(actor, false);
	}

	// =================================================================
	//                       Roll Concentration
	async #toggleEffect(actor, trigger) {
		let token;

		if (actor.type === 'npc') token = actor.parent;
		else token = canvas.scene.tokens.filter(t => t.actorId === actor._id)[0];

		// Check if already active
		const statusEffects = actor.effects;
		let exists = false;

		statusEffects.forEach(e => {
			const id = e?.flags?.core?.statusId;
			if (id === 'concentration') exists = true;
		});

		if (exists === trigger) return;

		await token.toggleActiveEffect(effect);
	}

	// =================================================================
	//                       Roll Concentration
	static async rollConcentration(actor, actorID = null) {
		if (!actor && actorID) actor = game.actors.get(actorID);

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