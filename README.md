# ShareGurl: Getting to Fire Island
A little something we made for our friends at [ShareGurl](http://sharegurl.com).

## Development

### Environment Variables

You're going to need to set a `GOOGLE_API_KEY` for a project for which the "Directions API" is enabled. For more information, refer to the [official documentation](https://developers.google.com/maps/documentation/directions/#api_key).

### Running

1. Install [Leiningen](http://leiningen.org/)
2. `lein run <PORT>`

### Compiling assets

1. `lein compile` compiles /resources/static/scss files into /resources/static/css
2. `lein minify-assets` concatenates + minifies

![Alt text](http://media.giphy.com/media/C06mU13FQHHhK/giphy.gif "adore delano says")
