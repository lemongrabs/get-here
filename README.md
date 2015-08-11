# ShareGurl: Getting to Fire Island
A little something we made for our friends at [ShareGurl](http://sharegurl.com).

## Development

### Environment Variables

You're going to need to set a `GOOGLE_API_KEY` for a project for which the "Directions API" is enabled. For more information, refer to the [official documentation](https://developers.google.com/maps/documentation/directions/#api_key).

If you want to see how the app will run in production you should set `ENVIRONMENT` to `"production"`.

### Running

1. Install [Leiningen](http://leiningen.org/)
2. `lein run <PORT>`

### Compiling assets

If the `ENVIRONMENT` environment variable is set to `"production"` assets will be automatically optimized (concatenated, minified, etc).

Automatic recompilation of assets is currently not working due to [a bug in Optimus](https://github.com/magnars/optimus/issues/42), so you'll have to restart `lein` every time. Sorry about that.

![Alt text](http://media.giphy.com/media/C06mU13FQHHhK/giphy.gif "adore delano says")
