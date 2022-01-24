// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
import { moduleName, moduleTag } from './constants.js';
import { templateType, AbilityTemplate } from './AbilityTemplate.js';

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                  Place Template
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export class TemplatePlacer {
	constructor() {
		Hooks.on(`${moduleName}.saveItemRolled`, this._onSaveItemRolled.bind(this));
		Hooks.on('renderItemSheet', this._addConfigToSheet);
		// this._activateListeners();
	}

	_onSaveItemRolled(item, save, actor, _data) {
		// Check Global Settings
		if (!game.settings.get(moduleName, 'generateTemplate')) return;

		// Ask per item if not set
		const flag = item.getFlag(moduleName, 'generateTemplate');
		console.log(flag);
		if (!flag) return;

		// Bail out Dialog
		Dialog.confirm({
			title: 'Generate Template',
			content: 'Do you wish to place a template?',
			yes: html => {
				// Check if has an area
				if (!item.data.data.target?.type === 'area') return;
				const template = AbilityTemplate.fromItem(item);
				if (template) template.drawPreview();
			},
			no: html => {
				return;
			},
		});
	}

	_addConfigToSheet(a, $html, data) {
		const actorId = a._element[0].id.split('-')[1];
		const itemId = data.item._id;
		const enabled = game.actors
			.get(actorId)
			.items.get(itemId)
			.getFlag(moduleName, 'generateTemplate');

		// Create element
		const $div = `<div 
				class="a5e-form__section a5e-form__section--inline template-helpers-gt">
				<h3 class="a5e-form__input-label a5e-form__input-label--inline">
					Place Template On Use
				</h3>
				<div class="a5e-input-container a5e-input-container--inline-wide">
					<input 
						type="checkbox" 
						id="${actorId}-${itemId}" 
						name="template-helpers-generate"
						${enabled ? 'checked' : ''}
					/>
				</div>
			</div>
			`;

		// Find location and insert
		const $areaTemplates = $html.find('.a5e-radio-group--area-templates')[0];
		const $section = $areaTemplates.parentElement;
		$($section).after($div);

		TemplatePlacer._activateListeners();
	}

	static _activateListeners() {
		const $document = document;

		$($document)
			.find('input[name="template-helpers-generate"]')
			.on('change', async $event => {
				const target = $event.currentTarget;
				const isChecked = target.checked;
				const actorId = target.id.split('-')[0];
				const itemId = target.id.split('-')[1];

				if (isChecked)
					await game.actors
						.get(actorId)
						.items.get(itemId)
						.setFlag(moduleName, 'generateTemplate', true);
				else
					await game.actors
						.get(actorId)
						.items.get(itemId)
						.setFlag(moduleName, 'generateTemplate', false);
			});
	}
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
