"use strict";

let CTA_BUS_DB = function(options){
    let debug = {
        mode: location.hostname.indexOf("c9users.io") > -1 || location.hostname.indexOf("127.0.0.1") > -1 || options.debug,
        log: function(...args){ if(this.mode) console.log('[CTA DB]',...args); }
    };
    let self = {
        key: options.key,
        proxy: options.proxy,
        doEncodeURI: options.doEncodeURI,
        db: localforage.createInstance({
            name: "cta_bus_db"
        })
    };
    
    function request(endpoint,params){
        const api_url = "http://www.ctabustracker.com/bustime/api/v2/" + 
            endpoint + `?key=${self.key}&format=json` + (params ? `&${params}` : "");
        const url = (self.proxy || "") + (self.doEncodeURI ? encodeURIComponent(api_url) : api_url);
            
        debug.log("requesting",url);
        return new Promise((fulfill,reject) => {
            try{
                $.get(url, (data) => {
                    fulfill(data);
                })    
            }catch(err){
                reject(err);
            }
        });
    }
    
    function init(){
        debug.log(self);
        return self.db.ready()
            .then(() => debug.log("Ready"));
    }
    
    function getSystemTime(){
        return request('gettime');
    }
    
    return {
        init,
        getSystemTime
    };
};