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
  #CONCENTRATING = 'isConcentrating';
  #ITEM_NAME = 'itemName';
  #STATUS_EFFECT;

	constructor() {
    this.#STATUS_EFFECT = CONFIG.statusEffects.find((effect) => effect.id === 'concentration');

		Hooks.on('a5e.itemActivate', this.#onItemActivate.bind(this));
		Hooks.on('a5e.actorDamaged', this.#onDamaged.bind(this));
		Hooks.on('a5e.restComplete', this.#onLongRest.bind(this));
		Hooks.on('createActiveEffect', this._onApplyManualEffect.bind(this));
		Hooks.on('deleteActiveEffect', this._onRemoveManualEffect.bind(this));
	}

  #onItemActivate(item) {
    if (!item.system.concentration) return;
    this.#handleConcentration(item.parent, item);
  } 

	// =================================================================
	//                       Handle Concentration
	async #handleConcentration(actor, item) {
    // Check if already concentrating
    const isConcentrating = actor.getFlag(moduleName, this.#CONCENTRATING);

    // Drop Concentration if already concentrating.
    if (isConcentrating) {
      const chatData = {
        speaker: { alias: 'Concentrator' },
        content: game.i18n.format('concentrator.droppedMessage', {
          name: actor.name, item: actor.getFlag(moduleName, this.#ITEM_NAME)
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
	async #onDamaged(actor, data) {
    const damage = data.damage;
    const isConcentrating = actor.getFlag(moduleName, this.#CONCENTRATING)

    if (!isConcentrating) return;

    // Prompt for concentration 
    let roll = null;
    const hp = actor.system.attributes.hp.value;
    const threshold = Math.max(10, Math.floor(damage / 2));

    if (damage > hp) roll = { total: 0 };
    else if ( actor.type === 'character' ) {
      const user = game.users.filter((u) => u.character === actor.id)[0];
      const userId = user?.active ? user.id : null;

      if (!userId) roll = await Concentrator.rollConcentration(actor);
      else roll = await socket.executeAsUser('rollConcentration', userId, null, actor.id);
    } else {
      roll = await Concentrator.rollConcentration(actor);
    }

    const msg = (roll.total >= threshold)
      ? game.i18n.format('concentrator.maintainedMessage', {
				name: actor.name, item: actor.getFlag(moduleName, this.#ITEM_NAME),
      })
      : game.i18n.format('concentrator.droppedMessage', {
				name: actor.name, item: actor.getFlag(moduleName, this.#ITEM_NAME),
			});

    if (roll.total < threshold) {
      await actor.setFlag(moduleName, this.#CONCENTRATING, false);
      await actor.setFlag(moduleName, this.#ITEM_NAME, "");
      await this.#toggleEffect(actor, false);
    }
		
		const chatData = {
			speaker: { alias: 'Concentrator' },
			content: msg,
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
		};

		setTimeout(async _ => await ChatMessage.create(chatData), 0);
	}

  // =================================================================
	//                       On Long Rest
	async #onLongRest(actor, restData) {
		if (restData.restType !== 'long') return;

    await actor.setFlag(moduleName, this.#CONCENTRATING, false);
    await actor.setFlag(moduleName, this.#ITEM_NAME, "");
    await this.#toggleEffect(actor, false);
	}

  // =================================================================
	//                       Roll Concentration
	async #toggleEffect(actor, trigger) {
		const token = (actor.type === 'npc') 
      ? actor.parent
      : canvas.scene.tokens.filter(t => t.actorId === actor._id)[0];

		// Check if already active
		const statusEffects = actor.effects;
    
    const exists = statusEffects.find((e) => e.flags?.core?.statusId === 'concentration') 
      ? true 
      : false;
    
		if (exists === trigger) return;
		await token.toggleActiveEffect(this.#STATUS_EFFECT);
	}

	// =================================================================
	//               On Add Active Effect - Manual
	async _onApplyManualEffect(activeEffect, options, id) {
    if (game.user.id !== id ) return;
		if (activeEffect.flags?.core?.statusId !== 'concentration') return;
    
		const actor = activeEffect.parent;

    await actor.setFlag(moduleName, this.#CONCENTRATING, true);
    await actor.setFlag(moduleName, this.#ITEM_NAME, "");
	}

	// =================================================================
	//               On Remove Active Effect - Manual
	async _onRemoveManualEffect(activeEffect, options, id) {
    if (game.user.id !== id ) return;
		if (activeEffect.flags?.core?.statusId !== 'concentration') return;

		const actor = activeEffect.parent;
		const isConcentrating = actor.getFlag(moduleName, this.#CONCENTRATING);
    if (!isConcentrating) return;

		// Remove Flag
    await actor.setFlag(moduleName, this.#CONCENTRATING, false);
    await actor.setFlag(
      moduleName,
      this.#ITEM_NAME,
      game.i18n.localize("concentrator.manualEffectLabel")
    );
	}

	// =================================================================
	//                       Roll Concentration
	static async rollConcentration(actor, actorID = null) {
		if (!actor && actorID) actor = game.actors.get(actorID);

    const chatData = await actor.rollSavingThrow('con', {saveType: 'concentration'});
    return chatData.rolls[0];
	}
}
