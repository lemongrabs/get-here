# ShareGurl: Getting to Fire Island
A little something we made for our friends at [ShareGurl](http://sharegurl.com).

## Development

### Environment Variables

You're going to need to set a `GOOGLE_API_KEY` for a project for which the "Directions API" is enabled. For more information, refer to the [official documentation](https://developers.google.com/maps/documentation/directions/#api_key).

### Running

1. Install [Leiningen](http://leiningen.org/)
2. Install [Babel]()
2. `lein run <PORT>`

### Compiling assets

#### Watching

1. `babel resources/static/js/components.jsx --watch --out-file resources/static/js/components-compiled.js` to watch jsx file
2. `lein watch` to watch scss/js

#### Building

1. `babel resources/static/js/components.jsx --out-file resources/static/js/components-compiled.js` to compile jsx once
2. `lein build` to compile/concat/minify

![Alt text](http://media.giphy.com/media/C06mU13FQHHhK/giphy.gif "adore delano says")
