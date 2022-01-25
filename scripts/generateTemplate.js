// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
import { moduleName, moduleTag } from './constants.js';
import { AbilityTemplate } from './AbilityTemplate.js';

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                  Place Template
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export class TemplatePlacer {
	constructor() {
		Hooks.on(`${moduleName}.saveItemRolled`, this._onSaveItemRolled.bind(this));
		Hooks.on('renderItemSheet', this._addConfigToSheet);
		// this._activateListeners();
	}

	/**
	 *
	 * @param {*} item
	 * @param {*} save
	 * @param {*} actor
	 * @param {*} _data
	 * @returns
	 */
	_onSaveItemRolled(item, save, actor, _data) {
		// Check Global Settings
		if (!game.settings.get(moduleName, 'generateTemplate')) return;

		// Ask per item if not set
		const flag = item.getFlag(moduleName, 'generateTemplate');
		if (flag === 'none') return;

		if (flag === 'always') {
			this._placeTemplate(item);
			return;
		}

		// Bail out Dialog
		Dialog.confirm({
			title: 'Generate Template',
			content: 'Do you wish to place a template?',
			yes: html => this._placeTemplate(item),
			no: html => {
				return;
			},
		});
	}

	/**
	 *
	 * @param {*} item
	 * @returns
	 */
	_placeTemplate(item) {
		// Check if it has an area
		if (!item.data.data.target?.type === 'area') return;
		const template = AbilityTemplate.fromItem(item);
		if (template) template.drawPreview();
	}

	/**
	 *
	 * @param {*} a
	 * @param {Document} $html
	 * @param {*} data
	 * @returns
	 */
	_addConfigToSheet(a, $html, data) {
		const actorId = a._element[0].id.split('-')[1];
		const itemId = data.item._id;
		const choice = game.actors
			.get(actorId)
			?.items.get(itemId)
			?.getFlag(moduleName, 'generateTemplate');

		if (!choice) return;

		// Create element for generate template
		const $div1 = `<div 
				class="a5e-form__section a5e-form__section--inline template-helpers-gt">
				<h3 class="a5e-form__input-label a5e-form__input-label--inline">
					Place Template On Use
				</h3>
				<div class="a5e-input-container a5e-input-container--inline">
					<select 
						class="a5e-select a5e-select--inline" 
						name="template-helpers-generate"
						id="${actorId}-${itemId}"
					>
						<option value="none" ${choice === 'none' ? 'selected' : ''}>None</option>
						<option value="always" ${choice === 'always' ? 'selected' : ''}>Always</option>
						<option value="ask" ${choice === 'ask' ? 'selected' : ''}>Ask</option>
					</select>
				</div>
			</div>
			`;

		// Find location and insert
		const $areaTemplates = $html.find('.a5e-radio-group--area-templates')[0];
		const $section = $areaTemplates.parentElement;
		$($section).after($div1);

		TemplatePlacer._activateListeners();
	}

	/**
	 *
	 */
	static _activateListeners() {
		const $document = document;

		// GenerateTemplate Checkbox
		$($document)
			.find('select[name="template-helpers-generate"]')
			.on('change', async $event => {
				const target = $event.currentTarget;
				const value = target.value;
				const actorId = target.id.split('-')[0];
				const itemId = target.id.split('-')[1];

				await game.actors
					.get(actorId)
					.items.get(itemId)
					.setFlag(moduleName, 'generateTemplate', value);
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
