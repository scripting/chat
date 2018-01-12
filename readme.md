## What is json.chat?

A simple extensible JavaScript chat network. 

### All the pieces

It can be confusing because there are a few pieces to this product.

1. The server, a Node.js app. 

2. The NPM package called davechat, which makes it possible to easily include a chat server in other apps.

3. The client, a browser-based JavaScript app.

The client is served when you go to the server's home page. The source code for the client is <a href="https://github.com/scripting/chat/blob/master/client/template.html">here</a>. You can replace it by specifying a different source in the config.json file on the server. Look for names encased in [%this%] syntax, and place them in your client, and then you'll know how to communicate with the server that launched you.

I have a demo server running at <a href="http://json.chat/">json.chat</a>. 

The name of the project, in total, in all its pieces, is called json.chat. 

### The story of json.chat

I've written a number of JavaScript chat apps. But I never wrote one as a building block for chat apps. That was totally and easily extensible. That was designed as a JavaScript app, both on the client and server. That does all its communicating in JSON. Is totally hackable. All the components can be replaced. And while it is rooted in JavaScript, there's absolutely no reason  all the components can't be rewritten in different languages and runtimes.

### Protocols

There are two built-in interfaces, HTTP and WebSockets. The client sends messages to the server via HTTP. And the server calls back to the client via WebSockets.

### Chatlog

Each document managed by a server is called a chatlog. Because its primary application is chat, but it feels a lot like a weblog. 

### How the code is organized

There are three top level folders --

#### client

There are two levels to the code, <a href="https://github.com/scripting/chat/blob/master/client/chatapp.js">chatapp</a> and <a href="https://github.com/scripting/chat/blob/master/client/shell.js">shell</a>.  chatapp is the core code, and shell is the code that makes it work in a single-page, browser-based web app. I split it into two levels so that there could be common code between this implementation and an Electron implementation. I've been down this road with other software, and having this split was necessary.

template.html is what is served through the home page of your server. On its way out, we do substitutions for several values in [%brackets%]. Among other things, these values tell the app how to call back to the server that launched it. This makes it unnecessary for the user to have to configure the app to talk to a different server. That complexity is factored out. 

Includable versions of these files can be found in http://scripting.com/chat/, but you should probably download the files and serve them from your domain in deployed apps.

#### package

The server-side is also split into two levels. The package is what goes into the NPM system under the name davechat. I tend to give all my packages names that begin with <i>dave</i> because they are not taken. Otherwise at this late date it can be hard to come up with unique names. 

I wanted the core server code to be in a package so that chat functionality could easily be added to any Node app. I'm tired of reinventing this functionality. I figured let's do it well, once, the usual idea behind factoring.

#### server

This folder contains a functional chat server. You should start with this folder to deploy your server. It should run as-is, but if you want to customize, you can edit  config.json, or server.js. 

### Dependencies



### Docs

1. json.chat howto for users.

2. How to set up a server.

3. How to test a server.

### What's next

These are my immediate next steps for this project -- 

1. Get a few other people to run servers, to shake out any problems in setting up a new instance. To generate feature requests for federation.

2. Create apps that hook into the server, to drive the development of an API.

3. RSS feeds.

4. Make it super easy to start new chatlogs on each server. It should be no harder than creating a new site on a blog hosting service.

5. A <i>sysop</i> menu (not sure what to call it) that only appears on the owner's machine. 

### Known problems

1. When I log on from my Twittergram account on my iPad, I get redirected to twitter.com. Doesn't happen when I log on via other accounts, or when I log on with that account in Safari on my Mac. 

2. When editing a post, click to select a word. Click on the link icon. The buttons disappear. The click is being caught in the wrong place. 

