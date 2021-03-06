/*
 * Copyright 2020 James Lyne
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import {MarkerOptions, Marker, Util, LatLngExpression, Icon} from 'leaflet';

export interface GenericMarkerOptions extends MarkerOptions {
	minZoom?: number;
	maxZoom?: number;
}

export class GenericMarker extends Marker {
	constructor(latLng: LatLngExpression, options: GenericMarkerOptions) {
		super(latLng, options);
		Util.setOptions(this, options);
	}

	_resetZIndex() {
		//Don't change the zindex
	}

	getIcon(): Icon.Default {
		return this.options.icon as Icon.Default;
	}
}
