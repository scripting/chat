* 5/9/19; 4:35:59 PM by DW
   * Each message gets stored in a static file on the server, and there's a permalink in the display of the message to that file.
      * When a message is deleted the archive file is deleted too. So it isn't a way to spam the server. 
      * Three places it's implemented..
         * updateChatlogItem
         * deleteChatlogItem
         * postToChatlog
      * Where to pick up -- deleting the file is coded but isn't working.
