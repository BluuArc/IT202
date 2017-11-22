/* global $ Dexie*/

var currentQuote;

function getQuoteOfDay(){
    return new Promise((fulfill,reject) => {
        try{
            $.get("https://quotes.rest/qod.json", function(response){
                console.log(arguments);
            
                fulfill(response);
            });
        }catch(err){
            console.error(err);
            reject(err);
        }
        
    });
}

$("#getQOD").on("click", () => {
    $("#quote").text("");
    
    getQuoteOfDay()
        .then((data) => {
            currentQuote = data.contents.quotes[0];
            $("#quote").append(currentQuote.quote);
        });
});

$("#btnSay").on("click", () => {
    say($("#quote").text());
});

function say(text){
    let msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
}

let db;

function saveQuote(){
    return db.quotes.add({
        id: currentQuote.id,
        category: currentQuote.category,
        author: currentQuote.author,
        quote: currentQuote.quote
    });
}

$("#btnSaveQuote").on("click", () => saveQuote());

function listSavedQuotes(){
    $(".savedQuote[id!='quoteTemplate']").text("");
    db.quotes
        .each((quote) => {
            let clone = $("#quoteTemplate").clone();
            clone.attr("id",quote.id);
            clone.text(quote.quote);
            $("body").append(clone);
        });
}

$("#btnGetSavedQuotes").on("click", listSavedQuotes);

$("body").on("click", ".savedQuote", function(){
    console.log($(this).text());
});

function init(){
    db = new Dexie("TalkingQOD");
    db.version(1).stores({
        quotes: "id,category,author,quote"
    });
    
    db.open()
        .then(() => console.log("DB is Ready"))
        .catch((error) => {
            console.error(error);
            alert(error);
        })
}


init();