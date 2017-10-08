/* global $ google */

var loadedData; //for debugging
// data source: https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4ijn-s7e5
$(document).ready(function() {
  // initMap();
  loadData().then((data) => {
    return initializeForm(data);
  }).then(() => {
    $("#submitButton").attr("disabled",null);
    console.log("ready");
  })
});

function loadData(filters) {
  return new Promise(function(fulfill, reject) {
    $.get("https://data.cityofchicago.org/resource/cwig-ma7x.json?" + (filters && filters.length > 0 ? `${filters}` : ""), function(response) {
      loadedData = response;
      fulfill(response);
    });
  });
}

function getFacilityTypes() {
  return new Promise(function(fulfill,reject){
    $.get("https://data.cityofchicago.org/resource/cwig-ma7x.json?$select=facility_type,count(*)&$group=facility_type&$order=count(*)%20desc",function(response){
      let facility_types = response.map((d) => { return d.facility_type || ""; }) //convert result to facility types
        .filter((d) => { return d.length > 0; }) //remove any empty entries
        .sort() //sort alphabetically
      fulfill(facility_types);
    });
  });
}

//given an array and key, return array of unique values of key
function getUniqueKeyValues(array, key, keepUndefined) {
  let results = [];
  for (let d of array) {
    if (results.indexOf(d[key]) === -1) {
      if (d[key] !== undefined || keepUndefined)
        results.push(d[key]);
    }
  }
  return results;
}

function isValidZip(zip) {
  // source: https://stackoverflow.com/questions/160550/zip-code-us-postal-code-validation
  return (/(^\d{5}$)|(^\d{5}-\d{4}$)/.test(zip));
}

function initializeForm(data) {
  return getFacilityTypes().then((facility_types) => {
    const inspection_results = getUniqueKeyValues(data, "results");
    let template_option = $("<option></option>");
  
    //add facility types and inspection results to form
    let facility_field = $("#inputFacilityType");
    let status_field = $("#inputStatus");
  
    template_option.clone().text("No Filter Selected").appendTo(facility_field);
    for (const f of facility_types) {
      template_option.clone().text(f).appendTo(facility_field);
    }
  
    template_option.clone().text("No Filter Selected").appendTo(status_field);
    for (const s of inspection_results) {
      template_option.clone().text(s).appendTo(status_field);
    }
  
    //add handler to button
    $("#submitButton").on('click', submitFilters);
  });
}

//when activated, get filters and populate views
function submitFilters(button_event) {
  button_event.preventDefault();
  $("#mapContainer").addClass("hidden");
  $("#results-msg").text("Validating input...");
  $(".list-entry[id!=template]").remove();

  let form_input = {
    inspection_date: $("#inputDate").val().length === 0 ? "" : new Date($("#inputDate").val()).toISOString(),
    facility_type: $("#inputFacilityType").val() === "No Filter Selected" ? "" : $("#inputFacilityType").val(),
    results: $("#inputStatus").val() === "No Filter Selected" ? "" : $("#inputStatus").val(), //inspection results
    zip: $("#inputZip").val(),
    $limit: $("#inputLimit").val()
  };

  //delete any empty field
  for (let f of Object.keys(form_input)) {
    if (form_input[f].length === 0) {
      delete form_input[f];
    }else if(f === "inspection_date"){
      form_input[f] = form_input[f].slice(0,form_input[f].length-2); //remove trailing Z
    }
  }

  //validate zip code
  if (form_input.zip && !isValidZip(form_input.zip)) {
    $("#inputZip").addClass("is-invalid");
    $("#results-msg").text("Validation error encountered.");
    return;
  }
  else {
    $("#inputZip").removeClass("is-invalid");
  }
  
  //validate limit
  if(form_input.$limit && !(+form_input.$limit >= 0 && +form_input.$limit <= 5000)){
    $("#inputLimit").addClass("is-invalid");
    $("#results-msg").text("Validation error encountered.");
    return;
  }else{
    $("#inputLimit").removeClass("is-invalid");
  }

  let filtered_input = $.param(form_input);
  if (filtered_input.indexOf("&") === 0) {
    filtered_input = filtered_input.slice(1); //strip leading ampersand
  }

  
  $("#results-msg").text("Loading data...");
  return loadData(filtered_input)
    .then((data) => {
      let contentContainer = $("#contentContainer");
      let mapContainer = $("#mapContainer");
      if(contentContainer.hasClass("hidden")){
        $("#contentContainer").removeClass("hidden");  
      }
      $("#map-tab").click(); //always start on map tab so map loads properly
      mapContainer.removeClass("hidden");
      
      addListEntries(data);
      
      setTimeout(() => {initMap(data)}, 250); //add delay to fix map loading bug
      
      $("#results-msg").text(`Loaded ${data.length} ${data.length === 1 ? "entry" : "entries"}`);
    });
}

function addListEntry(entry) {
  let entryCard = $("#template").clone();
  const autofill_fields = ["facility_type", "dba_name", "aka_name" ,"inspection_id", "inspection_type", "results"];

  for (const f of autofill_fields) {
    entryCard.find(`#${f}`).text(entry[f] || "Unknown");
  }
  
  entryCard.find("#inspection_date")
    .text(new Date(entry.inspection_date).toDateString());
  
  //maps url referenced from https://developers.google.com/maps/documentation/urls/guide
  let address = `${entry.address.trim()}, ${entry.city}, ${entry.state}, ${entry.zip}`;
  let address_fields = ["address", "city", "state", "zip"];
  entryCard.find("#address_link")
    .text(address)
    .attr("href", `https://www.google.com/maps/search/?api=1&query=${address.replace(/ /g, "+")}`);
   
  //collapse code referenced from http://getbootstrap.com/docs/4.0/components/collapse/ 
  let extra_info = "";
  //add info for other fields not already specified
  for(let field in entry){
    if(autofill_fields.indexOf(field) === -1 && address_fields.indexOf(field) === -1 && 
        field !== "inspection_date" && field !== "location"){
      if(field !== "violations"){
        extra_info += `<p><b>${field}:</b> ${entry[field]}`  
      }else{
        let violations = entry.violations.split(" | ");
        extra_info += `<p><b>${field}:</b><ul>`;
        for(let v of violations){
          extra_info += `<li>${v}</li>`;
        }
        extra_info += "</ul>";
      }
      
    }
  }
  entryCard.find(".card-body").eq(0).append(`<div class="card-body"><a class="btn btn-primary" data-toggle="collapse" href="#extra-info-${entry.inspection_id}">More Info</a></div>`);
  entryCard.find("#extra-info").append(`<div class="card-body collapse" id="extra-info-${entry.inspection_id}">${extra_info}</div>`);
  

  //set border color based on result
  let result = entry.results.toLowerCase();
  entryCard.removeClass("border-secondary");
  if (result.indexOf("pass") > -1) {
    entryCard.addClass("border-success");
  }
  else if (result.indexOf("fail") > -1) {
    entryCard.addClass("border-danger");
  }
  else if (result.indexOf("no entry") === -1) {
    entryCard.addClass("border-warning");
  }
  else {
    entryCard.addClass("border-secondary");
  }

  entryCard.attr("id", `id${entry.inspection_id}`);

  $("#entriesList").append(entryCard);
}

function addListEntries(data) {
  for (let d of data) {
    try{
      addListEntry(d);
    }catch(err){
      console.error(err);
      continue;
    }
  }
}

//from app 2.1
function initMap(data) {
  let uluru = (data && data.length > 0) ? { lat: +data[0].latitude, lng: +data[0].longitude } : { lat: 41.930754058940664, lng: -87.79706466410363 };

  let map = new google.maps.Map(document.getElementById('map'), {
    zoom: 11,
    center: uluru
  });

  if (data) {
    plotData(data, map);
  }
}

function plotData(dataToPlot, gMap) {
  let markers = [];
  $.each(dataToPlot, function(i, d) {
    var marker = new google.maps.Marker({
      position: { lat: +d.latitude, lng: +d.longitude },
      map: gMap,
      title: d.dba_name
    });

    let address = `${d.address.trim()}, ${d.city}, ${d.state}, ${d.zip}`;
    var infowindow = new google.maps.InfoWindow({
      content:  `<div class="container">
                  <h3>${d.dba_name}</h3>
                  <p class="text-muted">AKA: ${d.aka_name}</p>
                  <p><b>Address:</b> ${address}</p>
                  <p><b>Inspection Date:</b> ${new Date(d.inspection_date).toDateString()}
                  <p><b>Result:</b> ${d.results}</p>
                </div>`
    });

    marker.addListener('click', function() {
      infowindow.open(gMap, marker);
    });
    
    markers.push(marker);
  });

  // Add a marker clusterer to manage the markers.
  // from https://developers.google.com/maps/documentation/javascript/marker-clustering
  var markerCluster = new MarkerClusterer(gMap, markers,
      {
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
        maxZoom: 20
      });
  
  console.log("done plotting data");

}
