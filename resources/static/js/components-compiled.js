var App = React.createClass({
  displayName: 'App',

  getInitialState: function () {
    return {
      returnedFerries: null,
      returnedRoute: null,
      errorType: '' // can be 'ferries', 'routes', or 'server'
    };
  },

  returnedFerries: function (response, parsedData) {
    if (parsedData.get(transit.keyword('times')).rep.length === 0) {
      this.setState({
        returnedFerries: null,
        returnedRoute: null,
        errorType: 'ferries'
      });
    } else {
      this.setState({ returnedFerries: parsedData });
    }
  },

  returnedRoute: function (response, parsedData) {
    if (response.status === 200 && parsedData.has(transit.keyword('code'))) {
      this.setState({
        returnedFerries: null,
        returnedRoute: null,
        errorType: 'routes'
      });
    } else {
      this.setState({ returnedRoute: parsedData });
    }
  },

  requestErrored: function () {
    this.setState({
      returnedFerries: null,
      returnedRoute: null,
      errorType: 'server'
    });
  },

  resetSelections: function () {
    this.setState({
      returnedFerries: null,
      returnedRoute: null,
      errorType: ''
    });
  },

  render: function () {
    if (this.state.returnedRoute) {
      return React.createElement(
        'div',
        null,
        React.createElement(Header, null),
        React.createElement(Intro, null),
        React.createElement(FerryPicker, {
          onFerryReturn: this.returnedFerries,
          onRouteReturn: this.returnedRoute,
          onRequestError: this.requestErrored,
          resetSelections: this.resetSelections,
          errorType: this.state.errorType,
          ferries: this.state.returnedFerries }),
        React.createElement(Directions, {
          parsedData: this.state.returnedRoute }),
        React.createElement(Extra, null),
        React.createElement(Footer, null)
      );
    } else {
      return React.createElement(
        'div',
        null,
        React.createElement(Header, null),
        React.createElement(Intro, null),
        React.createElement(FerryPicker, {
          onFerryReturn: this.returnedFerries,
          onRouteReturn: this.returnedRoute,
          onRequestError: this.requestErrored,
          resetSelections: this.resetSelections,
          errorType: this.state.errorType,
          ferries: this.state.returnedFerries }),
        React.createElement(Footer, null)
      );
    }
  }
});

var Header = React.createClass({
  displayName: 'Header',

  setupHideShow: function () {
    // https://medium.com/design-startups/hide-header-on-scroll-down-show-on-scroll-up-67bbaae9a78c

    var scrolling = false;
    var lastScrollTop = 0;
    var scrollChange = 5;
    var navbarHeight = $('header').outerHeight();

    function hasScrolled() {
      var st = $(this).scrollTop();

      if (Math.abs(lastScrollTop - st) <= scrollChange) {
        return;
      }

      if (st > lastScrollTop && st > navbarHeight) {
        $('header').removeClass('nav-down').addClass('nav-up');
      } else {
        if (st + $(window).height() < $(document).height()) {
          $('header').removeClass('nav-up').addClass('nav-down');
        }
      }

      lastScrollTop = st;
    }

    $(window).scroll(function () {
      scrolling = true;
    });

    setInterval(function () {
      if (scrolling) {
        hasScrolled();
        scrolling = false;
      }
    }, 250);
  },

  render: function () {
    this.setupHideShow();

    return React.createElement(
      'header',
      null,
      React.createElement(
        'div',
        { className: 'wrapper' },
        React.createElement(
          'a',
          { id: 'home', href: 'http://sharegurl.com' },
          'ShareGurl'
        ),
        React.createElement(
          'h1',
          null,
          'Getting to Fire Island'
        )
      )
    );
  }
});

var Intro = React.createClass({
  displayName: 'Intro',

  render: function () {
    return React.createElement(
      'section',
      { id: 'intro' },
      React.createElement(
        'h2',
        null,
        'Welcome to your journey to Fire Island Pines.'
      ),
      React.createElement(
        'p',
        null,
        'The trip is famously challenging, but we’ll get through it together. Remember the two most important rules:',
        React.createElement(
          'ul',
          null,
          React.createElement(
            'li',
            null,
            'If people look gay, you should probably follow them.'
          ),
          React.createElement(
            'li',
            null,
            'It might seem like everyone knows what they’re doing, but everyone had to learn at some point. Don’t be afraid to ask.'
          )
        )
      )
    );
  }
});

var FerryPicker = React.createClass({
  displayName: 'FerryPicker',

  getInitialState: function () {
    return { waiting: false, origin: "penn" };
  },

  componentDidMount: function () {
    var resetSelections = this.props.resetSelections;
    var onDateSelect = this.onDateSelect;
    var now = moment().subtract(1, 'days').toDate();

    // instantiate bootstrap date picker with callbacks
    $('#departure-date').datepicker({
      'format': 'm/d/yyyy',
      onRender: function (date) {
        if (date.valueOf() <= now.valueOf()) {
          return 'disabled';
        }
      }
    }).on('changeDate', function (e) {
      $('.datepicker').hide();
      resetSelections();
      onDateSelect();
    });

    // suppress month/year-level views
    $('.datepicker .switch').on('click', function (e) {
      return false;
    });

    // don't let people type random shit in the date picker, because validation is not worth it
    $('#departure-date').on('keydown', function (e) {
      e.preventDefault();
      return false;
    });

    // grab ferry results for today
    onDateSelect();
  },

  onDateSelect: function (e) {
    var data = transit.map([transit.keyword('date'), moment($('#departure-date').val(), 'M/D/YYYY').toDate()]);

    $.ajax({ 'url': '/ferries',
      'type': 'POST',
      'contentType': 'application/transit+json',
      'data': window.transit.writer('json').write(data),
      'headers': { 'accept': 'application/transit+json' },
      'complete': this.getFerries,
      'error': this.onError });
  },

  getFerries: function (response) {
    var parsedData = window.transit.reader('json').read(response.responseText);
    this.props.onFerryReturn(response, parsedData);
  },

  onSubmit: function (e) {
    if (this.props.errorType !== 'ferries') {
      this.setState({ waiting: true });
      var dateTimeInputString = $('#departure-date').val() + ' ' + $('#departure-time').val();
      var originString = this.state.origin;
      var data = transit.map([transit.keyword('arrive-by'), moment(dateTimeInputString, 'M/D/YYYY h:mm a').toDate(), transit.keyword('from'), transit.keyword(originString)]);

      $.ajax({ 'url': '/directions',
        'type': 'POST',
        'contentType': 'application/transit+json',
        'data': window.transit.writer('json').write(data),
        'headers': { 'accept': 'application/transit+json' },
        'complete': this.getRoutes,
        'error': this.onError });
    }
  },

  getRoutes: function (response) {
    var parsedData = window.transit.reader('json').read(response.responseText);
    this.setState({ waiting: false });
    this.props.onRouteReturn(response, parsedData);
  },

  onError: function (response) {
    this.setState({ waiting: false });
    this.props.onRequestError();
  },

  handleOriginChange: function (event) {
    this.setState({ origin: event.target.value });
    console.log("Origin change!");
  },

  render: function () {
    var defaultDate = moment().format('M/D/YYYY');
    var ferries = this.props.ferries ? this.props.ferries.get(transit.keyword('times')).rep : [];
    var origin = this.state.origin;
    var buttonClassString = this.state.waiting ? 'loading' : '';

    return React.createElement(
      'section',
      { id: 'departure' },
      React.createElement(
        'h2',
        null,
        'Which station do you want to leave from?'
      ),
      React.createElement(
        'div',
        { className: 'content' },
        React.createElement('input', { type: 'radio', name: 'origin', id: 'penn', value: 'penn', checked: origin === "penn", onChange: this.handleOriginChange }),
        React.createElement(
          'label',
          { htmlFor: 'penn' },
          'Pennsylvania Station'
        ),
        React.createElement('input', { type: 'radio', name: 'origin', id: 'atlantic', value: 'atlantic', checked: origin === "atlantic", onChange: this.handleOriginChange }),
        React.createElement(
          'label',
          { htmlFor: 'atlantic' },
          'Atlantic Terminal'
        )
      ),
      React.createElement(
        'h2',
        null,
        'Which ferry do you want to catch?'
      ),
      React.createElement(
        'div',
        { className: 'content' },
        React.createElement(
          'div',
          { className: 'input departure-date' },
          React.createElement('input', { type: 'text', id: 'departure-date', className: 'datetime-input', maxLength: '10', defaultValue: defaultDate })
        ),
        React.createElement(FerryTimes, { ferries: ferries })
      ),
      React.createElement(
        'button',
        { onClick: this.onSubmit, id: 'get-itineraries', className: buttonClassString },
        React.createElement(
          'span',
          null,
          'Next!'
        )
      ),
      React.createElement(ErrorMessaging, { errorType: this.props.errorType })
    );
  }
});

var FerryTimes = React.createClass({
  displayName: 'FerryTimes',

  render: function () {
    var renderedFerries = _.map(this.props.ferries, function (ferry, i, ferries) {
      return React.createElement(
        'option',
        { key: 'ferry' + i, value: moment(ferry).format('h:mm a') },
        moment(ferry).format('h:mm a')
      );
    });

    return React.createElement(
      'div',
      { className: 'input departure-time' },
      React.createElement(
        'select',
        { id: 'departure-time', className: this.props.ferries.length > 0 ? "datetime-input" : "datetime-input disabled" },
        renderedFerries
      )
    );
  }
});

var ErrorMessaging = React.createClass({
  displayName: 'ErrorMessaging',

  render: function () {
    if (this.props.errorType === 'ferries') {
      return React.createElement(
        'div',
        { id: 'error' },
        React.createElement(
          'p',
          null,
          React.createElement(
            'strong',
            null,
            'Looks like we don’t have ferry info for that date.'
          ),
          ' Try looking up a different departure date.'
        )
      );
    } else if (this.props.errorType === 'routes') {
      return React.createElement(
        'div',
        { id: 'error' },
        React.createElement(
          'p',
          null,
          React.createElement(
            'strong',
            null,
            'We can’t find a route that works for that day.'
          ),
          ' Are you looking up a departure date in the past?'
        )
      );
    } else if (this.props.errorType === 'server') {
      return React.createElement(
        'div',
        { id: 'error' },
        React.createElement(
          'p',
          null,
          React.createElement(
            'strong',
            null,
            'Oops! Something went wrong on our end.'
          ),
          ' Try looking up your desired ferry date & time again.'
        )
      );
    } else {
      return React.createElement('div', null);
    }
  }
});

var createDurationString = function (startTime, endTime) {
  var duration = moment.duration(moment(endTime).diff(moment(startTime)));
  var hours = duration.hours();
  var minutes = duration.minutes();
  var string = '';
  if (hours > 0) {
    string += hours + ' h ';
  }
  if (minutes > 0) {
    string += minutes + ' min';
  }
  return string;
};

var Directions = React.createClass({
  displayName: 'Directions',


  render: function () {
    var sayvilleArrival = this.props.parsedData.get(transit.keyword('route'))[1].get(transit.keyword('arrival'));
    var ferryInputString = $('#departure-date').val() + ' ' + $('#departure-time').val();
    var ferryDateTime = moment(ferryInputString, 'M/D/YYYY h:mm a').toDate();
    var duration = moment.duration(moment(ferryDateTime).diff(moment(sayvilleArrival))).hours();

    if (duration < 2) {
      return React.createElement(
        'section',
        { id: 'directions' },
        React.createElement(
          'h2',
          null,
          'Your itinerary & directions'
        ),
        React.createElement(Summary, {
          summaryData: this.props.parsedData.get(transit.keyword('summary')),
          peak: this.props.parsedData.get(transit.keyword('route'))[0].get(transit.keyword('peak')) }),
        React.createElement(Steps, {
          routeData: this.props.parsedData.get(transit.keyword('route')) })
      );
    } else {
      return React.createElement(
        'section',
        { id: 'directions' },
        React.createElement(
          'h2',
          null,
          'Your itinerary & directions'
        ),
        React.createElement(
          'p',
          null,
          'Sorry gurl, trains don’t leave early enough for that ferry so you should probably take a car!'
        ),
        React.createElement(
          'p',
          null,
          'If you need help booking one, shoot us an email at ',
          React.createElement(
            'a',
            { href: 'mailto:hey@sharegurl.com' },
            'hey@sharegurl.com'
          ),
          ' and we can connect you with one of our preferred vendors. We recommend that the car leave Manhattan 90 minutes before your ferry’s departure.'
        )
      );
    }
  }
});

var Summary = React.createClass({
  displayName: 'Summary',

  render: function () {
    var ferryInputString = $('#departure-date').val() + ' ' + $('#departure-time').val();
    var departureTime = this.props.summaryData.get(transit.keyword('departure'));
    var arrivalTime = moment(ferryInputString, 'M/D/YYYY h:mm a').add(20, 'm').toDate();
    var duration = createDurationString(departureTime, moment(arrivalTime).toDate());
    var cost = this.props.peak ? '$25-31' : '$23-26';

    var shortNames = {
      "Pennsylvania Station": "Penn",
      "Atlantic Terminal": "Atlantic"
    };
    var originString = this.props.summaryData.get(transit.keyword('origin'));
    var origin = shortNames[originString];

    return React.createElement(
      'table',
      null,
      React.createElement(
        'thead',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement(
            'td',
            { className: '' },
            'Depart ',
            origin
          ),
          React.createElement(
            'td',
            null,
            'Arrive F.I.P.'
          ),
          React.createElement(
            'td',
            { className: 'extra' },
            'Travel time'
          ),
          React.createElement(
            'td',
            { className: 'extra' },
            'Cost'
          )
        )
      ),
      React.createElement(
        'tbody',
        null,
        React.createElement(
          'tr',
          null,
          React.createElement(
            'td',
            null,
            moment(departureTime).format('h:mm a')
          ),
          React.createElement(
            'td',
            null,
            moment(arrivalTime).format('h:mm a')
          ),
          React.createElement(
            'td',
            { className: 'extra' },
            duration
          ),
          React.createElement(
            'td',
            { className: 'extra' },
            cost
          )
        )
      )
    );
  }
});

var Steps = React.createClass({
  displayName: 'Steps',

  render: function () {
    var routeData = this.props.routeData;
    var ferryInputString = $('#departure-date').val() + ' ' + $('#departure-time').val();
    var ferryDateTime = moment(ferryInputString, 'M/D/YYYY h:mm a').toDate();
    var origin = routeData[0].get(transit.keyword('origin'));

    var renderedSteps = _.map(routeData, function (step, i, steps) {
      var isLast = i === steps.length - 1;
      var transferDepartureTime = isLast ? ferryDateTime : steps[i + 1].get(transit.keyword('departure'));

      return React.createElement(
        'div',
        { key: 'step' + i },
        React.createElement(Transit, {
          departureTime: step.get(transit.keyword('departure')),
          origin: step.get(transit.keyword('origin')),
          destination: step.get(transit.keyword('destination')),
          route: step.get(transit.keyword('route')),
          peak: step.get(transit.keyword('peak')),
          duration: createDurationString(step.get(transit.keyword('departure')), step.get(transit.keyword('arrival'))) }),
        React.createElement(Transfer, {
          arrivalTime: step.get(transit.keyword('arrival')),
          location: step.get(transit.keyword('destination')),
          connection: isLast ? 'Sayville Ferry' : 'train to ' + steps[i + 1].get(transit.keyword('destination')),
          transferType: isLast ? 'ferry-transfer' : 'train-transfer',
          duration: createDurationString(step.get(transit.keyword('arrival')), transferDepartureTime) })
      );
    });

    return React.createElement(
      'div',
      { id: 'steps' },
      React.createElement(
        'div',
        { className: 'step' },
        React.createElement('strong', null),
        ' ',
        React.createElement(
          'p',
          null,
          'Start at ',
          origin,
          '.'
        )
      ),
      renderedSteps,
      React.createElement(
        'div',
        { className: 'step' },
        React.createElement(
          'strong',
          null,
          moment(ferryDateTime).format('h:mm a')
        ),
        ' ',
        React.createElement(
          'p',
          null,
          'Take the Sayville Ferry to the Fire Island Pines. ',
          React.createElement(
            'small',
            null,
            React.createElement(
              'span',
              { className: 'duration' },
              '20 min'
            )
          )
        )
      ),
      React.createElement(
        'div',
        { className: 'step last' },
        React.createElement(
          'strong',
          null,
          moment(ferryDateTime).add(20, 'm').format('h:mm a')
        ),
        ' ',
        React.createElement(
          'p',
          null,
          'Arrive in the Pines!'
        )
      )
    );
  }
});

var Transit = React.createClass({
  displayName: 'Transit',

  render: function () {
    var peak = '';
    if (this.props.origin === 'Penn Station') {
      peak = React.createElement(
        'small',
        null,
        'You’ll need to buy ',
        this.props.peak ? 'a peak' : 'an off-peak',
        ' ticket.'
      );
    }
    return React.createElement(
      'div',
      { className: 'step transit' },
      React.createElement(
        'strong',
        null,
        moment(this.props.departureTime).format('h:mm a')
      ),
      React.createElement(
        'p',
        null,
        'Take the ',
        this.props.route,
        ' line train to ',
        this.props.destination,
        '. ',
        React.createElement(
          'small',
          null,
          React.createElement(
            'span',
            { className: 'duration' },
            this.props.duration
          )
        ),
        React.createElement('br', null),
        peak,
        React.createElement(StepDetails, { whichStep: this.props.origin })
      )
    );
  }
});

var Transfer = React.createClass({
  displayName: 'Transfer',

  render: function () {
    return React.createElement(
      'div',
      { className: 'step transfer' },
      React.createElement(
        'strong',
        null,
        moment(this.props.arrivalTime).format('h:mm a')
      ),
      React.createElement(
        'p',
        null,
        'Get off at ',
        this.props.location,
        ' to transfer to the ',
        this.props.connection,
        '.',
        React.createElement('br', null),
        React.createElement(
          'small',
          null,
          React.createElement(
            'span',
            { className: 'duration' },
            this.props.duration
          ),
          ' to make connection'
        ),
        React.createElement(StepDetails, { whichStep: this.props.transferType })
      )
    );
  }
});

var StepDetails = React.createClass({
  displayName: 'StepDetails',

  render: function () {
    var id = this.props.whichStep.replace(' ', '-').toLowerCase();
    var details = null;

    switch (this.props.whichStep) {
      case 'Penn Station':
        details = React.createElement(
          'span',
          null,
          'You’re looking for the Long Island Railroad section of Penn Station. This is on the lower level, below the area for Amtrak and NJ Transit. To figure out which track you need, look on the departure boards and find your train’s departure time.',
          React.createElement('br', null),
          React.createElement('br', null),
          'Note: when you’re riding LIRR each train is uniquely identified by its departure time. It’s the best way to know you’re on the right train!',
          React.createElement('br', null),
          React.createElement('br', null),
          'To buy a ticket, look for a ticket vending machine. They accept cash, debit or credit (though if you pay in cash expect to get your change in $1 coins). Tickets range from $13-$18 one way and $19-$24 round trip depending on whether your train is a "peak" or "off-peak" train. If you’re running late, you can purchase a ticket on the train with cash, but there is an approximately $5 surcharge.'
        );
        break;
      case 'train-transfer':
        details = React.createElement(
          'span',
          null,
          'Often the train you’re transferring to is directly across the track and already in the station, so you’ll need to transfer quickly.  Look at the black and yellow signs above each track to find your train, and remember: each train is uniquely identified by its departure time. It’s the best way to know you’re on the right train!',
          React.createElement('br', null),
          React.createElement('br', null),
          'If you miss your connection, or have some time to kill, there’s a food court just above in the AirTrain connection area. Grab a coffee or sandwich and contemplate the debauchery that is about to ensue.',
          React.createElement('br', null),
          React.createElement('br', null),
          'Once you’re on the train, sit back and relax - the train ride is about an hour from here to Sayville.',
          React.createElement('br', null),
          React.createElement('br', null),
          'The conductor might announce "transfer here for Fire Island ferries" at Bay Shore, but he’s just trying to trick you! Those ferries will take you to a different, far less gay Fire Island experience.',
          React.createElement('br', null),
          React.createElement('br', null),
          'Listen for the announcement that the train is arriving at Oakdale, so you can start pulling your things together. Sayville will be the next stop.'
        );
        break;
      case 'ferry-transfer':
        details = React.createElement(
          'span',
          null,
          'You’re looking for a shuttle bus operated by Colonial Taxi (if you’re arriving during a slow period it may just be a taxi cab).',
          React.createElement('br', null),
          React.createElement('br', null),
          'VERY IMPORTANT: Have $5 cash ready to hand the driver for this trip. And while the drivers will accept larger bills, they may give you a little sass for it.',
          React.createElement('br', null),
          React.createElement('br', null),
          'During peak travel time (for example, Friday afternoons) there can be multiple shuttles, but they’re almost certainly all headed to the same place. Also, during peak times there may be some competition for shuttles. Keep it cordial, but it’s better to be on one of the first shuttles. Although the trains, shuttles and ferries are timed together carefully, it is sometimes a tight transfer and the ferries will not wait for a late shuttle bus.',
          React.createElement('br', null),
          React.createElement('br', null),
          'Ferries for The Pines and Cherry Grove leave from two adjacent but separate terminals. You want to line up on the terminal to your right.',
          React.createElement('br', null),
          React.createElement('br', null),
          'Note: There are some occasions where one ferry will depart Sayville and serve both destinations, stopping in Cherry Grove first. If there is literally no one at the Pines terminal, you probably want to check on the Cherry Grove side. Once you’re in line, it’s common practice to drop your bags in line to hold your spot and then wander around the terminal.  Keep an eye on your bags, but no one is going to hassle you about cutting the line. The ferry is over capacity only a few days each year (for example, July 4th) so don’t fret too much. The line is less a competition and more about gays being tidy.',
          React.createElement('br', null),
          React.createElement('br', null),
          'You can buy your ticket in cash as you pass the ticket booth to board. But if there’s someone in the ticket booth before boarding begins, you can also go up to them ahead of time and purchase tickets. The price per ticket is $8 for an adult. If you need an ATM, there is one inside the bar on the Cherry Grove side of the terminal. They also accept credit cards in the Ferry Service Office, which is also on the Cherry Grove side.'
        );
        break;
    }

    if (details !== null) {
      return React.createElement(
        'span',
        { className: 'details' },
        React.createElement(
          'a',
          { className: 'btn btn-link btn-xs collapsed', href: "#" + id, 'data-toggle': 'collapse', 'aria-expanded': 'false', 'aria-controls': id },
          React.createElement(
            'span',
            { className: 'more' },
            'More info'
          ),
          React.createElement(
            'span',
            { className: 'less' },
            'Less info'
          )
        ),
        React.createElement(
          'span',
          { className: 'collapse', id: id },
          details
        )
      );
    } else {
      return React.createElement('span', null);
    }
  }
});

var Extra = React.createClass({
  displayName: 'Extra',

  render: function () {
    return React.createElement(
      'section',
      { id: 'sharegurl' },
      React.createElement(
        'h2',
        null,
        'Looking for a place to stay in the Pines? ShareGurl can help!'
      ),
      React.createElement(
        'p',
        null,
        'We specialize in getting gays into beds. Whether it be a room at our hotel for you and your friends, a night or two at a private guesthouse, or a full house rental, we’ve got you. Head over to ',
        React.createElement(
          'a',
          { href: 'http://www.sharegurl.com/lodging' },
          'sharegurl.com/lodging'
        ),
        ' to check out what’s available and book your bed today.'
      )
    );
  }
});

var Footer = React.createClass({
  displayName: 'Footer',

  render: function () {
    return React.createElement(
      'footer',
      null,
      'This site brought to you with love by ',
      React.createElement(
        'a',
        { href: 'http://twitter.com/zaneshelby' },
        'Zane Shelby'
      ),
      ' & ',
      React.createElement(
        'a',
        { href: 'http://twitter.com/oldwestaction' },
        'Anh-Thu Huynh'
      ),
      ' for ',
      React.createElement(
        'a',
        { href: 'http://sharegurl.com', className: 'home' },
        'ShareGurl'
      )
    );
  }
});

React.render(React.createElement(App, null), document.getElementById('app-container'));
