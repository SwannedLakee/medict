/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import Vue from 'vue';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import Buefy from 'buefy'

import routes from './routes';
import { __RANDOM_KEY__ } from '../utils/random_key';
import { cleanUpListeneres } from './init.renderersvc.register';

import 'normalize.css/normalize.css';
// import '@fortawesome/fontawesome-free/js/brands.min.js';
import '@fortawesome/fontawesome-free/js/solid.min.js';
import '@fortawesome/fontawesome-free/js/fontawesome.min.js';
import 'buefy/dist/buefy.min.css';

// customer css
import './renderer.scss';

Vue.config.productionTip = false

// use vuex
Vue.use(Vuex);


// cleanup ipc listener, make sure this invoke before import store
cleanUpListeneres();

// make sure this import after than use vuex
import store from './store';

Vue.use(Buefy);

// Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
const router = new VueRouter({
  routes, // short for `routes: routes`
});
// default view as mainWindow
router.push({ path: store.state.defaultWindow });
Vue.use(VueRouter);

console.log(
  '👋 This message is being logged by "renderer.ts", included via webpack'
);




// Create and mount the root instance.
// Make sure to inject the router with the router option to make the
// whole app router-aware.
const app = new Vue({ router, store });
// remove skeleton
let skeleton = document.querySelector('#skeleton-wrapper')
if (skeleton) {
  skeleton.innerHTML = ''
}

app.$mount('#app');
