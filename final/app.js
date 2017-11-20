'use strict';
/* global mdc $ */
var App = function(options){
    let debug = {
        mode: location.hostname.indexOf("c9users.io") > -1 || location.hostname.indexOf("127.0.0.1") > -1,
        log: function(...args){ if(this.mode) console.log('[App]',...args); }
    };
    let self = {
        pages: {
            "#generalPage": {
                name: "General",
                drawer: true //check to see if it's a drawer link
            },
            "#mapPage": {
                name: "Map",
                drawer: true,
                map: undefined,
                currentLocationMarker: undefined
            },
            "#markerListPage": {
                name: "Marker List",
                drawer: true
            },
            "#addMarkerPage": {
                name: "Add Marker",
                drawer: false,
                map: undefined,
                currentLocationMarker: undefined
            }
        },
        navbar: {
            title: undefined,
            menuButton: undefined
        },
        drawer: undefined,
        prev: undefined,
        snackbar: undefined,
        personal_markers: [],
        transport_markers: []
    }
    
    function debugLog(argument) {
        // body...
    }
    
    function notify(options = {}) {
        if(!self.snackbar){
            throw "Snackbar not initialized";
        }
        
        let notifData = {
            message: options.message,
            actionText: options.actionText,
            actionHandler: options.actionHandler,
            timeout: options.timeout || 5000
        };
        
        self.snackbar.show(notifData);
    }
    
    function setPageTo(pageId, prevPage) {
        let delay = 125;
        let pages = $(".page");
        
        pages.each(function(){
            let curElem = $(this);
            let id = "#" + curElem.attr("id");
            curElem.fadeOut(delay);
            if(self.pages[id] && self.pages[id].drawer){
                $("a" + id).removeClass("mdc-temporary-drawer--selected");
            }
        });
        
        self.navbar.title.fadeOut(delay);
        
        return new Promise((fulfill, reject) => {
            setTimeout(() => {
                let page = $(".page" + pageId);
                self.navbar.title.text(self.pages[pageId].name);
                
                //change highlighted icon in drawer
                if(self.pages[pageId].drawer){
                    $("a" + pageId).addClass("mdc-temporary-drawer--selected");
                }
                
                //change menu button to back button
                self.prev = prevPage;
                self.navbar.menuButton.text(self.prev ? "arrow_back" : "menu");
                
                page.fadeIn(delay);
                self.navbar.title.fadeIn(delay,() => {
                    fulfill();
                });
                
            },delay);    
        })
        
        
        
    }
    
    //from app14
    function getCurrentLocation() {
        return new Promise((fulfill,reject) => {
            if (!navigator.geolocation){
                alert("Geolocation is not supported by your browser");
                reject("Geolocation is not supported by your browser");
            }
            navigator.geolocation.getCurrentPosition(fulfill, reject);
        });
    }
    
    // from https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/Using_geolocation
    function showCurrentLocation(mapData){
        return getCurrentLocation()
            .then((data) => { //show marker
                //hide previous marker
                if(mapData.currentLocationMarker){
                    // from https://developers.google.com/maps/documentation/javascript/markers
                    mapData.currentLocationMarker.setMap(null);
                }
                
                
                let coords = {
                    lat: data.coords.latitude,
                    lng: data.coords.longitude
                }
                
                mapData.currentLocationMarker = new google.maps.Marker({
                  position: coords,
                  map: mapData.map
                });
                
                mapData.map.setCenter(coords);
                
                return;
            }).catch((err) => {
                console.error((err));
            })
    }
    
    function initializePages(argument) {
        // all pages
        let pages = $(".pages");
        
        pages.css("padding-top", $("#mainNavbar").height()*1.1);
        $("#mapPage #map").css("height", $("body").height() - $("#mainNavbar").height())
            .css("margin-top", '14px');
            
        $("#addMarkerPage #newMarkerMap").css("height", $(".content").height()*0.95 - $("#addMarkerPage").height() - $("#addMarkerPage .mdc-card__actions").height())
            // .css("margin-top", '14px');
        
        $.each(Object.keys(self.pages), function(i,d) {
            $("a" + d).on("click", function (e) {
                e.preventDefault();
                setPageTo(d);
                self.drawer.open = false;
            });
        });
        
        // page specific inits
        // initialize map page
        self.pages["#mapPage"].map = new google.maps.Map(document.getElementById('map'), {
          zoom: 15,
        });
        
        //conditionally initialize map
        ["#mapPage", "#markerListPage"].forEach(function(d,i){
            $(`.page${d}`).find("#addLocationButton").on("click", function(e){
                setPageTo("#addMarkerPage",d).then(() => {
                    let page_data = self.pages["#addMarkerPage"];
                    if(!page_data.map){
                        page_data.map = new google.maps.Map($("#addMarkerPage #newMarkerMap").get(0), {
                          zoom: 15,
                        });
                    }
                    
                    let locationPromise;
                    if(!page_data.currentLocationMarker){
                        locationPromise = showCurrentLocation(page_data);
                    }else{
                        locationPromise = getCurrentLocation()
                            .then((data) => {
                                let coords = {
                                    lat: data.coords.latitude,
                                    lng: data.coords.longitude
                                };
                                
                                page_data.currentLocationMarker.setPosition(coords);
                                return;
                            })
                    }
                })
            })
        })
    }
    
    function initializeServiceWorker() {
        if('serviceWorker' in navigator) {
            // SW messaging referenced from http://craig-russell.co.uk/2016/01/29/service-worker-messaging.html
            navigator.serviceWorker.addEventListener('message',function (event) {
                let data = event.data;
                debug.log("SW to Client:",event);
                if(data.hasUpdate){
                    notify({
                        message: "Reload to update application",
                        actionText: "Reload",
                        actionHandler: () => location.reload()
                    });
                }
                if(data.version){
                    $("#appVersion").text(data.version);
                }
            });
            
            navigator.serviceWorker.register('sw.js')
                .then(function(registration) {
                    debug.log('Service Worker Registered');
                });
            
            navigator.serviceWorker.ready.then(function(registration) {
                debug.log('Service Worker Ready');
                
                //request for version
                let channel = new MessageChannel();
                navigator.serviceWorker.controller.postMessage({version: true},[channel.port2]);
            });
        }
    }

    
    function init() {
        mdc.autoInit();
        mdc.toolbar.MDCToolbar.attachTo(document.querySelector('.mdc-toolbar'));
        self.drawer = new mdc.drawer.MDCTemporaryDrawer(document.querySelector('.mdc-temporary-drawer'));
        self.navbar.menuButton = $("#mainNavbar .menu");
        self.navbar.menuButton.on("click",function(e) {
            if(self.prev){
                setPageTo(self.prev);
            }else{
                self.drawer.open = !self.drawer.open;
            }
        })
        
        self.navbar.title = $(".mdc-toolbar__title#navbarTitle");
        
        // initialize snackbar
        // reference: https://material.io/components/web/catalog/snackbars/
        const MDCSnackbar = mdc.snackbar.MDCSnackbar;
        const MDCSnackbarFoundation = mdc.snackbar.MDCSnackbarFoundation;
        self.snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));
        
        initializePages();
        initializeServiceWorker();
        
        
        return showCurrentLocation(self.pages["#mapPage"])
            .then(() => {
                setTimeout(() => setPageTo("#generalPage"), 150); //delayed change
            });
    }
    
    
    
    
    return {
        init,
        setPageTo
    };
}