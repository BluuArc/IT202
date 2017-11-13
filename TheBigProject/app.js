
var App = function(options){
    let self = {
        pages: {
            "#generalPage": {
                name: "General",
            },
            "#mapPage": {
                name: "Map"
            },
            "#markerListPage": {
                name: "Marker List"
            }
        },
        navbar: {
            title: undefined
        }
    }
    
    function setPageTo(pageId) {
        let delay = 125;
        $(".page").fadeOut(delay);
        self.navbar.title.fadeOut(delay);
        
        setTimeout(() => {
            self.navbar.title.text(self.pages[pageId].name);
            $(".page" + pageId).fadeIn(delay);
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