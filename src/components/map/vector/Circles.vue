<!--
  - Copyright 2020 James Lyne
  -
  -    Licensed under the Apache License, Version 2.0 (the "License");
  -    you may not use this file except in compliance with the License.
  -    You may obtain a copy of the License at
  -
  -      http://www.apache.org/licenses/LICENSE-2.0
  -
  -    Unless required by applicable law or agreed to in writing, software
  -    distributed under the License is distributed on an "AS IS" BASIS,
  -    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  -    See the License for the specific language governing permissions and
  -    limitations under the License.
  -->

<script lang="ts">
import {defineComponent, computed, onMounted, onUnmounted, watch} from "@vue/runtime-core";
import {useStore} from "@/store";
import {DynmapCircle, DynmapMarkerSet} from "@/dynmap";
import {ActionTypes} from "@/store/action-types";
import {createCircle, updateCircle} from "@/util/circles";
import {getPointConverter} from '@/util';
import DynmapPolyline from "@/leaflet/vector/DynmapPolyline";
import DynmapPolygon from "@/leaflet/vector/DynmapPolygon";
import DynmapLayerGroup from "@/leaflet/layer/DynmapLayerGroup";

export default defineComponent({
	props: {
		set: {
			type: Object as () => DynmapMarkerSet,
			required: true,
		},
		layerGroup: {
			type: Object as () => DynmapLayerGroup,
			required: true
		}
	},

	setup(props) {
		let updateFrame = 0;

		const store = useStore(),
			currentProjection = computed(() => store.state.currentProjection),
			pendingUpdates = computed(() => {
				const markerSetUpdates = store.state.pendingSetUpdates.get(props.set.id);

				return markerSetUpdates && markerSetUpdates.circleUpdates.length;
			}),
			layers = Object.freeze(new Map<string, DynmapPolyline | DynmapPolygon>()),

			createCircles = () => {
				const converter = getPointConverter();

				props.set.circles.forEach((circle: DynmapCircle, id: string) => {
					const layer = createCircle(circle, converter);

					layers.set(id, layer);
					props.layerGroup.addLayer(layer);
				});
			},

			deleteCircle = (id: string) => {
				let circle = layers.get(id) as DynmapPolyline;

				if (!circle) {
					return;
				}

				props.layerGroup.removeLayer(circle);
				layers.delete(id);
			},

			handlePendingUpdates = () => {
				useStore().dispatch(ActionTypes.POP_CIRCLE_UPDATES, {
					markerSet: props.set.id,
					amount: 10,
				}).then(updates => {
					const converter = getPointConverter();

					for(const update of updates) {
						if(update.removed) {
							deleteCircle(update.id);
						} else {
							const layer = updateCircle(layers.get(update.id), update.payload as DynmapCircle, converter)

							if(!layers.has(update.id)) {
								props.layerGroup.addLayer(layer);
							}

							layers.set(update.id, layer);
						}
					}

					if(pendingUpdates.value) {
						// eslint-disable-next-line no-unused-vars
						updateFrame = requestAnimationFrame(() => handlePendingUpdates());
					} else {
						updateFrame = 0;
					}
				});
			};

		//FIXME: Prevent unnecessary repositioning when changing worlds
		watch(currentProjection, () => {
			const converter = getPointConverter();

			for (const [id, circle] of props.set.circles) {
				updateCircle(layers.get(id), circle, converter);
			}
		});

		watch(pendingUpdates, (newValue, oldValue) => {
			if(newValue && newValue > 0 && oldValue === 0 && !updateFrame) {
				updateFrame = requestAnimationFrame(() => handlePendingUpdates());
			}
		});

		onMounted(() => createCircles());
		onUnmounted(() => updateFrame && cancelAnimationFrame(updateFrame));
	},

	render() {
		return null;
	}
});
</script>
