/*
 *
 *  Air Horner
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
 
// Initially from project 7

let version = '0.0.024x';
let appName = 'TheBigProject';
let appCacheName = `${appName}_${version}`;

const appShellFiles = [
  './',
  './index.html',
  './app.js',
  './assets/ic_location_on_black_24dp/web/ic_location_on_black_24dp_32.ico',
  './assets/ic_location_on_black_24dp/web/ic_location_on_black_24dp_128.png',
  './assets/ic_location_on_black_24dp/web/ic_location_on_black_24dp_144.png',
  './assets/ic_location_on_black_24dp/web/ic_location_on_black_24dp_256.png',
  './assets/ic_location_on_black_24dp/web/ic_location_on_black_24dp_512.png',
  'https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js',
  'https://code.jquery.com/jquery-3.2.1.min.js'
];

importScripts('./scripts/cache-polyfill.js');

var sw = {
    log: function(...args){ console.log('[ServiceWorker]',...args); }
};

self.addEventListener('install', e => {
  let timeStamp = Date.now();
  e.waitUntil(
    caches.open(appCacheName).then(cache => {
      return cache.addAll(appShellFiles)
      .then(() => self.skipWaiting());
    })
  )
});

//clean up older cache, from project 5
self.addEventListener('activate', function(e){
    sw.log('Activate');
    let hasUpdate = false;
    e.waitUntil(
        //update old cache whenever any of the app shell files change
        //increment/change cache name to make it work
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map((key) => {
                if(key.indexOf(appName) > -1 && key !== appCacheName){
                    sw.log('Removing old cache',key);
                    hasUpdate = true;
                    return caches.delete(key);
                }
            }));
        }).then(() => {
          return self.clients.claim();      
        })
    );
});

self.addEventListener('fetch', event => {
  // console.log(event.request);
  event.respondWith(
    caches.match(event.request, {ignoreSearch:true}).then(response => {
      return response || fetch(event.request);
    })
  );
});