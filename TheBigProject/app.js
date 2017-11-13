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
                drawer: true
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
    
    
    function init() {
        mdc.autoInit();
        mdc.toolbar.MDCToolbar.attachTo(document.querySelector('.mdc-toolbar'));
        let drawer = new mdc.drawer.MDCPersistentDrawer(document.querySelector('.mdc-persistent-drawer'));
        document.querySelector('.menu').addEventListener('click', () => drawer.open = !drawer.open);
        
        //intialize pages
        self.navbar.title = $(".mdc-toolbar__title#navbarTitle");
        $.each(Object.keys(self.pages), function(i,d) {
            $("a" + d).on("click", function (e) {
                e.preventDefault();
                setPageTo(d);
            });
        });
    }
    
    
    
    
    return {
        init
    };
}