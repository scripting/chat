## davechat package

This package is part of the json.chat <a href="https://github.com/scripting/chat/blob/master/readme.md">project</a>.

### 6/14/20 by DW

Allow config.email.sendTo to be a comma-separated list. So you could say this: 

"sendTo": "juan@test.com, alice@test.com"

### 4/19/19 by DW

Breakage alert. In chat.start, I used to form the twitter myDomain value as the config.myDomain + ":" + config.port.

It really should just copy config.myDomain without any changes, so that's what it does now. This is something to watch for in software that uses davechat. At this point I think I'm the only one. ;-)

