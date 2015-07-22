var App = React.createClass({
  getInitialState: function() {
    return {
      returnedRoute: null,
      requestFailed: false
    };
  },

  returnedRoute: function(parsedData) {
    this.setState({
      returnedRoute: parsedData
    });
  },

  requestErrored: function() {
    this.setState({
      returnedRoute: null,
      requestFailed: true
    });
  },

  render: function() {
    if (this.state.returnedRoute) {
      return (
        <div>
          <Header />
          <Intro />
          <FerryPicker
            onRouteReturn={this.returnedRoute}
            onRequestError={this.requestErrored}
            requestFailed={this.state.requestFailed} />
          <Directions
            parsedData={this.state.returnedRoute} />
          <Extra />
          <Footer />
        </div>
      )
    } else {
      return (
        <div>
          <Header />
          <Intro />
          <FerryPicker
            onRouteReturn={this.returnedRoute}
            onRequestError={this.requestErrored}
            requestFailed={this.state.requestFailed} />
          <Footer />
        </div>
      )
    }
  }
});

var Header = React.createClass({

  setupHideShow: function() {
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
  },

  render: function() {
    this.setupHideShow();

    return (
      <header>
        <div className="wrapper">
          <a id="home" href="http://sharegurl.com">ShareGurl</a>
          <h1>Getting to Fire Island</h1>
        </div>
      </header>
    )
  }
});

var Intro = React.createClass({
  render: function() {
    return (
      <section id="intro">
        <h2>Welcome to your journey to Fire Island Pines.</h2>
        <p>The trip is famously challenging, but we&rsquo;ll get through it together. Remember the two most important rules:
          <ul>
            <li>If people look gay, you should probably follow them.</li>
            <li>It might seem like everyone knows what they&rsquo;re doing, but everyone had to learn at some point. Don&rsquo;t be afraid to ask.</li>
          </ul>
        </p>
        <p>And if you don&rsquo;t feel like taking the train, Sharegurl&rsquo;s got you covered: this summer, enjoy our new dedicated bus service that will take you directly from Manhattan to the ferry.  <a href="http://new.sharegurl.com/stores/sharegurl-shuttle/about">More info &raquo;</a></p>
      </section>
    )
  }
});

var FerryPicker = React.createClass({
  getInitialState: function() {
    return {waiting: false};
  },

  componentDidMount: function() {
    // instantiate date picker, set up date validation (still needs to be done?)
    // schedule is for 6/26 thru 9/13/2015
    $('#departure-date').datepicker({
      'format': 'm/d/yyyy',
      onRender: function(date){
        // if ( date.valueOf() < summerStartDate.valueOf() || date.valueOf() > summerEndDate.valueOf() ) {
        //     return 'disabled';
        // }
      }
    }).on('updateView', function(e){
      // $('.datepicker table').removeClass('lower-limit upper-limit');
      // if (e.month === 201406) {
      //     $('.datepicker table').addClass('lower-limit');
      // } else if (e.month === 201409) {
      //     $('.datepicker table').addClass('upper-limit');
      // } else if (e.month < 201406 || e.month > 201409) {
      //     $('.datepicker table').addClass('lower-limit upper-limit');
      // }
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
  },

  onSubmit: function() {
    this.setState({waiting: true});

    var dateTimeInputString = $('#departure-date').val() + ' ' + $('#departure-time').val();
    var data = transit.map([transit.keyword('arrive-by'),
               moment(dateTimeInputString, 'M/D/YYYY h:mm a').toDate()]);

    $.ajax({'url': '/directions',
            'type': 'POST',
            'contentType': 'application/transit+json',
            'data': window.transit.writer('json').write(data),
            'headers':
              {'accept': 'application/transit+json'},
               'complete': this.onSuccess,
               'error': this.props.onRequestError
          });
  },

  onSuccess: function(response) {
    var parsedData = window.transit.reader('json').read(response.responseText);
    this.setState({waiting: false});
    this.props.onRouteReturn(parsedData);
  },

  render: function() {
    var defaultDate = moment().format('M/D/YYYY');
    var defaultTime = moment().format('h:mm a');
    var buttonClassString = this.state.waiting ? 'loading' : '';

    return (
      <section id="departure">
        <h2>Which ferry are you trying to catch?</h2>
        <div className="content">
          <div className="input departure-date">
            <input type="text" id="departure-date" className="datetime-input" maxLength="10" defaultValue={defaultDate} />
          </div>
          <div className="input departure-time">
            <input type="text" id="departure-time" className="datetime-input" defaultValue={defaultTime} />
          </div>
        </div>
        <button id="get-itineraries" className={buttonClassString} onClick={this.onSubmit}><span>Next!</span></button>
        <ErrorMessaging requestFailed={this.props.requestFailed} />
      </section>
    )
  }
});

var ErrorMessaging = React.createClass({
  render: function() {
    if (this.props.requestFailed) {
      return <div id="error"><p><strong>Oops! Something went wrong on our end.</strong> Try looking up your desired ferry time again.</p></div>
    } else {
      return <div></div>;
    }
  }
});

var Directions = React.createClass({
  render: function() {
    return (
      <section id="directions">
        <h2>Your itinerary &amp; directions</h2>
        <Summary
          summaryData={this.props.parsedData.get(transit.keyword('summary'))}
          peak={this.props.parsedData.get(transit.keyword('route'))[0].get(transit.keyword('peak'))} />
        <Steps
          routeData={this.props.parsedData.get(transit.keyword('route'))} />
        <div id="callout">
          <p>Don&rsquo;t feel like taking the train, or think this is seeming a little too complicated? As an alternative, you can hop on the new <strong>ShareGurl Shuttle</strong> and get a ride from Manhattan directly to the ferry! <a href="http://new.sharegurl.com/stores/sharegurl-shuttle/about">More info &raquo;</a></p>
        </div>
      </section>
    )
  }
});

var createDurationString = function(startTime, endTime) {
  var duration = moment.duration(moment(endTime).diff(moment(startTime)));
  var hours = duration.hours();
  var minutes = duration.minutes();
  var string = '';
  if (hours > 0) {
    string += hours + ' h '
  }
  if (minutes > 0) {
    string += minutes + ' min'
  }
  return string;
};

var Summary = React.createClass({
  render: function() {
    var departureTime = this.props.summaryData.get(transit.keyword('departure'));
    var arrivalTime = this.props.summaryData.get(transit.keyword('arrival'));
    var duration = createDurationString(departureTime, moment(arrivalTime).add(20, 'm').toDate());
    var cost = this.props.peak ? '$25-31' : '$23-26';

    return (
      <table>
        <thead>
          <tr>
            <td>Depart Penn</td>
            <td>Arrive F.I.P.</td>
            <td>Travel time</td>
            <td>Cost</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{moment(departureTime).format('h:mm a')} [?]</td>
            <td>{moment(arrivalTime).format('h:mm a')} [?]</td>
            <td>{duration}</td>
            <td>{cost}</td>
          </tr>
        </tbody>
      </table>
    )
  }
});

var Steps = React.createClass({
  render: function() {
    var routeData = this.props.routeData;
    var ferryInputString = $('#departure-date').val() + ' ' + $('#departure-time').val(); // this will change when the time picker is replaced w/ a list of ferries
    var ferryDateTime = moment(ferryInputString, 'M/D/YYYY h:mm a').toDate();

    var renderedSteps = _.map(routeData, function(step, i, steps) {
      var isLast = (i === (steps.length -1));
      var transferDepartureTime = isLast ? ferryDateTime : steps[i + 1].get(transit.keyword('departure'));

      return (
        <div>
          <Transit
            departureTime={step.get(transit.keyword('departure'))}
            origin={step.get(transit.keyword('origin'))}
            destination={step.get(transit.keyword('destination'))}
            route={step.get(transit.keyword('route'))}
            peak={step.get(transit.keyword('peak'))}
            duration={createDurationString(step.get(transit.keyword('departure')), step.get(transit.keyword('arrival')))} />

          <Transfer
            arrivalTime={step.get(transit.keyword('arrival'))}
            location={step.get(transit.keyword('destination'))}
            connection={isLast ? 'Sayville Ferry' : 'train to ' + steps[i + 1].get(transit.keyword('destination'))}
            transferType={isLast ? 'ferry-transfer' : 'train-transfer'}
            duration={createDurationString(step.get(transit.keyword('arrival')), transferDepartureTime)} />
        </div>
      );
    });

    return (
      <div id="steps">
        <div className="step"><strong></strong> <p>Start at Penn Station.</p></div>
        {renderedSteps}
        <div className="step"><strong>{moment(ferryDateTime).format('h:mm a')}</strong> <p>Take the Sayville Ferry to the Fire Island Pines. <small>20 min</small></p></div>
        <div className="step last"><strong>{moment(ferryDateTime).add(7, 'm').format('h:mm a')}</strong> <p>Arrive in the Pines!</p></div>
      </div>
    );
  }
});

var Transit = React.createClass({
  render: function() {
    var peak = '';
    if (this.props.origin === 'Penn Station') {
      peak = (
        <small>You&rsquo;ll need to buy {(this.props.peak) ? 'a peak' : 'an off-peak'} ticket.</small>
      );
    }
    return (
      <div className="step transit">
        <strong>{moment(this.props.departureTime).format('h:mm a')}</strong>
        <p>Take the {this.props.route} line train to {this.props.destination}. <small>{this.props.duration}</small><br />
          {peak}
          <StepDetails whichStep={this.props.origin} />
        </p>
      </div>
    );
  }
});

var Transfer = React.createClass({
  render: function() {
    return (
      <div className="step transfer">
        <strong>{moment(this.props.arrivalTime).format('h:mm a')}</strong>
        <p>Get off at {this.props.location} to transfer to the {this.props.connection}.<br />
          <small>{this.props.duration} to make connection</small>
          <StepDetails whichStep={this.props.transferType} />
        </p>
      </div>
    );
  }
});

var StepDetails = React.createClass({
  render: function() {
    var id = this.props.whichStep.replace(' ', '-').toLowerCase();
    var details = '';

    switch(this.props.whichStep) {
      case 'Penn Station':
        details = (
          'stuff for penn station'
        );
        break;
      case 'train-transfer':
        details = 'stuff about transferring trains'
        break;
      case 'ferry-transfer':
        details = 'stuff about getting to the ferry'
        break;
    }

    if (details.length > 0) {
      return (
        <span className="details">
          <a className="btn btn-link btn-xs collapsed" href={"#" + id}  data-toggle="collapse" aria-expanded="false" aria-controls={id}>
            <span className="more">More info</span>
            <span className="less">Less info</span>
          </a>
          <span className="collapse" id={id}>
            {details}
          </span>
        </span>
      )
    } else {
      return (
        <span></span>
      )
    }
  }

});

var Extra = React.createClass({
  render: function() {
    return (
      <section id="sharegurl">
         <h2>Have fun!</h2>
         <p>And don&rsquo;t forget - whether you&rsquo;re a Fire Island virgin or veteran, more friends on the island means more fun for you. <a href="http://sharegurl.com">ShareGurl</a> is the only place where you can find out when your friends are going to Fire Island and share your plans too. Come play with us this summer!</p>
         <p><center><a href="https://itunes.apple.com/us/app/sharegurl-fire-island-friends/id646752256?mt=8"><img src="images/appstore.png" alt="Download on the App Store" /></a></center></p>
      </section>
    )
  }
})

var Footer = React.createClass({
  render: function() {
    return (
      <footer>
        This site brought to you with love by <a href="http://twitter.com/zaneshelby">Zane Shelby</a> &amp; <a href="http://twitter.com/oldwestaction">Anh-Thu Huynh</a> for <a href="http://sharegurl.com" className="home">ShareGurl</a>
      </footer>
    )
  }
});

React.render(
  <App />,
  document.getElementById('app-container')
);
