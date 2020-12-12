import L, {ControlOptions, LeafletMouseEvent} from 'leaflet';
import {useStore} from "@/store";
import {Coordinate} from "@/dynmap";

const store = useStore();

export interface CoordinatesControlOptions extends ControlOptions {
	showY: boolean;
	showRegion: boolean;
	showChunk: boolean;
	label: string;
}

export class CoordinatesControl extends L.Control {
	// @ts-ignore
	options: CoordinatesControlOptions;

	private _map ?: L.Map;
	private _location?: Coordinate;
	private _locationChanged: boolean = false;
	private readonly _coordsContainer: HTMLSpanElement;
	private readonly _regionContainer: HTMLSpanElement;
	private readonly _chunkContainer: HTMLSpanElement;

	constructor(options: CoordinatesControlOptions) {
		super(options);

		options.showRegion = true;
		options.showChunk = true;
		this._coordsContainer = L.DomUtil.create('span', 'value coordinates');
		this._chunkContainer = L.DomUtil.create('span', 'value chunk');
		this._regionContainer = L.DomUtil.create('span', 'value region');

		options.position = 'bottomleft';
		L.Util.setOptions(this, options);
	}

	onAdd(map: L.Map) {
		const container = L.DomUtil.create('div', 'leaflet-control-coordinates');

		this._coordsContainer.textContent = this.options.showY ? '-----, ----- , -----' : '-----, -----';
		this._coordsContainer.dataset.label = this.options.label;
		container.appendChild(this._coordsContainer);

		if (this.options.showRegion) {
			this._regionContainer.textContent = '--------------';
			this._regionContainer.dataset.label = 'Region';
			container.appendChild(this._regionContainer);
		}

		if (this.options.showChunk) {
			this._chunkContainer.textContent = '----, ----';
			this._chunkContainer.dataset.label = 'Chunk';
			container.appendChild(this._chunkContainer);
		}

		map.on('mousemove', this._onMouseMove, this);
		map.on('mouseout', this._onMouseOut, this);

		return container;
	}

	remove() {
		if (!this._map) {
			return this;
		}

		this._map.on('mousemove', this._onMouseMove, this);
		this._map.on('mouseout', this._onMouseOut, this);
		L.Control.prototype.remove.call(this);

		return this;
	}

	_onMouseMove(event: LeafletMouseEvent) {
		if (!this._map || !store.state.currentWorld) {
			return;
		}

		this._location = store.state.currentProjection.latLngToLocation(event.latlng, store.state.currentWorld.seaLevel + 1);

		if(!this._locationChanged) {
			this._locationChanged = true;
			requestAnimationFrame(() => this._update());
		}
	}

	_onMouseOut() {
		if (!this._map) {
			return;
		}

		this._location = undefined;

		if(!this._locationChanged) {
			this._locationChanged = true;
			requestAnimationFrame(() => this._update());
		}
	}

	_update() {
		if (!this._map || !store.state.currentWorld || !this._locationChanged) {
			return;
		}

		this._locationChanged = false;

		if(!this._location) {
			if (this.options.showY) {
				this._coordsContainer.textContent = '-----, ----- , -----';
			} else {
				this._coordsContainer.textContent = '-----, -----';
			}

			if (this.options.showRegion) {
				this._regionContainer.textContent = '--------------';
			}

			if (this.options.showChunk) {
				this._chunkContainer.textContent = '----, ----';
			}

			return;
		}

		const x = Math.round(this._location.x).toString().padStart(5, ' '),
			y = this._location.y.toString().padStart(3, ' '),
			z = Math.round(this._location.z).toString().padStart(5, ' '),
			regionX = Math.floor(this._location.x / 512).toString().padStart(3, ' '),
			regionZ = Math.floor(this._location.z / 512).toString().padStart(3, ' '),
			chunkX = Math.floor(this._location.x / 16).toString().padStart(4, ' '),
			chunkZ = Math.floor(this._location.z / 16).toString().padStart(4, ' ');

		if (this.options.showY) {
			this._coordsContainer.textContent = `${x}, ${y}, ${z}`;
		} else {
			this._coordsContainer.textContent = `${x}, ${z}`;
		}

		if (this.options.showRegion) {
			this._regionContainer.textContent = `r.${regionX}, ${regionZ}.mca`;
		}

		if (this.options.showChunk) {
			this._chunkContainer.textContent = `${chunkX}, ${chunkZ}`;
		}
	}
}