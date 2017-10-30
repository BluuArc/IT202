// 'use strict';
/* global caches fetch */

// from tutorial: https://codelabs.developers.google.com/codelabs/your-first-pwapp/index.html#5

var cacheName = 'weatherPWA-step-6-4';
var dataCacheName = 'weatherData-v2';
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

//clean up older cache
self.addEventListener('activate', function(e){
    sw.log('Activate');
    e.waitUntil(
        //update cache whenever any of the app shell files change
        //increment/change cache name to make it work
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map((key) => {
                if(key !== cacheName && key !== dataCacheName){
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
    let dataUrl = 'https://query.yahooapis.com/v1/public/yql';
    if(e.request.url.indexOf(dataUrl) > -1){
        //asking for fresh weather data
        //SW goes to network and caches response -> "cache then network" strategy
        //https://jakearchibald.com/2014/offline-cookbook/#cache-then-network
        e.respondWith(
            caches.open(dataCacheName).then((cache) => {
                return fetch(e.request).then((response) => {
                    cache.put(e.request.url, response.clone());
                    return response;
                });
            })
        )
    }else{ 
        //asking for app shell files
        //"cache, falling back to network" offline strategy
        //https://jakearchibald.com/2014/offline-cookbook/#cache-falling-back-to-network
        e.respondWith(
            caches.match(e.request).then((response) => response || fetch(e.request))
        )   
    }
})