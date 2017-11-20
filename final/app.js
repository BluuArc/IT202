'use strict';
/* global mdc $ localforage */
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
                drawer: true,
                preload: () => { //code to run before showing page
                    return getMarkers()
                        .then((markers) => showMarkers(markers));
                }
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
        db: localforage.createInstance({
          name: "final-waypoint-finder"
        })
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
                let preloadPromise;
                if(self.pages[pageId] && typeof self.pages[pageId].preload === 'function'){
                    preloadPromise = self.pages[pageId].preload();
                }else{
                    preloadPromise = Promise.resolve();
                }
                
                preloadPromise.then(() => {
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
    
    // create and show marker cards on marker page
    function showMarkers(markers) {
        if(!markers){
            debug.log("showMarkers: markers is empty");
            return;
        }
        let keys = Object.keys(markers).sort((a,b) => a < b ? true : false); //sort alphabetically
        let template = $("#markerListPage #markerTemplate");
        $("#markerListPage .card-container").remove();
        let card_list = $("#markerListPage #card-list");
        keys.map((k) => {
            let markerInfo = markers[k];
            let card = template.clone().attr("id",markerInfo.id).addClass("card-container");
            card.find("#marker-name").text(markerInfo.name);
            card.find("#marker-location").text(`Latitude: ${markerInfo.coords.latitude}/Longitude: ${markerInfo.coords.longitude}`);
            card.find("#marker-notes").text( markerInfo.notes && markerInfo.notes.length > 0 ? markerInfo.notes : "No notes found.");
            card.find("button#edit").on("click", (e) => {
                debug.log("Clicked edit for", markerInfo);
            });
            card.find("button#remove").on("click", (e) => {
                debug.log("Clicked remove for", markerInfo);
            });
            
            card_list.append(card);
        });
    }
    
    function initializePages(argument) {
        // all pages
        let pages = $(".pages");
        
        pages.css("padding-top", $("#mainNavbar").height()*1.1);
        $("#mapPage #map").css("height", $("body").height() - $("#mainNavbar").height())
            .css("margin-top", '14px');
        
        $.each(Object.keys(self.pages), function(i,d) {
            $("a" + d).on("click", function (e) {
                e.preventDefault();
                setPageTo(d);
                self.drawer.open = false;
            });
        });
        
        // initialize all text boxes
        $(".mdc-text-field").each(function(){
            mdc.textField.MDCTextField.attachTo(this);
        });
        
        // page specific inits
        // initialize map page
        self.pages["#mapPage"].map = new google.maps.Map(document.getElementById('map'), {
          zoom: 15,
        });
        
        // initialize marker page
        let markerPage = $(".page#addMarkerPage");
        markerPage.find("button#cancel").on("click", (e) => {
            e.preventDefault();
            setPageTo(self.prev);
        });
        markerPage.find("button#save").on("click", (e) => {
            e.preventDefault();
            
            //get form data
            let markerInfo = {
                name: markerPage.find("#marker-name").val(),
                id: markerPage.find("#marker-id").val(),
                coords: {
                    latitude: markerPage.find("#marker-latitude").val(),
                    longitude: markerPage.find("#marker-longitude").val(),    
                },
                notes: markerPage.find("#marker-notes").val(),
                type: 'personal'
            };
            if(markerInfo.name.length === 0){
                console.error("Name must have at least 1 character");
                return;
            }
            try{
                return addMarker(markerInfo).then(() => setPageTo(self.prev));
            }catch(err){
                console.error(err);
            }
            
        });
        
        //conditionally initialize map and marker fields
        ["#mapPage", "#markerListPage"].forEach(function(d,i){
            $(`.page${d}`).find("#addLocationButton").on("click", function(e){
                
                // preset form data
                markerPage.find("#marker-id").val("m-" + (new Date() - 0)); //key markers by creation date
                let coords = self.pages["#mapPage"].currentLocationMarker.getPosition();
                markerPage.find("#marker-latitude").val(coords.lat());
                markerPage.find("#marker-longitude").val(coords.lng());
                markerPage.find("#marker-name").val("");
                markerPage.find("#marker-notes").val("");
                
                // remove any invalid-related classes
                markerPage.find(".mdc-text-field--invalid").each(function(){
                  $(this).removeAttr(".mdc-text-field--invalid");
                })
                
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
                            });
                    }
                });
            });
        });
        
        // offset height of marker options based on form size
        let markerMapHeight = Math.max($(".content").height()*0.95 - $("#addMarkerPage").height() - $("#addMarkerPage .mdc-card__actions").height(),200);
        $("#addMarkerPage #newMarkerMap").css("height", markerMapHeight)
        
    }
    
    function addMarker(options = {}){
        debug.log("Adding marker", options);
        const fields = ['id', 'name','coords','notes', 'type'];
        let isInvalid = fields.reduce((acc,curr) => acc || options[curr] === undefined,false);
        if(isInvalid){
            throw "Invalid marker data";
        }else{
            debug.log("Marker data is valid");
            
            let db = self.db;
            
            return db.getItem(options.id)
                .then((existing) => {
                    // remove existing object, if it exists
                    if(existing){
                        console.log("Overwriting old marker",existing);
                        return db.removeItem(options.id);
                    }else{
                        return Promise.resolve();
                    }
                }).then(() => {
                    return db.setItem(options.id, options);
                }).then(() => debug.log("Added new marker", options));
        }
    }
    
    // create a local copy of markers from cache
    function getMarkers() {
        let markers = {};
        return self.db.iterate(function(value,key,index) {
            markers[key] = value;
        }).then(() => markers);
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
                        actionHandler: () => location.reload(),
                        timeout: 10000
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
        
        let dbInit = self.db.ready()
            .then(() => {
                debug.log("DB ready");
            });
            
        let mapInit = showCurrentLocation(self.pages["#mapPage"])
            .then(() => {
                setTimeout(() => setPageTo("#generalPage"), 150); //delayed change
            });
        
        
        return Promise.all([dbInit,mapInit])
            .then(() => debug.log("Initialization finished"));
    }
    
    
    return {
        init,
        setPageTo
    };
}