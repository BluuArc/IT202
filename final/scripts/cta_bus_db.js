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
        }),
        localCache: {
            directions: {}
        }
    };
    
    function request(endpoint,params){
        const api_url = "http://www.ctabustracker.com/bustime/api/v2/" + 
            endpoint + `?key=${self.key}&format=json` + (params ? `&${params}` : "");
        const url = (self.proxy || "") + (self.doEncodeURI ? encodeURIComponent(api_url) : api_url);
            
        debug.log("requesting",api_url,"through proxy",self.proxy,"| final url:",url);
        return new Promise((fulfill,reject) => {
            try{
                $.get(url, (data) => {
                    fulfill(data["bustime-response"] || data);
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
    
    // return all routes serviced by system
    function getRoutes(){
        // TODO: implement proper caching with DB for up to a day
        if(self.localCache.routes){
            return Promise.resolve(self.localCache.routes);
        }else{
            return request('getroutes').then((routeData) => {
                self.localCache.routes = routeData;
                return routeData;
            });
        }
    }
    
    // return possible directions of a given route (e.g. eastbound, westbound)
    function getDirections(route){
        // TODO: implement proper caching with DB for up to a day
        let key = `r-${route}`;
        if(self.localCache.directions[key]){
            return Promise.resolve(self.localCache.directions[key]);
        }else{
            return request('getdirections', `rt=${route}`).then((directionData) => {
                self.localCache.directions[key] = directionData;
                return directionData;
            });
        }
        
    }
    
    // return set of stops for a specified route and direction
    function getStops(route,direction){
        return request('getstops', `rt=${route}&dir=${direction}`);
    }
    
    function getAllVehiclesInRoute(route){
        return request('getvehicles', `rt=${route}&tmres=s`);
    }
    
    function getVehicleInfo(vehicle_id){
        if(typeof vehicle_id === "string"){
            return request('getvehicles', `vid=${vehicle_id}&tmres=s`);
        }else{ //given array of vehicle IDs
            return request('getvehicles', `vid=${vehicle_id.join(",")}&tmres=s`);
        }
    }
    
    function getStopPredictionData(stop_id){
        return request('getpredictions', `stpid=${stop_id}`);
    }
    
    function getBusPredictionData(vehicle_id){
        return request('getpredictions', `vid=${vehicle_id}`);
    }
    
    return {
        init,
        getSystemTime,
        getRoutes,
        getDirections,
        getStops,
        getAllVehiclesInRoute,
        getVehicleInfo,
        getStopPredictionData,
        getBusPredictionData
    };
};