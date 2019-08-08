* 5/11/19; 11:39:00 AM by DW
   * Working on viewing stories. 
   * Next up after that, send stats from the server to the client using websockets. Gives the server control over how much traffic is allocated to stats. Might want to optimize it. 
* 5/10/19; 11:05:19 AM by DW
   * Next session
      * come up with a story template, and render the JSON through that template.
   * Done
      * Every item now has a permalink attribute which points to the story JSON file for the item. Now the UI has the info it needs to show this to the reader. 
* 5/9/19; 4:35:59 PM by DW
   * Each message gets stored in a static file on the server, and there's a permalink in the display of the message to that file.
      * When a message is deleted the archive file is deleted too. So it isn't a way to spam the server. 
      * Three places it's implemented..
         * updateChatlogItem
         * deleteChatlogItem
         * postToChatlog
      * Where to pick up -- deleting the file is coded but isn't working.
