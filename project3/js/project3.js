/* global $  */

var loadedData; //for debugging
// data source: https://data.cityofchicago.org/Health-Human-Services/Food-Inspections/4ijn-s7e5
$(document).ready(function() {
  // initMap();
  loadData().then((data) => {
    console.log("TODO: better form validation");

    initializeForm(data);
    $("#contentContainer").addClass("hidden");
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
  const facility_types = getUniqueKeyValues(data, "facility_type");
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
}

//when activated, get filters and populate views
function submitFilters(button_event) {
  button_event.preventDefault();
  $("#mapContainer").addClass("hidden");

  let form_input = {
    inspection_date: $("#inputDate").val().length === 0 ? "" : new Date($("#inputDate").val()).toISOString(),
    facility_type: $("#inputFacilityType").val() === "No Filter Selected" ? "" : $("#inputFacilityType").val(),
    results: $("#inputStatus").val() === "No Filter Selected" ? "" : $("#inputStatus").val(), //inspection results
    zip: $("#inputZip").val(),
  };

  //delete any empty field
  for (let f of Object.keys(form_input)) {
    if (form_input[f].length === 0) {
      delete form_input[f];
    }
  }

  //validate zip code
  if (form_input.zip && !isValidZip(form_input.zip)) {
    $("#inputZip").addClass("is-invalid");
    return;
  }
  else {
    $("#inputZip").removeClass("is-invalid");
  }

  let filtered_input = $.param(form_input);
  if (filtered_input.indexOf("&") === 0) {
    filtered_input = filtered_input.slice(1); //strip leading ampersand
  }

  $(".list-entry[id!=template]").remove();
  $("#results-msg").text("Loading data...");
  console.log(filtered_input);
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
      
      setTimeout(() => {initMap(data)}, 100); //add delay to fix map loading bug
      
      $("#results-msg").text(`Loaded ${data.length} entries`);
    });
}

function addListEntry(entry) {
  let entryCard = $("#template").clone();
  const autofill_fields = ["facility_type", "dba_name", "inspection_id", "inspection_date", "inspection_type", "results"];

  for (const f of autofill_fields) {
    entryCard.find(`#${f}`).text(entry[f] || "Unknown");
  }
  
  //maps url referenced from https://developers.google.com/maps/documentation/urls/guide
  let address = `${entry.address.trim()}, ${entry.city}, ${entry.state}`;
  entryCard.find("#address_link")
    .text(address)
    .attr("href", `https://www.google.com/maps/search/?api=1&query=${address.replace(/ /g, "+")}`);

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
  let uluru = data ? { lat: +data[0].latitude, lng: +data[0].longitude } : { lat: 41.930754058940664, lng: -87.79706466410363 };

  let map = new google.maps.Map(document.getElementById('map'), {
    zoom: 11,
    center: uluru
  });

  if (data) {
    plotData(data, map);
  }
}

function plotData(dataToPlot, gMap) {
  $.each(dataToPlot, function(i, d) {
    var marker = new google.maps.Marker({
      position: { lat: +d.latitude, lng: +d.longitude },
      map: gMap,
      title: d.dba_name
    });

    var infowindow = new google.maps.InfoWindow({
      content: `<h3>${d.dba_name}</h3>`
    });

    marker.addListener('click', function() {
      infowindow.open(gMap, marker);
    });
  });

  console.log("donw plotting data");

}
