// original markup: https://github.com/lemongrabs/get-here/blob/master/resources/static/index.html

var App = React.createClass({
  getInitialState: function() {
    return {
      returnedRoute: false,
      requestFailed: false,
      parsedData: null
    };
  },

  returnedRoute: function(parsedData) {
    this.setState({
      returnedRoute: true,
      parsedData: parsedData
    });
  },

  requestErrored: function() {
    this.setState({
      returnedRoute: false,
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
          <Route
            parsedData={this.state.parsedData} />
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
        <p>The trip is famously challenging, but we’ll get through it together. Remember the two most important rules:
          <ul>
            <li>If people look gay, you should probably follow them.</li>
            <li>It might seem like everyone knows what they&rsquo;re doing, but everyone had to learn at some point. Don’t be afraid to ask.</li>
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
    // instantiate date picker, set up date validation (is that necessary anymore?)
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
               moment(dateTimeInputString, 'M/D/YYYY h:mm:ss a').toDate()]);

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
    window.parsedData = parsedData; // can take this out after debugging?
    this.setState({waiting: false});
    this.props.onRouteReturn(parsedData);
  },

  render: function() {
    var defaultDate = moment().format('M/D/YYYY');
    var defaultTime = moment().format('h:mm:ss a');
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

var Route = React.createClass({
  render: function() {

    console.log(this.props.parsedData.get(transit.keyword('route'))[0].get(transit.keyword('origin')));

    // some sample copy below. each step in the <ol> also has a 'more information' panel that needs to be added

    return (
      <section id="itinerary-directions">
        <h2>Your itinerary &amp; directions</h2>

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
              <td>7:49 am</td>
              <td>9:50 am</td>
              <td>2h 1m</td>
              <td>???</td>
            </tr>
          </tbody>
        </table>

        <ol>
          <li><p>Start at Penn Station.</p></li>
          <li><p>DEPARTURE[0]: Take the ROUTE[0]-bound train to DESTINATION[0]. (You&rsquo;ll need to buy a PEAK/OFFPEAK ticket.)</p></li>
          <li><p>ARRIVAL[0]: Get off at ORIGIN[1] (DEPARTURE[1]-ARRIVAL[0] mins to make connection).</p></li>
          <li><p>DEPARTURE[1]: Transfer to the train to DESTINATION (on the ROUTE-bound line).</p></li>
          <li><p>ARRIVAL[1]: Arrive at Sayville (FERRYTIME-ARRIVAL[1] mins to make connection to the ferry).</p></li>
          <li><p>FINAL ARRIVAL TIME: Arrive in the Pines!</p></li>
        </ol>

        <div id="shuttle">
          <p>Don&rsquo;t feel like taking the train, or think this is seeming a little too complicated? As an alternative, you can hop on the new <strong>ShareGurl Shuttle</strong> and get a ride from Manhattan directly to the ferry! <a href="http://new.sharegurl.com/stores/sharegurl-shuttle/about">More info &raquo;</a></p>
        </div>
      </section>
    )
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