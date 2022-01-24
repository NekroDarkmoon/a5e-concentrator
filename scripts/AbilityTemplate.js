// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                               Imports and Constants
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
import { moduleName, moduleTag } from './constants.js';

export const templateType = {
	cone: 'cone',
	cube: 'rect',
	cylinder: 'circle',
	line: 'ray',
	sphere: 'circle',
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
//                                     Main Class
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
export class AbilityTemplate extends MeasuredTemplate {
	static fromItem(item) {
		const target = getProperty(item.data, 'data.target') || {};
		console.log(target);
		const templateShape = templateType[target.shape];
		if (!templateShape) return;

		// Prep Template Data
		const templateData = {
			t: templateShape,
			user: game.user.id,
			distance: Number(target.size),
			direction: 0,
			x: 0,
			y: 0,
			fillColor: game.user.color,
		};

		// Add type data
		switch (templateShape) {
			case 'cone':
				templateData.angle = CONFIG.MeasuredTemplate.defaults.angle;
				break;

			case 'rect':
				templateData.distance = Math.hypot(
					Number(target.size),
					Number(target.size)
				);
				templateData.width = Number(target.size);
				templateData.direction = 45;
				break;

			case 'ray':
				templateData.width = CanvasGradient.dimensions.distance;
				break;

			default:
				break;
		}

		// Return the template constructed from the item data
		const cls = CONFIG.MeasuredTemplate.documentClass;
		const template = new cls(templateData, { parent: canvas.scene });
		const object = new this(template);
		object.item = item;

		object.actorSheet = item.actor?.sheet || null;
		return object;
	}

	drawPreview() {
		const initialLayer = canvas.activeLayer;

		// Draw the template and switch to the template layer
		this.draw();
		this.layer.activate();
		this.layer.preview.addChild(this);

		// Hide the sheet that originated the preview
		this.actorSheet?.minimize();

		// Activate interactivity
		this.activatePreviewListeners(initialLayer);
	}

	activatePreviewListeners(initialLayer) {
		const handlers = {};
		let moveTime = 0;

		// Update placement (mouse-move)
		handlers.mm = event => {
			event.stopPropagation();
			let now = Date.now(); // Apply a 20ms throttle
			if (now - moveTime <= 20) return;
			const center = event.data.getLocalPosition(this.layer);
			const snapped = canvas.grid.getSnappedPosition(center.x, center.y, 2);
			this.data.update({ x: snapped.x, y: snapped.y });
			this.refresh();
			moveTime = now;
		};

		// Cancel the workflow (right-click)
		handlers.rc = event => {
			this.layer._onDragLeftCancel(event);
			canvas.stage.off('mousemove', handlers.mm);
			canvas.stage.off('mousedown', handlers.lc);
			canvas.app.view.oncontextmenu = null;
			canvas.app.view.onwheel = null;
			initialLayer.activate();
			this.actorSheet?.maximize();
		};

		// Confirm the workflow (left-click)
		handlers.lc = event => {
			handlers.rc(event);
			const destination = canvas.grid.getSnappedPosition(
				this.data.x,
				this.data.y,
				2
			);
			this.data.update(destination);
			canvas.scene.createEmbeddedDocuments('MeasuredTemplate', [this.data]);
		};

		// Rotate the template by 3 degree increments (mouse-wheel)
		handlers.mw = event => {
			if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
			event.stopPropagation();
			let delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
			let snap = event.shiftKey ? delta : 5;
			this.data.update({
				direction: this.data.direction + snap * Math.sign(event.deltaY),
			});
			this.refresh();
		};

		// Activate listeners
		canvas.stage.on('mousemove', handlers.mm);
		canvas.stage.on('mousedown', handlers.lc);
		canvas.app.view.oncontextmenu = handlers.rc;
		canvas.app.view.onwheel = handlers.mw;
	}
}
