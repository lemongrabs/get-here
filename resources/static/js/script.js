// header hide/show
// https://medium.com/design-startups/hide-header-on-scroll-down-show-on-scroll-up-67bbaae9a78c

var scrolling = false;
var lastScrollTop = 0;
var scrollChange = 5;
var navbarHeight = $('header').outerHeight();

function hasScrolled(){
    var st = $(this).scrollTop();

    if(Math.abs(lastScrollTop - st) <= scrollChange) {
        return;
    }

    if (st > lastScrollTop && st > navbarHeight){
        $('header').removeClass('nav-down').addClass('nav-up');
    } else {
        if(st + $(window).height() < $(document).height()) {
            $('header').removeClass('nav-up').addClass('nav-down');
        }
    }

    lastScrollTop = st;
}

$(window).scroll(function(){
    scrolling = true;
});

setInterval(function(){
    if (scrolling) {
        hasScrolled();
        scrolling = false;
    }
}, 250);



// top-level tooltips
$('a#penn-station').on('click', function(){
    var $tooltip = $(this).parents('section').find('.more-info.penn-station');
    if ($tooltip.hasClass('active')) {
        $tooltip.removeClass('active');
    $(this).text('More info');
    } else {
        $tooltip.addClass('active');
        $(this).text('Less info');
    }
});
// $('a#directions-details').on('click', function(){
//     var $tooltip = $(this).parents('section').find('.more-info');
//     var $li = $(this).parents('section').find('li');

//     if ($(this).hasClass('detailed')) {
//         $tooltip.removeClass('active');
//         $li.removeClass('expanded');
//         $(this).removeClass('detailed');
//         $(this).text('Detailed view');
//     } else {
//         $tooltip.addClass('active');
//         $li.addClass('expanded');
//         $(this).addClass('detailed');
//         $(this).text('Overview');
//     }
// });


// date & time pickers - i fucking hate these
// http://www.eyecon.ro/bootstrap-datepicker
// http://jdewit.github.io/bootstrap-timepicker
// ferry schedule goes from 6/27/2014 - 9/7/2014

var now = new Date();
    now = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
var dateString = (now.getMonth() + 1).toString() + '/' + now.getDate().toString() + '/' + now.getFullYear().toString();
var summerStartDate = new Date(2014, 05, 27, 0, 0, 0, 0);
var summerEndDate = new Date(2014, 08, 07, 0, 0, 0, 0);
var selectedDate = {};

$('#departure-date').val(dateString); // m/d/yyyy

// instantiate date picker
$('#departure-date').datepicker({
    'format': 'm/d/yyyy',
    onRender: function(date){
        if ( date.valueOf() < summerStartDate.valueOf() || date.valueOf() > summerEndDate.valueOf() ) {
            return 'disabled';
        }
    }
}).on('updateView', function(e){
    $('.datepicker table').removeClass('lower-limit upper-limit');
    if (e.month === 201406) {
        $('.datepicker table').addClass('lower-limit');
    } else if (e.month === 201409) {
        $('.datepicker table').addClass('upper-limit');
    } else if (e.month < 201406 || e.month > 201409) {
        $('.datepicker table').addClass('lower-limit upper-limit');
    }
});

// suppress month/year-level views
$('.datepicker .switch').on('click', function(e){
    return false;
});

// instantiate time picker
$('#departure-time').timepicker();

// don't let people type random shit in the date/time pickers, because validation is not worth it
$('#departure-date, #departure-time').on('keydown', function(e){
    e.preventDefault();
    return false;
});
$('#departure-time').on('click', function(e){
    $('.bootstrap-timepicker-widget input').on('keydown', function(e){
        e.preventDefault();
        return false;
    });
});



// template and UX helpers

var helpers = {

    parseTime: function(hour, minute){
        var parsedHour, parsedMinute, suffix;

        if (hour === 0) {
            parsedHour = '12';
            suffix = 'am';
        } else if (hour > 12) {
            parsedHour = (hour - 12).toString();
            suffix = 'pm';
        } else {
            parsedHour = hour.toString();
            suffix = 'am';
        }

        if (minute === 0) {
            parsedMinute = '00';
        } else {
            parsedMinute = minute.toString();
        }

        return parsedHour + ':' + parsedMinute + ' ' + suffix;
    },

    parseDuration: function(hours, minutes){
        return hours + 'h ' + minutes + 'm';
    },

    timeBetween: function(hour1, min1, hour2, min2){
        var date1, date2, minsBetween, hours, mins, parsedHours, parsedMinutes;

        date1 = new Date(2000, 0, 1, hour1, min1);
        date2 = new Date(2000, 0, 1, hour2, min2);
        if (date2 < date1) {
            date2.setDate(date2.getDate() + 1);
        }

        minsBetween = (date2 - date1) / 1000 / 60;

        hours = Math.floor(minsBetween / 60);
        mins = minsBetween % 60;

        if (hours > 1) {
            parsedHours = hours + ' hours';
        } else if (hours === 1) {
            parsedHours = hours + ' hour';
        } else {
            parsedHours = '';
        }

        if (hours >= 1 && mins >= 1) {
            parsedHours += ' and ';
        }

        if (mins > 1) {
            parsedMinutes = mins + ' minutes';
        } else if (mins === 1) {
            parsedMinutes = mins + ' minute';
        } else {
            parsedMinutes = '';
        }

        return parsedHours + parsedMinutes;
    },

    setupItineraryTooltips: function(){

        $('a#directions-details').on('click', function(){
            var $tooltip = $(this).parents('section').find('.more-info');
            var $li = $(this).parents('section').find('li');

            if ($(this).hasClass('detailed')) {
                $tooltip.removeClass('active');
                $li.removeClass('expanded');
                $(this).removeClass('detailed');
                $(this).text('Detailed view');
            } else {
                $tooltip.addClass('active');
                $li.addClass('expanded');
                $(this).addClass('detailed');
                $(this).text('Overview');
            }
        });

        $('#itinerary-directions li').on('click', function(){
            if ($(this).hasClass('expanded')) {
                $(this).removeClass('expanded');
                $(this).find('.more-info').removeClass('active');
            } else {
                $(this).addClass('expanded');
                $(this).find('.more-info').addClass('active');
            }

            if ($('#itinerary-directions li.expanded').length === 0) {
                $('a#directions-details').text('Detailed view');
                $('a#directions-details').removeClass('detailed');
            } else {
                $('a#directions-details').text('Overview');
                $('a#directions-details').addClass('detailed');
            }
        });

    }

};



// submitting request + attached UX

$('#get-itineraries').on('click', function(){

    var departure_date = $('#departure-date').val().split('/'); // m/d/yyyy
    var departure_time = $('#departure-time').val().split(/:| /);

    var year = departure_date[2];
    var month = departure_date[0];
    var day = departure_date[1];
    var hour = (departure_time[2] === 'AM') ? departure_time[0] : parseInt(departure_time[0], 10) + 12;
    var minute = departure_time[1];

    console.log(year, month, day, hour, minute);

    // reset loading/error states
    $('#get-itineraries').addClass('loading');
    $('#itinerary-directions, #sharegurl').addClass('hidden');
    $('#error').addClass('hidden');

    // submit request
    $.get("/directions",
        {"year":  year,
         "month": month,
         "day":   day,
         "hour":  hour,
         "minute": minute})
    .done(function(response){
        var routeData = response;

        _.extend(routeData, helpers);

        var itinerary = _.template( $('script.itinerary-template').html() );
        var directions = _.template( $('script.directions-template').html() );

        // populate itinerary & directions
        $('#itinerary-directions tbody').html( itinerary(routeData) );
        $('#itinerary-directions ol').html( directions(routeData) );

        // setup tooltips
        routeData.setupItineraryTooltips();

        // scroll page to content & remove loading state
        var scrollTop = $('#itinerary-directions').offset().top - 30;
        $('#itinerary-directions, #sharegurl').removeClass('hidden');
        $('body').animate({ scrollTop: scrollTop} );
        $('#get-itineraries').removeClass('loading');

    }).fail(function(response){
        $('#get-itineraries').removeClass('loading');
        $('#error').removeClass('hidden');
    });

});
