## How to set up a server

1. Start with the example server. Download all three files, server.js, package.json and config.json. Edit your config.json to configure it as you like. Or you can accept the defaults in the definition of the config object in the chat server. Or set some and leave others. The config.json I've included configures many but not all of the values. 

2. Decide which port you want to run the HTTP server on and the WebSockets server, and change the values in config.json accordingly. I've put good example values in config.json.

3. Go to <a href="https://apps.twitter.com/">apps.twitter.com</a> and create a new app for your server, and paste the oauth values into config.json. The callback url should be `http://yourserver.com:1402/callbackfromtwitter`

4. `npm install`

5. `node server.js`

