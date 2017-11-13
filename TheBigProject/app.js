'use strict';
/* global mdc $ */
var App = function(options){
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
            }
        },
        navbar: {
            title: undefined
        }
    }
    
    function setPageTo(pageId) {
        let delay = 125;
        let pages = $(".page");
        
        pages.each(function(){
            let curElem = $(this);
            let id = "#" + curElem.attr("id");
            curElem.fadeOut(delay);
            if(self.pages[id] && self.pages[id].drawer){
                $("a" + id).removeClass("mdc-persistent-drawer--selected");
            }
        });
        
        self.navbar.title.fadeOut(delay);
        
        setTimeout(() => {
            let page = $(".page" + pageId);
            self.navbar.title.text(self.pages[pageId].name);
            
            if(self.pages[pageId].drawer){
                $("a" + pageId).addClass("mdc-persistent-drawer--selected");
            }
            page.fadeIn(delay);
            self.navbar.title.fadeIn(delay);
        },delay);
        
        
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
    
    
    function init() {
        mdc.autoInit();
        mdc.toolbar.MDCToolbar.attachTo(document.querySelector('.mdc-toolbar'));
        let drawer = new mdc.drawer.MDCPersistentDrawer(document.querySelector('.mdc-persistent-drawer'));
        document.querySelector('.menu').addEventListener('click', () => drawer.open = !drawer.open);
        
        //intialize pages
        let pages = $(".pages");
        
        pages.css("padding-top", $("#mainNavbar").height()*1.1);
        $("#mapPage #map").css("height", $("body").height() - $("#mainNavbar").height())
            .css("margin-top", '14px');
        self.navbar.title = $(".mdc-toolbar__title#navbarTitle");
        $.each(Object.keys(self.pages), function(i,d) {
            $("a" + d).on("click", function (e) {
                e.preventDefault();
                setPageTo(d);
            });
        });
        
        // initialize map
        self.pages["#mapPage"].map = new google.maps.Map(document.getElementById('map'), {
          zoom: 15,
        });
        
        
        return showCurrentLocation(self.pages["#mapPage"]);
    }
    
    
    
    
    return {
        init
    };
}