// 'use strict';
/* global caches */

// from tutorial: https://codelabs.developers.google.com/codelabs/your-first-pwapp/index.html#5

var cacheName = 'weatherPWA-step-6-3';
var filesToCache = [
    './',
    './index.html',
    './scripts/app.js',
    './styles/inline.css',
    './images/clear.png',
    './images/cloudy-scattered-showers.png',
    './images/cloudy.png',
    './images/fog.png',
    './images/ic_add_white_24px.svg',
    './images/ic_refresh_white_24px.svg',
    './images/partly-cloudy.png',
    './images/rain.png',
    './images/scattered-showers.png',
    './images/sleet.png',
    './images/snow.png',
    './images/thunderstorm.png',
    './images/wind.png'
];

var sw = {
    log: function(...args){ console.log('[ServiceWorker]',...args); }
};

self.addEventListener('install', function (e) {
    sw.log('Install');
    e.waitUntil(
        caches.open(cacheName).then(function(cache){
            sw.log('Caching app shell')
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function(e){
    sw.log('Activate');
    e.waitUntil(
        //update cache whenever any of the app shell files change
        //increment/change cache name to make it work
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map((key) => {
                if(key !== cacheName){
                    sw.log('Removing old cache',key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

//intercept requests from pwa
self.addEventListener('fetch',function(e) {
    sw.log('Fetch',e.request.url);
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    )
})