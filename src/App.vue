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

<template>
	<Map></Map>
	<Sidebar></Sidebar>
	<ChatBox v-if="chatBoxEnabled" v-show="chatBoxEnabled && chatVisible"></ChatBox>
</template>

<script lang="ts">
import {computed, defineComponent, onBeforeUnmount, onMounted, onUnmounted, ref, watch} from 'vue';
import Map from './components/Map.vue';
import Sidebar from './components/Sidebar.vue';
import ChatBox from './components/ChatBox.vue';
import {useStore} from "./store";
import {ActionTypes} from "@/store/action-types";
import {parseUrl} from '@/util';
import {MutationTypes} from "@/store/mutation-types";

export default defineComponent({
	name: 'App',
	components: {
		Map,
		Sidebar,
		ChatBox
	},

	setup() {
		const store = useStore(),
			updateInterval = computed(() => store.state.configuration.updateInterval),
			title = computed(() => store.state.configuration.title),
			currentUrl = computed(() => store.getters.url),
			chatBoxEnabled = computed(() => store.state.components.chatBox),
			chatVisible = computed(() => store.state.ui.visibleElements.has('chat')),
			updatesEnabled = ref(false),
			updateTimeout = ref(0),
			configAttempts = ref(0),

			loadConfiguration = () => {
				store.dispatch(ActionTypes.LOAD_CONFIGURATION, undefined).then(() => {
					startUpdates();
					window.hideSplash();
				}).catch(e => {
					console.error('Failed to load server configuration: ', e);
					window.showSplashError(++configAttempts.value);

					setTimeout(() => loadConfiguration(), 1000);
				});
			},

			startUpdates = () => {
				updatesEnabled.value = true;
				update();
			},

			update = () => {
				//TODO: Error notification for repeated failures?
				store.dispatch(ActionTypes.GET_UPDATE, undefined).finally(() => {
					if(updatesEnabled.value) {
						updateTimeout.value = setTimeout(() => update(), updateInterval.value);
					}
				});
			},

			stopUpdates = () => {
				updatesEnabled.value = false;

				if (updateTimeout.value) {
					clearTimeout(updateTimeout.value);
				}

				updateTimeout.value = 0;
			},

			handleUrl = () => {
				const parsedUrl = parseUrl();

				if(parsedUrl) {
					//Remove legacy url if one was parsed
					if(parsedUrl.legacy) {
						const url = new URL(window.location.href);
						url.searchParams.delete('worldname');
						url.searchParams.delete('mapname');
						url.searchParams.delete('x');
						url.searchParams.delete('y');
						url.searchParams.delete('z');
						url.searchParams.delete('zoom');
						history.replaceState({}, '', url.toString());
					}

					store.commit(MutationTypes.SET_PARSED_URL, parsedUrl);
				}
			},

			onResize = () => {
				store.commit(MutationTypes.SET_SMALL_SCREEN, window.innerWidth < 480 || window.innerHeight < 500);
			};

		watch(title, (title) => document.title = title);
		watch(currentUrl, (url) => window.history.replaceState({}, '', url));

		onMounted(() => loadConfiguration());
		onBeforeUnmount(() => stopUpdates());

		handleUrl();
		onResize();

		onMounted(() => window.addEventListener('resize', onResize));
		onUnmounted(() => window.addEventListener('resize', onResize));

		return {
			chatBoxEnabled,
			chatVisible,
		}
	},
});
</script>
