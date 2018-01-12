## What is json.chat?

A simple extensible JavaScript chat network. 

### All the pieces

It can be confusing because there are a few pieces to this project.

1. The server, a Node.js app. 

2. The NPM package called davechat, which makes it possible to easily include a chat server in other apps.

3. The client, a browser-based JavaScript app.

The client is served when you go to the server's home page. The source code for the client is <a href="https://github.com/scripting/chat/blob/master/client/template.html">here</a>. You can replace it by specifying a different source in the config.json file on the server. 

I have a demo server running at <a href="http://json.chat/">json.chat</a>. 

The name of the project, total, in all its pieces, is called json.chat. 

### The pointers you need

1. How to <a href="https://github.com/scripting/chat/blob/master/docs/setup.md">set up</a> a server.

2. How to <a href="https://github.com/scripting/chat/blob/master/docs/testing.md">test</a> a server.

3. <a href="http://this.how/jsonchat/">Howto</a> for users.

4. Where to <a href="https://github.com/scripting/chat/issues/new">report</a> a problem.

### The story of json.chat

I've written a number of JavaScript chat apps. But I never wrote one as a building block to include in other apps, or even networks of apps. One that is totally and easily extensible. That was designed as a JavaScript app, both on the client and server. That does all its communicating in JSON. Is totally hackable. All the components can be replaced. And while it is rooted in JavaScript, there's absolutely no reason  all the components can't be rewritten in different languages and runtimes.

I see this project as potentially like <a href="http://xmlrpc.scripting.com/">XML-RPC</a> in 1998, but with a user interface. A way of communicating that works at a developer level, but also has a user interface.

### Protocols

There are two built-in interfaces, HTTP and WebSockets. The client sends messages to the server via HTTP. And the server calls back to the client via WebSockets.

### Why "chatlog"

Each document managed by a server is called a chatlog, because its primary application is chat, but it feels a lot like a weblog. 

### How the code is organized

There are three top level folders --

#### client

The app that people use to chat.

There are two levels to the code, <a href="https://github.com/scripting/chat/blob/master/client/chatapp.js">chatapp</a> and <a href="https://github.com/scripting/chat/blob/master/client/shell.js">shell</a>.  chatapp is the core code, and shell is the code that makes it work in a single-page, browser-based web app. I split it into two levels so that there could be common code between this implementation and an Electron implementation. I've been down this road with other software, and having this split saves replicated code, and makes it all easier to maintain.

<a href="https://github.com/scripting/chat/blob/master/client/template.html">template.html</a> is what is served through the home page of your server. On its way out, we replace several values in this [%syntax%]. Among other things, these values tell the app how to call back to the server that launched it. This makes it unnecessary for the user to have to configure the app to talk to a different server. You just give them the URL of your server and they go there. Easier for everyone.

Includable versions of these files can be found in http://scripting.com/chat/, but you should probably download the files and serve them from your domain in deployed apps.

#### package

The server-side is also split into two levels. The package is what goes into the NPM system under the name <a href="https://www.npmjs.com/package/davechat">davechat</a>. I tend to give all my packages names that begin with <i>dave</i> because they are not taken. Otherwise at this late date it can be hard to come up with unique names. 

I wanted the core server code to be in a package so that chat functionality could easily be added to any Node app. I'm tired of reinventing this functionality. I figured let's do it well, once, the usual idea behind factoring.

#### server

This <a href="https://github.com/scripting/chat/tree/master/server">folder</a> contains a functional chat server. You should start with this folder to <a href="https://github.com/scripting/chat/blob/master/docs/setup.md">set up</a> your server. 

### Dependencies

1. <a href="https://www.npmjs.com/package/daveutils">daveutils</a> -- basic utilities.

2. <a href="https://www.npmjs.com/package/davehttp">davehttp</a> -- a high level interface for an HTTP server.

3. <a href="https://www.npmjs.com/package/davecache">davecache</a> -- caching, not used at this time.

4. <a href="https://www.npmjs.com/package/davetwitter">davetwitter</a> -- interface to Twitter functionality, builds on davehttp.

5. <a href="https://www.npmjs.com/package/davefilesystem">davefilesystem</a> -- higher level file system functions. 

6. <a href="https://www.npmjs.com/package/nodejs-websocket">nodejs-websocket</a> -- websockets server.

7. <a href="https://www.npmjs.com/package/request">request</a> -- making HTTP requests.

### What's next

These are my immediate next steps for this project -- 

1. Get a few other people to run servers, to shake out any problems in setting up a new instance. To generate feature requests for federation.

2. Create apps that hook into the server, to drive the development of an API.

3. Testing and fixes for client use on phones and tablets. So far only tested in Chrome/Mac.

4. RSS feeds.

5. Make it super easy to start new chatlogs on each server. It should be no harder than creating a new site on a blog hosting service.

6. A <i>sysop</i> menu (not sure what to call it) that only appears on the owner's machine. 

At some point soon I will be taking a break to catch my breath and regain perspective. This was a pretty intense sprint. ;-)

### Known problems

1. When I log on from my Twittergram account on my iPad, I get redirected to twitter.com. Doesn't happen when I log on via other accounts, or when I log on with that account in Safari on my Mac. 

2. When editing a post, click to select a word. Click on the link icon. The buttons disappear. The click is being caught in the wrong place. 

