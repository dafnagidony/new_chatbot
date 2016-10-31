var handlers = require('../handlers');

module.exports = [ 
  {
    method: 'GET',
    path: '/webhook',
    handler: handlers.getWebhook
  },
  {
    method: 'POST',
    path: '/webhook',
    handler: handlers.postWebhook
  },
  {
    method: 'GET',
    path: '/authorize',
    handler: handlers.authorize
  },
   {
    method: 'POST',
    path: '/outbrain_login',
    handler: handlers.loginOutbrainAccount
  },
  {
    method: 'GET',
    path: '/start',
    handler: handlers.start
  }

 ];
