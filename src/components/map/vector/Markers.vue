<script lang="ts">
import {defineComponent, computed, onMounted, onUnmounted, watch} from "@vue/runtime-core";
import {LayerGroup, Marker} from 'leaflet';
import {useStore} from "@/store";
import {DynmapMarker, DynmapMarkerSet} from "@/dynmap";
import {ActionTypes} from "@/store/action-types";
import {createMarker, updateMarker} from "@/util/markers";

export default defineComponent({
	props: {
		set: {
			type: Object as () => DynmapMarkerSet,
			required: true,
		},
		layerGroup: {
			type: Object as () => LayerGroup,
			required: true
		}
	},

	setup(props) {
		let updateFrame = 0;

		const store = useStore(),
			currentProjection = computed(() => store.state.currentProjection),
			pendingUpdates = computed(() => {
				const markerSetUpdates = store.state.pendingSetUpdates.get(props.set.id);

				return markerSetUpdates && markerSetUpdates.markerUpdates.length;
			}),
			layers = Object.freeze(new Map()) as Map<string, Marker>,

			createMarkers = () => {
				const projection = currentProjection.value;

				props.set.markers.forEach((marker: DynmapMarker, id: string) => {
					const layer = createMarker(marker, projection);

					layers.set(id, layer);
					props.layerGroup.addLayer(layer);
				});
			},

			deleteMarker = (id: string) => {
				let marker = layers.get(id) as Marker;

				if(!marker) {
					return;
				}

				marker.remove();
				layers.delete(id);
			},

			handlePendingUpdates = () => {
				useStore().dispatch(ActionTypes.POP_MARKER_UPDATES, {
					markerSet: props.set.id,
					amount: 10,
				}).then(updates => {
					const projection = currentProjection.value;

					for(const update of updates) {
						if(update.removed) {
							console.log(`Deleting marker ${update.id}`);
							deleteMarker(update.id);
						} else {
							console.log(`Updating/creating marker ${update.id}`);
							layers.set(update.id, updateMarker(layers.get(update.id), update.payload as DynmapMarker, projection));
						}
					}

					if(pendingUpdates.value) {
						console.log('More updates left, scheduling frame');
						// eslint-disable-next-line no-unused-vars
						updateFrame = requestAnimationFrame(() => handlePendingUpdates());
					} else {
						updateFrame = 0;
					}
				});
			};

		//FIXME: Prevent unnecessary repositioning when changing worlds
		watch(currentProjection, () => {
			const projection = currentProjection.value;

			for (const [id, marker] of props.set.markers) {
				updateMarker(layers.get(id), marker, projection);
			}
		});

		watch(pendingUpdates, (newValue, oldValue) => {
			if(newValue && newValue > 0 && oldValue === 0 && !updateFrame) {
				updateFrame = requestAnimationFrame(() => handlePendingUpdates());
			}
		});

		onMounted(() => createMarkers());
		onUnmounted(() => updateFrame && cancelAnimationFrame(updateFrame));
	},

	render() {
		return null;
	}
});
</script>