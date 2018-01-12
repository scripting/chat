## How to set up a server

1. Start with the example <a href="https://github.com/scripting/chat/tree/master/server">server</a>. Download all files, server.js, package.json and config.json. 

2. Go to <a href="https://apps.twitter.com/">apps.twitter.com</a> and create a new app for your server, and paste the oauth values into config.json in place of the dummy values (they are random strings and don't wor). The callback url should be `http://yourserver.com:1402/callbackfromtwitter`

3. Decide which port you want to run the HTTP server on and the WebSockets server, and change the values in config.json accordingly.

4. Edit other values in config.json if you want to change the name of your server, or run it remotely, or change the prompts that users see.

4. `npm install`

5. `node server.js`

### Notes

The first time you run it you may see error messages saying that certain files don't exist. This is fine, it creates the files it needs that don't exist. 

