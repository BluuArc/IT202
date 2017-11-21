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
                currentLocationMarker: undefined,
                markers: [],
                preload: () => {
                    if(self.pages["#mapPage"].markers.length === 0){
                        return getMarkers().then(showMarkersOnMapPage)
                    }else{
                        return Promise.resolve();
                    }
                }
            },
            "#markerListPage": {
                name: "Marker List",
                drawer: true,
                preload: () => { //code to run before showing page
                    return getMarkers()
                        .then((markers) => listPersonalMarkers(markers));
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
        markerIcons: {
            current: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            transportation: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
            personal: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png"
        },
        drawer: undefined,
        prev: undefined,
        snackbar: undefined,
        markerToDelete: undefined,
        dialog: undefined,
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
    
    // all IDs should be in the format of "#<id>"
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
                };
                
                mapData.currentLocationMarker = new google.maps.Marker({
                  position: coords,
                  map: mapData.map,
                  icon: self.markerIcons.current,
                  title: 'Current Location'
                });
                
                if(!mapData.currentLocationWindow){
                    mapData.currentLocationWindow = new google.maps.InfoWindow({
                        content: '<h1 class="text-center">Your Current Location</h1>'
                    });
                }
                
                mapData.currentLocationMarker.addListener('click', () => mapData.currentLocationWindow.open(mapData.map,mapData.currentLocationMarker));
                
                mapData.map.setCenter(coords);
                
                return;
            }).catch((err) => {
                console.error((err));
            })
    }
    
    // create and show marker cards on marker page
    // input: markers object where each marker is keyed by ID
    function listPersonalMarkers(markers) {
        let template = $("#markerListPage #markerTemplate");
        $("#markerListPage .card-container").remove();
        let card_list = $("#markerListPage #card-list");
        let dialog_html = $("#remove-marker-dialog");
        let createCard = (markerInfo) => {
            let card = template.clone().attr("id",markerInfo.id).addClass("card-container");
            card.find("#marker-name").text(markerInfo.name);
            card.find("#marker-id").text(markerInfo.id);
            card.find("#marker-location").html(`<b>Latitude/Longitude: </b>${markerInfo.coords.lat}/${markerInfo.coords.lng}`);
            card.find("#marker-notes").html( markerInfo.notes && markerInfo.notes.length > 0 ? markerInfo.notes : "No notes found.");
            card.find("#marker-date").text(new Date(+markerInfo.id.split("-")[1]).toLocaleString());
            card.find("button#edit").on("click", (e) => {
                debug.log("Clicked edit for", markerInfo);
                showAddMarkerPage("#markerListPage", markerInfo);
            });
            card.find("button#remove").on("click", (e) => {
                debug.log("Clicked remove for", markerInfo);
                self.markerToDelete = markerInfo;
                
                dialog_html.find("#marker-name").text(markerInfo.name);
                dialog_html.find("#marker-location").text(`Latitude: ${markerInfo.coords.lat}/Longitude: ${markerInfo.coords.lng}`);
                dialog_html.find("#marker-notes").html( markerInfo.notes && markerInfo.notes.length > 0 ? markerInfo.notes : "No notes found.");
                
                self.dialog.$object.show();
                self.dialog.show();
            });
            
            card_list.append(card);
        }
        // show message for when no markers are present
        if(!markers || Object.keys(markers).length === 0){
            debug.log("listPersonalMarkers: markers is empty");
            let note_element = `
                <div class="mdc-layout-grid__cell--span-12 card-container">
                    <div class="mdc-card">
                      <section class="mdc-card__primary">
                        <h1 class="mdc-card__title mdc-card__title--large" id="marker-name">No Markers Found</h1>
                      </section>
                      <section class="mdc-card__supporting-text" id="marker-notes">
                        Try adding a marker by clicking the button on the bottom left of the screeen.
                      </section>
                    </div>
                </div>
            `
            $(note_element).appendTo(card_list);
            return;
        }
        let keys = Object.keys(markers).sort((a,b) => a < b ? true : false); //sort alphabetically
        keys.map((k) => createCard(markers[k]));
    }
    
    // create and show markers on map page
    // input: markers object where each marker is keyed by ID
    function showMarkersOnMapPage(markers){
        let page_data = self.pages["#mapPage"];
        
        // delete old markers
        page_data.markers.map((m) => { m.mapMarker.setMap(null) });
        
        let keys = Object.keys(markers);
        page_data.markers = keys.map((m) => {
            let marker = markers[m];
            
            // info window code referenced from https://developers.google.com/maps/documentation/javascript/examples/infowindow-simple
            let window_content = `
                <div class="infowindow">
                    <h1>${marker.name || marker.id}</h1>
                    <p><b>ID: </b>${marker.id}</p>
                    <p><b>Latitude/Longitude: </b>${marker.coords.lat}/${marker.coords.lng}</p>
                    <p>${marker.notes || "No notes found"}</p>
                </div>
            `;
            marker.infoWindow = new google.maps.InfoWindow({
                content: window_content
            });
            marker.mapMarker = new google.maps.Marker({
                position: marker.coords,
                map: page_data.map,
                title: marker.name,
                icon: self.markerIcons[marker.type]
            });
            marker.mapMarker.addListener('click', () => marker.infoWindow.open(page_data.map, marker.mapMarker));
            return marker;
        });
    }
    
    // separate function needed for custom filling of fields
    function showAddMarkerPage(prevPage, marker = {}){
        let markerPage = $(".page#addMarkerPage");
        // preset form data
        markerPage.find("#marker-id").val(marker.id || "m-" + (new Date() - 0)); //key markers by creation date
        if(!marker.coords){
            let coords = self.pages["#mapPage"].currentLocationMarker.getPosition();
            markerPage.find("#marker-latitude").val(coords.lat());
            markerPage.find("#marker-longitude").val(coords.lng());    
        }else{
            markerPage.find("#marker-latitude").val(marker.coords.lat);
            markerPage.find("#marker-longitude").val(marker.coords.lng);
        }
        
        markerPage.find("#marker-name").val(marker.name || "");
        markerPage.find("#marker-notes").val((marker.notes !== undefined ? marker.notes.replace(/<br>/g, '\n') : ""));
        
        // remove any invalid-related classes
        markerPage.find(".mdc-text-field--invalid").each(function(){
          $(this).removeAttr(".mdc-text-field--invalid");
        })
        
        setPageTo("#addMarkerPage",prevPage).then(() => {
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
            
            // get form data
            // linebreak fix from https://stackoverflow.com/questions/16165286/copy-from-textarea-to-div-preserving-linebreaks
            let markerInfo = {
                name: markerPage.find("#marker-name").val(),
                id: markerPage.find("#marker-id").val(),
                coords: {
                    lat: +markerPage.find("#marker-latitude").val(),
                    lng: +markerPage.find("#marker-longitude").val(),    
                },
                notes: markerPage.find("#marker-notes").val().replace(/\n/g, '<br>'),
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
                showAddMarkerPage(d)
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
                        debug.log("Overwriting old marker",existing);
                        return db.removeItem(options.id);
                    }else{
                        return Promise.resolve();
                    }
                }).then(() => {
                    return db.setItem(options.id, options);
                }).then(() => getMarkers().then(showMarkersOnMapPage)) //update map
                .then(() => debug.log("Added new marker", options));
        }
    }
    
    function removeMarker(markerKey){
        let db = self.db;
        return db.getItem(markerKey)
            .then((item) => {
                if(item){
                    debug.log("Deleting marker", item);
                    return db.removeItem(markerKey);
                }else{
                    throw "Does not exist";
                }
            });
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
    
    // needed for conversion from old format to new format
    function updateDB(){
        let db = self.db;
        let markers = [], doChange = false;
        return db.iterate((value,key,index) => {
            if(!value.coords.lat || !value.coords.lng || value.coords.latitude || value.coords.longitude){
                debug.log("Converting coords for", value);
                value.coords.lat = +value.coords.latitude;
                value.coords.lng = +value.coords.longitude;
                delete value.coords.latitude;
                delete value.coords.longitude;
                debug.log("New value", value);
                doChange = true;
            }
            
            if(value.visibility === undefined){
                debug.log("Adding visibility field to",value);
                value.visibility = true; //visible by default
                doChange = true;
            }
            markers.push(value);
        }).then(() => {
            if(doChange){
                debug.log("Clearing database and re-adding info");
                return db.clear().then(() => {
                    let loadPromises = [];
                    markers.map((m) => loadPromises.push(db.setItem(m.id,m)));
                    return Promise.all(loadPromises);
                })
            }else{
                return Promise.resolve();
            }
        }).then(() => {
            debug.log("Finished updating DB");
        })
    }

    
    function init() {
        mdc.autoInit();
        
        // intiialize navbar
        mdc.toolbar.MDCToolbar.attachTo(document.querySelector('.mdc-toolbar'));
        self.drawer = new mdc.drawer.MDCTemporaryDrawer(document.querySelector('.mdc-temporary-drawer'));
        self.navbar.menuButton = $("#mainNavbar .menu");
        
        self.navbar.menuButton.on("click",function(e) {
            if(self.prev){
                setPageTo(self.prev);
            }else{
                self.drawer.open = !self.drawer.open;
            }
        });
        
        self.navbar.title = $(".mdc-toolbar__title#navbarTitle");
        
        // initialize snackbar
        // reference: https://material.io/components/web/catalog/snackbars/
        const MDCSnackbar = mdc.snackbar.MDCSnackbar;
        const MDCSnackbarFoundation = mdc.snackbar.MDCSnackbarFoundation;
        self.snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));
        
        // initialize dialog box
        // reference: https://material.io/components/web/catalog/dialogs/
        const MDCDialog = mdc.dialog.MDCDialog;
        const MDCDialogFoundation = mdc.dialog.MDCDialogFoundation;
        const util = mdc.dialog.util;
        
        self.dialog = new MDCDialog(document.querySelector("#remove-marker-dialog"));
        self.dialog.$object = $("#remove-marker-dialog");
        
        self.dialog.listen('MDCDialog:accept', () => {
            if(self.markerToDelete){
                // delete and update lists
                removeMarker(self.markerToDelete.id).then(() => {
                    return Promise.all([
                        setPageTo('#markerListPage'),
                        getMarkers().then(showMarkersOnMapPage)
                    ])
                })
            }
        });
        
        self.dialog.listen('MDCDialog:cancel', function() {
          self.dialog.close();
          self.dialog.$object.hide();
          self.markerToDelete = undefined;
        });
        
        self.dialog.close();
        self.dialog.$object.hide();
        
        initializePages();
        initializeServiceWorker();
        
        let dbInit = self.db.ready()
            .then(() => updateDB())
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